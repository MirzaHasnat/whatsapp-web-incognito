// 
// Noise & Signal protocol handling
//

var MultiDevice = {};

// Safety checks for global libraries
var getPbf = function() {
    // Fast path: already resolved and cached
    if (window.Pbf && typeof window.Pbf === 'function') return window.Pbf;

    var candidate = null;

    // 1. Direct window/global lookups
    if (typeof Pbf !== 'undefined' && typeof Pbf === 'function') candidate = Pbf;
    else if (typeof globalThis !== 'undefined' && globalThis.Pbf) candidate = globalThis.Pbf;
    else if (typeof self !== 'undefined' && self.Pbf) candidate = self.Pbf;

    // 2. UMD Node.js path: WhatsApp's page defines window.module so the pbf UMD
    //    runs the Node branch which does:  module.exports = PbfConstructor
    //    That means window.module.exports IS the constructor directly — NOT nested under .Pbf
    if (!candidate && window.module && window.module.exports) {
        var exp = window.module.exports;
        if (typeof exp === 'function') {
            candidate = exp;                         // module.exports = Pbf directly
        } else if (exp && typeof exp.Pbf === 'function') {
            candidate = exp.Pbf;                     // module.exports = { Pbf: ... }
        }
    }

    // 3. window.exports fallback
    if (!candidate && window.exports) {
        var exp = window.exports;
        if (typeof exp === 'function') candidate = exp;
        else if (exp && typeof exp.Pbf === 'function') candidate = exp.Pbf;
    }

    if (!candidate) return null;

    // Unwrap wrapper objects (.Pbf, .default, lone function)
    if (typeof candidate === 'function') {
        window.Pbf = candidate; // cache for future calls
        return candidate;
    }
    if (candidate.Pbf && typeof candidate.Pbf === 'function') {
        window.Pbf = candidate.Pbf;
        return candidate.Pbf;
    }
    if (candidate.default && typeof candidate.default === 'function') {
        window.Pbf = candidate.default;
        return candidate.default;
    }
    // Last resort: only function exported
    var keys = Object.keys(candidate);
    var functions = [];
    for (var i = 0; i < keys.length; i++) {
        if (typeof candidate[keys[i]] === 'function') {
            if (keys[i] === 'Pbf') { window.Pbf = candidate[keys[i]]; return candidate[keys[i]]; }
            functions.push(candidate[keys[i]]);
        }
    }
    if (functions.length === 1) { window.Pbf = functions[0]; return functions[0]; }

    return null;
};
var getPako = function() { return window.pako || (typeof pako !== 'undefined' ? pako : null) || (typeof globalThis !== 'undefined' ? globalThis.pako : null) || (typeof self !== 'undefined' ? self.pako : null); };
var getLibsignal = function() { return window.libsignal || (typeof libsignal !== 'undefined' ? libsignal : null) || (typeof globalThis !== 'undefined' ? globalThis.libsignal : null) || (typeof self !== 'undefined' ? self.libsignal : null); };


var originalImportKey = crypto.subtle.importKey;

MultiDevice.initialize = function()
{
    MultiDevice.readKey = null;
    MultiDevice.readKeyImported = null;
    MultiDevice.writeKey = null;
    MultiDevice.writeKeyImported = null;
    MultiDevice.readCounter = 0;
    MultiDevice.writeCounter = 0;
    MultiDevice.incomingQueue = new PromiseQueue();
    MultiDevice.outgoingQueue = new PromiseQueue();

    // install our hook in order to discover the Noise keys
    // ("WACryptoDependencies").getCrypto().subtle.importKey
    window.crypto.subtle.importKey = async function(format, keyData, algorithm, extractable, keyUsages)
    {
        if (format == "raw" && algorithm == "AES-GCM" && keyData.length == 32 && extractable == false && keyUsages.length == 1)
        {
            var key = await originalImportKey.apply(window.crypto.subtle, ["raw", new Uint8Array(keyData), algorithm, false, ["decrypt", "encrypt"]]);

            if (keyUsages.includes("encrypt"))
            {
                MultiDevice.writeKey = keyData;
                MultiDevice.writeCounter = 0;
                MultiDevice.writeKeyImported = key;
                console.log("WAIncognito: Noise encryption key has been replaced.");
            }
            else if (keyUsages.includes("decrypt"))
            {
                MultiDevice.readKey = keyData;
                MultiDevice.readKeyImported = key;
                MultiDevice.readCounter = 0;
                console.log("WAIncognito: Noise decryption key has been replaced.");
            }
        }

        return originalImportKey.call(window.crypto.subtle, format, keyData, algorithm, extractable, keyUsages);
    };
};

MultiDevice.decryptNoisePacket = async function(payload, isIncoming = true)
{
    // relevant functions: WANoiseSocket.sendFrmae, onFrame
    var looksLikeHandshakePacket = MultiDevice.looksLikeHandshakePacket(payload);
    
    await MultiDevice.waitForNoiseKeyIfNeeded(looksLikeHandshakePacket);
    if (looksLikeHandshakePacket || MultiDevice.readKey == null) return null;

    // split to frames
    // WAFrameSocket.convertBufferedToFrames
    var binaryReader = new BinaryReader();
    binaryReader.writeBuffer(payload);
    binaryReader._readIndex = 0;

    var frames = [];
    while (binaryReader._readIndex + 3 < payload.byteLength)
    {
        var counter = isIncoming ? MultiDevice.readCounter++ : MultiDevice.writeCounter++;
        var size = binaryReader.readUint8() << 16 | binaryReader.readUint16();
        var frame = binaryReader.readBuffer(size);
        var frameInfo = {frame: frame, counter: counter};

        frames.push(frameInfo);
    }

    try
    {
        for (var i = 0; i < frames.length; i++)
        {
            var frameInfo = frames[i];
            
            var currentFrame = frameInfo.frame;
            var counter = frameInfo.counter;
            
            var key = isIncoming ? MultiDevice.readKeyImported : MultiDevice.writeKeyImported;
            var algorithmInfo = {name: "AES-GCM", iv: MultiDevice.counterToIV(counter), additionalData: new ArrayBuffer(0)};
    
            var decryptedFrame = await window.crypto.subtle.decrypt(algorithmInfo, key, currentFrame);
            var flags = new Uint8Array(decryptedFrame)[0];
            var decryptedFrameOpened = decryptedFrame.slice(1);
            if (flags & 2)
            {
                // zlib compressed. decompress
                var pakoInstance = getPako();
                if (pakoInstance)
                {
                    decryptedFrameOpened = toArrayBuffer(pakoInstance.inflate(new Uint8Array(decryptedFrameOpened)));
                }
                else
                {
                    console.error("WAIncognito: pako library is not loaded, cannot decompress frame.");
                }
            }
    
            frames[i] = {frame: decryptedFrameOpened, counter: counter, frameUncompressed: decryptedFrame};  
        }
    }
    catch (exception)
    {
        if (exception.name.includes("OperationError"))
        {
            // reverse the counter, in case this is another socket
            if (isIncoming) MultiDevice.readCounter--;
            else MultiDevice.writeCounter--;

            var counter = isIncoming ? MultiDevice.readCounter : MultiDevice.writeCounter;

            throw ("Couldn't decrypt Noise packet: wrong counter (" + counter + ") in decryption, isIncoming: " + isIncoming);
        }
            else
            {
                console.error("Could not decrypt Noise packet");
                console.error(exception);
                throw exception;
            }
    }

    return frames;
};

MultiDevice.encryptAndPackNodesForSending = async function(nodesInfo, isIncoming = false)
{
    // convert to binary protocol
    var packetBinaryWriter = new BinaryWriter();
    for (var i = 0; i < nodesInfo.length; i++)
    {
        var nodeInfo = nodesInfo[i];
        var node = nodeInfo.node;
        var counter = nodeInfo.counter;
        var decryptedFrame = nodeInfo.decryptedFrame;

        var nodeBuffer = await nodeReaderWriter.encodeStanza(node);

        // encrypt it
        var data = await MultiDevice.encryptPacket(nodeBuffer, isIncoming, counter);

        // Serialize to Noise protocol
        var binaryStream = new BinaryReader();
        
        var size = data.byteLength;
        binaryStream.writeUint8(size >> 16);
        binaryStream.writeUint16(65535 & size);
        binaryStream.write(data);

        binaryStream._readIndex = 0;
        var serializedPacket =  binaryStream.readBuffer();

        packetBinaryWriter.pushBytes(serializedPacket);
    }

    return packetBinaryWriter.toBuffer();
}

MultiDevice.encryptPacket = async function(payload, isIncoming = true, counter = 0)
{    
    var keyData = isIncoming ? MultiDevice.readKey : MultiDevice.writeKey;
    var key = isIncoming ? MultiDevice.readKeyImported : MultiDevice.writeKeyImported;

    var algorithmInfo = {name: "AES-GCM", iv: MultiDevice.counterToIV(counter), additionalData: new ArrayBuffer(0)};
    return window.crypto.subtle.encrypt(algorithmInfo, key, payload)
    .catch(function(e) {
        console.error(e);
        //debugger;
    });
    
};

MultiDevice.sizeOfPacket = function(payload)
{
    var binaryReader = new BinaryReader();
    binaryReader.writeBuffer(payload);
    binaryReader._readIndex = 0;

    var size = binaryReader.readUint8() << 16 | binaryReader.readUint16();
    return size;
};


MultiDevice.decryptE2EMessagesFromMessageNode = async function(messageNode)
{
    var remoteJid = messageNode.attrs["jid"] ? messageNode.attrs["jid"] : messageNode.attrs["from"];
    var participant = messageNode.attrs["participant"];
    var participantLid = messageNode.attrs["participant_lid"];

    var fromJid = participant ? participant : remoteJid;
    fromJid = fromJid.toString();

    var decryptedMessages = [];
    var keyDistributionMessage = null;

    // get the storage
    if (!window.WhatsAppAPI) exposeWhatsAppAPI();

    var storageModule = window.WhatsAppAPI.SignalStore;
    storage = storageModule.getSignalProtocolStore();
    if (storage == undefined) 
    {
        storageModule.enableMemSignalStore();
        storage = storageModule.getSignalProtocolStore();
    }

    var childMessages = messageNode.content;
    for (var message of childMessages)
    {
        if (message.tag != "enc") continue;

        var ciphertext = message.content;
        var chiphertextType = message.attrs["type"];

        // decrypt the message
        var address = fromJid;
        var message = null;

        try
        {
            // d.getSignalProtocolStore)().loadSession(t);
            // t.decryptContent
            // decryptSignalProto
            switch (chiphertextType)
            {
                case "pkmsg":
                    // Pre-Key message
                    message = await MultiDevice.signalDecryptPrekeyWhisperMessage(ciphertext, storage, address);
                    break;
                case "msg":
                    // Regular message
                    message = await MultiDevice.signalDecryptWhisperMessage(ciphertext, storage, address);
                    break;
                case "skmsg":
                    // Sender Key message, aka group message
                    message = await MultiDevice.signalDecryptSenderKeyMessage(ciphertext, storage, remoteJid, address, keyDistributionMessage);
                    break;
            }
        }
        catch (e)
        {
            console.warn("WhatsIncognito: Skipping decryption of " + chiphertextType + " from " + address + " due to exception.");
            console.warn(e);
            if (e.name) console.warn(e.name);
            continue;
        }
        
        // unpad the message
        if (message == null) continue; 
        message = new Uint8Array(message);
        message = new Uint8Array(message.buffer, message.byteOffset, message.length - message[message.length - 1]);
    
        var pbfInstance = getPbf();
        if (!pbfInstance) {
            console.error("WAIncognito: Pbf library is not loaded, cannot read Protobuf message.");
            continue; 
        }
        var decryptedMessage = Message.read(new pbfInstance(message));
        decryptedMessages.push(decryptedMessage);

        if (decryptedMessage.senderKeyDistributionMessage)
        {
            var keyDistributionMessage = decryptedMessage.senderKeyDistributionMessage.axolotlSenderKeyDistributionMessage;
            keyDistributionMessage = MultiDevice.signalGetKeyDistributionMessage(keyDistributionMessage);
        }
    }

    return decryptedMessages;
}

//
// Signal related code
//

MultiDevice.signalDecryptWhisperMessage = async function(whisperMessageBuffer, storage, address)
{
    var widAddress = WhatsAppAPI.WAWebWidFactory.createDeviceWidOrThrow(address);
    var lidAddress = WhatsAppAPI.WAWebSignalCommonUtils.createSignalAddress(widAddress, false);
    var sessionObject = await storage.loadSession(lidAddress);
    if (sessionObject == null)
    {
        console.error("Can't get session for " + address.toString());
        debugger;
    }

    var pbfInstance = getPbf();
    if (!pbfInstance) {
        console.error("WAIncognito: Pbf library is not loaded, cannot decrypt WhisperMessage.");
        return null; // or throw
    }
    var version = (new Uint8Array(whisperMessageBuffer))[0];
    var messageProto = whisperMessageBuffer.slice(1, whisperMessageBuffer.byteLength - 8);
    var whisperMessage = WhisperMessage.read(new pbfInstance(messageProto));

    var chainKey = null; var chainCounter = -1; var messageKeys = {};

    var recvChains = sessionObject.recvChains;
    var chainIndex = recvChains.findIndex((e => isEqualArray(e.ratchetPubKey,whisperMessage.ephemeralKey)))
    if (chainIndex != -1)
    {
        var currentChain = recvChains[chainIndex];
        chainKey = currentChain.chainKey;
        chainCounter = currentChain.nextMsgIndex;
        messageKeys = currentChain.unusedMsgKeys;
    }
    else
    {
        // calculate new chain, see decryptMsgFromSession -> calculateRatchet, makeFreshRecvChain
        var chainKeyData = await MultiDevice.calculateNewChainKey(sessionObject.rootKey, whisperMessage.ephemeralKey, 
                                                                sessionObject.sendChain.ratchetKey.privateKey);
        chainKey = chainKeyData.key;
        chainCounter = chainKeyData.counter;
    }

    var libsignalInstance = getLibsignal();
    var messageKey = await MultiDevice.signalGetMessageKey(chainKey, chainCounter, whisperMessage.counter, messageKeys);
    var keys = await libsignalInstance.HKDF.deriveSecrets(messageKey, new ArrayBuffer(32), "WhisperMessageKeys");

    try
    {
        var plaintext = await libsignalInstance.crypto.decrypt(keys[0], toArrayBuffer(whisperMessage.ciphertext), keys[2].slice(0, 16));
        return plaintext;
    }
    catch (exception)
    {
        console.error("E2E plaintext decryption failed.")
        debugger;
        throw exception;
    }
    
}

// decryptPkMsg
MultiDevice.signalDecryptPrekeyWhisperMessage = async function(prekeyWhisperMessageBuffer, storage, address)
{
    var widAddress = WhatsAppAPI.WAWebWidFactory.createDeviceWidOrThrow(address);
    var lidAddress = WhatsAppAPI.WAWebSignalCommonUtils.createSignalAddress(widAddress, false);
    var sessionObject = await storage.loadSession(lidAddress);

    var pbfInstance = getPbf();
    if (!pbfInstance) {
        console.error("WAIncognito: Pbf library is not loaded!");
        throw new Error("Pbf library missing");
    }

    var version = (new Uint8Array(prekeyWhisperMessageBuffer))[0];
    var messageProto = prekeyWhisperMessageBuffer.slice(1, prekeyWhisperMessageBuffer.byteLength);
    var prekeyMessage = PreKeyWhisperMessage.read(new pbfInstance(messageProto));

    var ourIdentityKey = await storage.getIdentityKeyPair();
    var ourEphemeralKey = await storage.loadPreKey(prekeyMessage.preKeyId); // preKeyPair
    var ourSignedKey = await storage.loadSignedPreKey(prekeyMessage.signedPreKeyId);

    version = (new Uint8Array(prekeyMessage.message))[0];
    messageProto = prekeyMessage.message.slice(1, prekeyMessage.message.byteLength - 8);
    var pbfInstance = getPbf();
    var whisperMessage = WhisperMessage.read(new pbfInstance(messageProto));

    var chainKeyData = null;
    var isNewSession = false;
    var messageKeys = {};

    // decryptMsgFromSession
    if (sessionObject)
    {
        // version 2
        var recvChains = sessionObject.recvChains;
        var chainIndex = recvChains.findIndex((e => isEqualArray(e.ratchetPubKey, whisperMessage.ephemeralKey)))
        if (chainIndex != -1)
        {
            var currentChain = recvChains[chainIndex];
            chainKeyData = {key: currentChain.chainKey, counter: currentChain.nextMsgIndex};
            messageKeys = currentChain.unusedMsgKeys;
        }
    }
    else
    {
        // new session, see decryptPkMsgWithNewSession, // initiateSessionIncoming
        isNewSession = true;
        var sharedSecret = (ourEphemeralKey === undefined || prekeyMessage.baseKey === undefined) ? 
                            sharedSecret = new Uint8Array(32 * 4) : new Uint8Array(32 * 5);
        for (var i = 0; i < 32; i++) {
            sharedSecret[i] = 0xff;
        }
    
        var ecRes = new Array();
        ecRes[0] = await getLibsignal().Curve.async.calculateAgreement(prekeyMessage.baseKey, ourIdentityKey.privKey);
        ecRes[1] = await getLibsignal().Curve.async.calculateAgreement(prekeyMessage.identityKey, ourSignedKey.privKey);
        ecRes[2] = await getLibsignal().Curve.async.calculateAgreement(prekeyMessage.baseKey, ourSignedKey.privKey);
        sharedSecret.set(new Uint8Array(ecRes[0]), 32 * 2); sharedSecret.set(new Uint8Array(ecRes[1]), 32); sharedSecret.set(new Uint8Array(ecRes[2]), 32 * 3);
        if (ourEphemeralKey !== undefined && prekeyMessage.baseKey !== undefined) {
            var ecRes4 = await getLibsignal().Curve.async.calculateAgreement(prekeyMessage.baseKey, ourEphemeralKey.privKey);
            sharedSecret.set(new Uint8Array(ecRes4), 32 * 4);
        }
        var masterKey = await getLibsignal().HKDF.deriveSecrets(sharedSecret.buffer, new ArrayBuffer(32), "WhisperText");
        var rootKey = masterKey[0];
    
        // calculate new ratchet
        sharedSecret = await getLibsignal().Curve.async.calculateAgreement(whisperMessage.ephemeralKey, ourSignedKey.privKey);
        var keys = await getLibsignal().HKDF.deriveSecrets(sharedSecret, rootKey, "WhisperRatchet");
        var chainKey = keys[1];

        chainKeyData = {key: chainKey, counter: -1};
    }

    var messageKey = await MultiDevice.signalGetMessageKey(chainKeyData.key, chainKeyData.counter, whisperMessage.counter, messageKeys);
    var keys = await getLibsignal().HKDF.deriveSecrets(messageKey, new ArrayBuffer(32), "WhisperMessageKeys");
    try
    {
        var plaintext = await getLibsignal().crypto.decrypt(keys[0], toArrayBuffer(whisperMessage.ciphertext), keys[2].slice(0, 16));
        return plaintext;
    }
    catch (exception)
    {
        console.error("E2E plaintext decryption failed at signalDecryptPrekeyWhisperMessage. is new session: " + isNewSession);
        console.error("session address: " + lidAddress);
        debugger;
        throw exception;
    }
    // plaintext makes sense? good.
    return plaintext;
        
}

MultiDevice.signalDecryptSenderKeyMessage = async function(senderKeyMessageBuffer, storage, groupId, address, keyDistributionMessage)
{
    var widAdress = WhatsAppAPI.WAWebSignalCommonUtils.createSignalAddress(WhatsAppAPI.WAWebWidFactory.createDeviceWidOrThrow(address), false);
    var senderKeyName = `${groupId}::${widAdress}`; // createSignalLikeSenderKeyName
    var senderKey = await storage.loadSenderKey(senderKeyName);

    var pbfInstance = getPbf();
    if (!pbfInstance) {
        console.error("WAIncognito: Pbf library is not loaded, cannot decrypt SenderKeyMessage.");
        return null;
    }
    var version = new Uint8Array(senderKeyMessageBuffer)[0];
    var messageProto = senderKeyMessageBuffer.slice(1, senderKeyMessageBuffer.byteLength - 64);
    var senderKeyMessage = SenderKeyMessage.read(new pbfInstance(messageProto));
    var id = senderKeyMessage.id;
    
    var chainKey = null; var chainMsgCounter = -1; var messageKeys = {};

    if (senderKey)
    {
        // version 2
        for (var e = 0; e < senderKey.senderKeyStates.length; e++)
        {
            if (senderKey.senderKeyStates[e].senderKeyId === id) 
            {
                chainKey =  senderKey.senderKeyStates[e].senderKeyChainKey.chainKey;
                chainMsgCounter = senderKey.senderKeyStates[e].senderKeyChainKey.nextMsgIndex;
                break; 
            }
        }
    }
    
    if (chainKey == null && keyDistributionMessage) // && keyDistributionMessage.id == id
    {
        chainKey = keyDistributionMessage.chainKey;
        chainMsgCounter = keyDistributionMessage.iteration;
    }

    if (chainKey == null) 
    { 
        console.warn("Session not found for " + senderKeyName); 
        return null;
    }

    var messageKey = await MultiDevice.signalGetMessageKey(chainKey, chainMsgCounter, senderKeyMessage.iteration, messageKeys, true);
            
    var keys = await getLibsignal().HKDF.deriveSecrets(messageKey, new ArrayBuffer(32), "WhisperGroup");
    var key = new Uint8Array(32);
    key.set(new Uint8Array(keys[0].slice(16))); key.set(new Uint8Array(keys[1].slice(0, 16)), 16);
    var iv = keys[0].slice(0, 16);
    var plaintext = await getLibsignal().crypto.decrypt(key.buffer, senderKeyMessage.ciphertext, iv);
    // plaintext makes sense? good.
    return plaintext;
}

MultiDevice.signalGetKeyDistributionMessage = function(keyDistributionMessageBuffer)
{
    var pbfInstance = getPbf();
    if (!pbfInstance) {
        console.error("WAIncognito: Pbf library is not loaded, cannot read KeyDistributionMessage.");
        return null;
    }
    var version = new Uint8Array(keyDistributionMessageBuffer)[0];
    var messageProto = keyDistributionMessageBuffer.slice(1, keyDistributionMessageBuffer.byteLength);
    var senderKeyMessage = WhisperSenderKeyDistributionMessage.read(new pbfInstance(messageProto));

    return senderKeyMessage;
}

// new ratchet: root key -> chain key
MultiDevice.calculateNewChainKey = async function(rootKey, ratchetPubKey, ratchetPrivKey)
{
    if (!(ratchetPrivKey instanceof ArrayBuffer))
        ratchetPrivKey = toArrayBuffer(ratchetPrivKey);

    var sharedSecret = await getLibsignal().Curve.async.calculateAgreement(ratchetPubKey, ratchetPrivKey);
    var keys = await getLibsignal().HKDF.deriveSecrets(sharedSecret, rootKey, "WhisperRatchet");

    return {key: keys[1], counter: -1};
}

MultiDevice.signalGetMessageKey = async function(chainKey, chainMsgCounter, counter, messageKeys={}, isSenderKey=false)
{
    if (messageKeys && messageKeys[counter] != undefined) 
    {
        // already calculated
        return messageKeys[counter];
    }

    if (counter < chainMsgCounter) 
    {
        console.warn("Possible duplicated message (counter < chain message counter)"); // look in messageKeys?
        throw "possbile duplicated message";
        debugger;
    }

    var messageKey = null;
    
    //if (counter == chainMsgCounter || isSenderKey)
    if (chainMsgCounter != -1)
    {
        // the message key should be already calculated, but sometimes it seems not
        counter++;
    }
    
    for (var i = chainMsgCounter; i < counter; i++)
    {
        messageKey = await MultiDevice.HMAC_SHA256(toArrayBuffer(new Uint8Array([0x1])), chainKey);
        chainKey = await MultiDevice.HMAC_SHA256(toArrayBuffer(new Uint8Array([0x2])), chainKey);
    }

    return messageKey;
}

//
// Helper functions
//

MultiDevice.HMAC_SHA256 = async function(toSign, key)
{
    var importedKey = await window.crypto.subtle.importKey("raw", key, {name: "HMAC", hash: {name: "SHA-256"} }, false, ["sign", "verify"]);
    var signature = await window.crypto.subtle.sign("HMAC", importedKey, toSign);
    return signature;
}

MultiDevice.enqueuePromise = async function(promise, argument, isIncoming = false)
{
    var queue = isIncoming ? MultiDevice.incomingQueue : MultiDevice.outgoingQueue;
    return queue.enqueue(promise, argument);
};

MultiDevice.numPacketsSinceHandshake = 0;
MultiDevice.looksLikeHandshakePacket = function(payload)
{
    // Noise protocol handshake flow:
    //    --> e                                                             [client hello]
    //    <-- e, s (encrypted), payload (encrypted NoiseCertificate)        [server hello]
    //    --> s (encrypted public key), payload (encrypted ClientPayload)   [client finish]
    // https://noiseprotocol.org/noise.html#handshake-patterns
    // relevenat functions: WAWebOpenChatSocket, WANoiseHandshake

    if (payload.byteLength < 8)
    {
        console.log("WAIncognito: got small packet:");
        console.log(payload);
        return true;
    }

    var binaryReader = new BinaryReader();
    binaryReader.writeBuffer(payload);

    var startOffset = 3;
    if (binaryReader._readIndex = 0, binaryReader.readUint16() == 0x5741) startOffset = 0x7; // chat
    if (binaryReader._readIndex = 0xB, binaryReader.readUint16() == 0x5741) startOffset = 0x12; // chat?ED={routingToken}
    if (binaryReader._readIndex = 0xD, binaryReader.readUint16() == 0x5741) startOffset = 0x14; // chat?ED={routingToken} version 2

    if (startOffset > 3) MultiDevice.numPacketsSinceHandshake = 0; // client hello
    if (++MultiDevice.numPacketsSinceHandshake > 3) return false;

    var handshakeMessage = {};
    var looksLikeHandshakePacket = false;
    var binary = payload.slice(startOffset, payload.length);
    try
    {
        var pbfInstance = getPbf();
        if (!pbfInstance) {
            // If Pbf is not loaded yet, we can't check the handshake packet properly.
            // But we should probably not crash here.
            return false;
        }
        handshakeMessage = HandshakeMessage.read(new pbfInstance(binary));
    }
    catch
    {
        looksLikeHandshakePacket = false;
    }

    looksLikeHandshakePacket = handshakeMessage.clientHello || handshakeMessage.serverHello || handshakeMessage.clientFinish;

    if (window.WAdebugMode)
    {
        if (handshakeMessage.clientHello) console.log("WAIncognito: client hello", handshakeMessage.clientHello);
        if (handshakeMessage.serverHello) console.log("WAIncognito: server hello", handshakeMessage.serverHello);
        if (handshakeMessage.clientFinish) console.log("WAIncognito: client finish", handshakeMessage.clientFinish);
    }

    if (handshakeMessage.clientHello)
    {
        // reset the counters on a new connection to avoid weird stuff
        MultiDevice.readKey = null;
        MultiDevice.writeKey = null;
    }

    return looksLikeHandshakePacket;
};

MultiDevice.waitForNoiseKeyIfNeeded = async function(looksLikeHandshakePacket)
{
    if (!looksLikeHandshakePacket && MultiDevice.readKey == null)
    {
        console.log("Warning: Waiting for the noise key to arrive");
        //debugger;
        await sleep(2000);
    }
}

MultiDevice.counterToIV = function(counter)
{
    const buffer = new ArrayBuffer(12);
    new DataView(buffer).setUint32(8, counter);
    return new Uint8Array(buffer);
};

function toArrayBuffer(array)
{
    return array.buffer.slice(array.byteOffset, array.byteLength + array.byteOffset);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// https://medium.com/@karenmarkosyan/how-to-manage-promises-into-dynamic-queue-with-vanilla-javascript-9d0d1f8d4df5
class PromiseQueue {
    constructor()
    {
        this.queue = [];
        this.pendingPromise = false;
    }

    enqueue(promise, argument) {
      return new Promise((resolve, reject) => {
          this.queue.push({
              promise,
              argument,
              resolve,
              reject,
          });
          this.dequeue();
      });
    }
  
  dequeue() {
      if (this.workingOnPromise) {
        return false;
      }
      const item = this.queue.shift();
      if (!item) {
        return false;
      }
      try {
        this.workingOnPromise = true;
        item.promise(item.argument)
          .then((value) => {
            this.workingOnPromise = false;
            item.resolve(value);
            this.dequeue();
          })
          .catch(err => {
            this.workingOnPromise = false;
            item.reject(err);
            this.dequeue();
          })
      } catch (err) {
        this.workingOnPromise = false;
        item.reject(err);
        this.dequeue();
      }
      return true;
    }
}


MultiDevice.initialize();