// 
// Interception of WhatsApp packets and handling nodes
//

// Global enforcing variables
var readConfirmationsHookEnabled = true;
var onlineUpdatesHookEnabled = false;
var typingUpdatesHookEnabled = false;
var saveDeletedMsgsHookEnabled = false;
var showDeviceTypesEnabled = true;
var autoReceiptOnReplay = true;
var safetyDelay = 0;
var typingNotificationsEnabled = false;

var isInitializing = true;
var exceptionsList = [];
var blinkingChats = {};
var chats = {};
var blockedChats = {};
var deviceTypesPerMessage = {};

// debugging flags
var WAdebugMode = true;
var WALogs = true;
var xmlDebugging = true;
var WAPassthrough = false;
var WAPassthroughWithDebug = false;

initialize();
 
//
// a WebSocket frame is about to be sent out.
//
wsHook.before = function (originalData, url)
{
    var promise = async function(originalData) {

    if (WAPassthrough) return originalData;

    try
    {
        if (!(originalData instanceof ArrayBuffer || originalData instanceof Uint8Array)) return originalData;

        // encrytped binary payload
        var decryptedFrames = await MultiDevice.decryptNoisePacket(originalData, isIncoming=false);
        if (decryptedFrames == null) return originalData;

        for (var i = 0; i < decryptedFrames.length; i++)
        {
            var decryptedFrameInfo = decryptedFrames[i];
            var decryptedFrame = decryptedFrameInfo.frame;
            var decryptedFrameOriginal = decryptedFrameInfo.frameUncompressed;
            var counter = decryptedFrameInfo.counter;

            var realNode = await nodeReaderWriter.decodeStanza(decryptedFrameOriginal, gzipInflate);
            
            var [isAllowed, manipulatedNode] = await NodeHandler.interceptOutgoingNode(realNode);
            decryptedFrames[i] = {node: manipulatedNode, counter: counter};

            if (WAdebugMode || WAPassthroughWithDebug)
            {
                printNode(manipulatedNode, isIncoming=false, decryptedFrame.byteLength);
                if (WAPassthroughWithDebug) return originalData;
            }

            // sanity check that our node parsing is complete
            await checkNodeEncoderSanity(decryptedFrameOriginal, isIncoming = false);
        }

        var packedNode = await MultiDevice.encryptAndPackNodesForSending(decryptedFrames, isIncoming=false);

        var looksEqual = isEqualArray(new Uint8Array(originalData), new Uint8Array(packedNode));
        if (!looksEqual && isAllowed)
        {
            debugger;
        }

        if (isInitializing)
        {
            isInitializing = false;
            console.log("WhatsIncognito: Interception is working.");
            document.dispatchEvent(new CustomEvent('onInterceptionWorking', { detail: JSON.stringify({isInterceptionWorking: true}) }));
        }

        return packedNode;
    }
    catch (exception)
    {
        if (typeof(exception) == "string" && exception.includes("counter"))
        {
            console.log(exception);
            return originalData;
        }
        
        console.error("WhatsIncognito: Passing-through outgoing packet due to exception:");
        console.error(exception);
        console.error("outgoing noise packet was:");
        console.error(originalData);
        return originalData;
    }

    };

    return MultiDevice.enqueuePromise(promise, originalData, false);
}

//
// a WebScoket frame was received from network.
//
wsHook.after = function (messageEvent, url)
{
    var promise = async function(messageEvent) {
    
    if (WAPassthrough) return messageEvent;

    try
    {
        var originalData = messageEvent.data;

        if (!(originalData instanceof ArrayBuffer || originalData instanceof Uint8Array)) return messageEvent;

        var decryptedFrames = await MultiDevice.decryptNoisePacket(originalData, isIncoming=true);
        if (decryptedFrames == null) return messageEvent;

        var didBlockNode = false;
        for (var i = 0; i < decryptedFrames.length; i++)
        {
            var decryptedFrameInfo = decryptedFrames[i];
            var decryptedFrame = decryptedFrameInfo.frame;
            var decryptedFrameOriginal = decryptedFrameInfo.frameUncompressed;
            var counter = decryptedFrameInfo.counter;

            var realNode = await nodeReaderWriter.decodeStanza(decryptedFrameOriginal, gzipInflate);
            
            if (WAdebugMode || WAPassthroughWithDebug)
            {
                printNode(realNode, isIncoming=true, decryptedFrame.byteLength);
                
                if (WAPassthroughWithDebug) return messageEvent;
            }

            // sanity check that our node parsing is deterministic
            await checkNodeEncoderSanity(decryptedFrameOriginal, isIncoming = true);

            // Check for typing notifications
            if (typingNotificationsEnabled) {
                try {
                    await checkForTypingNotification(realNode);
                } catch (error) {
                    console.error("Error processing typing notification:", error);
                    // Continue processing even if typing notification fails
                }
            }

            var [isAllowed, manipulatedNode] = await NodeHandler.interceptReceivedNode(realNode);

            if (!isAllowed)
            {
                didBlockNode = true;
            }

            decryptedFrames[i] = {node: manipulatedNode, counter: counter, decryptedFrame: decryptedFrame};
        }

        var packet = await MultiDevice.encryptAndPackNodesForSending(decryptedFrames, true);
        if (didBlockNode) messageEvent.data = packet;

        // TODO: compare the original `data` with `packet`

        return messageEvent;
    }
    catch (exception)
    {
        if (exception.message && exception.message.includes("stream end")) return messageEvent;
        if (typeof(exception) == "string" && exception.includes("counter"))
        {
            console.log(exception);
            return messageEvent;
        }

        console.error("Passing-through incoming packet due to error:");
        console.error(exception);
        console.error("incoming noise packet was:");
        console.error(originalData);
        debugger;
        return messageEvent;
    };

    };

    return MultiDevice.enqueuePromise(promise, messageEvent, true);
}



function onDeletionMessageBlocked(message, remoteJid, messageId, deletedMessageId)
{
    // In case the message already appears on screen, mark it in red
    var messageNode = document.querySelector("[data-id*='" + deletedMessageId + "']");
    if (messageNode)
    {
        messageNode.setAttribute("deleted-message", "true");     // mark the message in red
    }

    document.dispatchEvent(new CustomEvent("pseudoMsgs", {
        detail: deletedMessageId
    }));

    // Now, save the deleted message in the DB after a short wait
    var waitTime = window.WhatsAppAPI != undefined ? 100 : 5000;
    setTimeout(async function() 
    {
        var chat = await getChatByJID(remoteJid);
        if (chat)
        {
            if (chat.loadEarlierMsgs)
                await chat.loadEarlierMsgs();
            else
                await WhatsAppAPI.LoadEarlierMessages.loadEarlierMsgs(chat);

            var msgs = chat.msgs.getModelsArray();
        
            for (let i = 0; i < msgs.length; i++)
            {
                if (msgs[i].id.id == deletedMessageId)
                {
                    saveDeletedMessage(msgs[i], message.protocolMessage.key, messageId);
                    break;
                }
            }
        }
    }, waitTime);
}

async function decryptE2EMessagesFromNode(node)
{
    // decrypt the signal message
    try
    {
        return MultiDevice.decryptE2EMessagesFromMessageNode(node);
    }
    catch (exception)
    {
        console.error("Could not decrypt E2E message with type " + node.attrs["type"] + " due to exception:");
        console.error(exception);
        debugger;
    }
}

async function interceptViewOnceMessages(e2eMessage, messageId) 
{
    if (e2eMessage.viewOnceMessageV2 !== null || e2eMessage.viewOnceMessageV2Extension !== null) 
    {
        var retrievedMsg = {};
        var type = "";
        if (e2eMessage.viewOnceMessageV2 !== null)
        {
            if (e2eMessage.viewOnceMessageV2.message.imageMessage !== null) 
            {
                retrievedMsg = e2eMessage.viewOnceMessageV2.message.imageMessage;
                type = "image";
            }
            else if (e2eMessage.viewOnceMessageV2.message.videoMessage !== null) 
            {
                retrievedMsg = e2eMessage.viewOnceMessageV2.message.videoMessage;
                type = "video";
            }
            else
            {
                throw new Error("Unknown viewOnceMessageV2 type");
            }
        }
        else if (e2eMessage.viewOnceMessageV2Extension?.message?.audioMessage !== null) 
        {
            retrievedMsg = e2eMessage.viewOnceMessageV2Extension.message.audioMessage;
            type = "audio";
        }
        else 
        {
            throw new Error("Unknown viewOnceMessageV2 or viewOnceMessageV2Extension type");
        }
        const mediaKeyEncoded = btoa(String.fromCharCode.apply(null, retrievedMsg.mediaKey));
        const encodedencFileHash = btoa(String.fromCharCode.apply(null, retrievedMsg.fileEncSha256));
        const encodedfileSha256 = btoa(String.fromCharCode.apply(null, retrievedMsg.fileSha256));
        
        if (window.WhatsAppAPI !== undefined)
        {
            const decryptedData = await WhatsAppAPI.downloadManager.downloadAndMaybeDecrypt({
                directPath: retrievedMsg.directPath,
                encFilehash: encodedencFileHash, filehash: encodedfileSha256, mediaKey: mediaKeyEncoded,
                type: type, signal: (new AbortController).signal
            });

            body = arrayBufferToBase64(decryptedData);
            dataURI = "data:" + retrievedMsg.mimetype + ";base64," + body;
            var caption = retrievedMsg.caption;
            // store in indexedDB called "view-once" messageID and dataURI 
            var viewOnceDBOpenRequest = indexedDB.open("viewOnce", 2);
            viewOnceDBOpenRequest.onupgradeneeded = function (event) {
                const db = event.target.result;
                var store = db.createObjectStore('msgs', { keyPath: 'id' });
                if (WAdebugMode) {
                    console.log('WhatsIncognito: Deleted messages database generated');
                }
                store.createIndex("id_index", "id");
            };
            viewOnceDBOpenRequest.onerror = function (e) {
                console.error("WhatsIncognito: Error opening database");
                console.error("Error", viewOnceDBOpenRequest);
                console.error(e);
            };
            viewOnceDBOpenRequest.onsuccess = () => {
                var viewOnceDB = viewOnceDBOpenRequest.result;
                var viewOnceTranscation = viewOnceDB.transaction('msgs', "readwrite");
                var viewOnceRequest = viewOnceTranscation.objectStore("msgs").add({ id: messageId, dataURI: dataURI, caption});
                viewOnceRequest.onerror = (e) => {
                    if (viewOnceRequest.error.name == "ConstraintError") {
                        if (WAdebugMode) {
                            console.log("WhatsIncognito: Not saving message becuase the message ID already exists");
                        }
                    }

                    else {
                        console.warn("WhatsIncognito: Unexpected error saving deleted message");
                    }
                };
            };
        }
        else
        {
            // retry in 5 seconds
            // don't know why it's 5 seconds, but that's what is done for decrypting deleted messages 
            setTimeout(function(){
                interceptViewOnceMessages(e2eMessage, messageId)
            }, 5000);
        }
    }
}

function printNode(node, isIncoming = false, decryptedFrameLength)
{
    var objectToPrint = xmlDebugging ? nodeToElement(node) : node;
    if (isIncoming)
    {
        console.log("[In] Received binary (" + decryptedFrameLength + " bytes, decrypted)): ");
    }
    else
    {
        console.log("[Out] Sending binary (" + decryptedFrameLength + " bytes, decrypted): ");
    }

    console.log(node);

    if (xmlDebugging)
    {
        console.dirxml(objectToPrint);
        objectToPrint.remove();
    }
    else
    {
        console.log(objectToPrint);
    }
}



//
// Miscellaneous 
//

function exposeWhatsAppAPI()
{
    window.WhatsAppAPI = {};

    // React Native
    window.WhatsAppAPI.downloadManager = require("WAWebDownloadManager").downloadManager;
    window.WhatsAppAPI.ChatCollection = require("WAWebChatCollection").ChatCollection;
    window.WhatsAppAPI.Seen = require("WAWebUpdateUnreadChatAction");
    window.WhatsAppAPI.Communication = require("WAComms").getComms();
    window.WhatsAppAPI.LoadEarlierMessages = require("WAWebChatLoadMessages");
    window.WhatsAppAPI.sendPresenceStatusProtocol = require("WASendPresenceStatusProtocol").sendPresenceStatusProtocol;
    window.WhatsAppAPI.SignalStore = require("WAWebSignalProtocolStore");
    window.WhatsAppAPI.WAWebSignalCommonUtils = require("WAWebSignalCommonUtils");
    window.WhatsAppAPI.WAWebWidFactory = require("WAWebWidFactory");
    window.WhatsAppAPI.WAWebWidToJid = require("WAWebWidToJid");

    if (window.WhatsAppAPI.Seen == undefined)
    {
        console.error("WhatsAppWebIncognito: Can't find the WhatsApp API. Stuff might not work.");
    }
}

function initialize()
{
    if (WALogs)
        hookLogs();
    initializeDeletedMessagesDB();
    
    // Start the stay online functionality
    startStayOnline();
}

function hookLogs()
{
    // we don't want extension-related errors to be silently sent out

    var originalSendLogs = window.SEND_LOGS;
    var originalOnUnhandledRejection = window.onunhandledrejection;
    var originalLog = window.__LOG__; // TODO: Find log function for 2.3000 ( d("WALogger").LOG,  d("WALogger").ERROR ?)

    Object.defineProperty(window, 'onunhandledrejection', {
        set: function(value) { originalOnUnhandledRejection = value; },
        get: function() {return hookedPromiseError;}
    });
    Object.defineProperty(window, '__LOG__', {
        set: function(value) { originalLog = value; },
        get: function() {return hookedLog;}
    });

    function hookedPromiseError(event)
    {
        debugger;
        console.error("Unhandled promise rejection:");
        console.error(errorObject);
        return originalOnUnhandledRejection.call(event);
    }

    function hookedLog(errorLevel)
    {        
        return function(strings, values)
        {
            var message = "[WhatsApp][" + errorLevel + "] -- " + makeLogMessage(arguments);

            if (errorLevel <= 2 && WAdebugMode)
            {
                console.log(message);
            }
            else if (errorLevel > 2 && WAdebugMode)
            {
                console.error(message);
            }
            else if (errorLevel > 2)
            {
                console.info(message);
            }

            if (originalLog)
            {
                var originalLogFn = originalLog(errorLevel);
                return originalLogFn.apply(null, arguments);
            }
            
        };
    }
}

function initializeDeletedMessagesDB()
{
    var deletedDBOpenRequest = indexedDB.open("deletedMsgs", 2);

    deletedDBOpenRequest.onupgradeneeded = function (event)
    {
        // triggers if the client had no database
        // ...perform initialization...
        debugger;

        // Get a reference to the request related to this event
        // @type IDBOpenRequest (a specialized type of IDBRequest)
        var request = event.target;

        // Get a reference to the IDBDatabase object for this request
        // @type IDBDatabase
        var db = request.result;

        // Get a reference to the implicit transaction for this request
        // @type IDBTransaction
        var txn = request.transaction;

        switch (event.oldVersion)
        {
            case 0:
                var store = db.createObjectStore('msgs', { keyPath: 'id' });
                console.log('WhatsIncognito: Deleted messages database generated');
                store.createIndex("originalID_index", "originalID");
                break;
            case 1:
                var store = txn.objectStore("msgs");
                
                store.createIndex("originalID_index", "originalID");
                break;
        }
    };
    deletedDBOpenRequest.onerror = function (e)
    {
        console.error("WhatsIncognito: Error opening database");
        console.error("Error", deletedDBOpenRequest);
        console.error(e);
    };
    deletedDBOpenRequest.onsuccess = () =>
    {
        window.deletedMessagesDB = deletedDBOpenRequest.result;
    }
}

async function saveDeletedMessage(retrievedMsg, deletedMessageKey, revokeMessageID)
{
    // Determine author data
    let author = deletedMessageKey.participant.split("@")[0].split(":")[0]

    let body = "";
    let isMedia = false;

    // Stickers & Documents are not considered media for some reason, so we have to check if it has a mediaKey and also set isMedia == true
    if (retrievedMsg.isMedia || retrievedMsg.mediaKey)
    {
        isMedia = true;

        // get extended media key              
        try
        {
            const decryptedData = await WhatsAppAPI.downloadManager.downloadAndMaybeDecrypt({ directPath: retrievedMsg.directPath, 
                encFilehash: retrievedMsg.encFilehash, filehash: retrievedMsg.filehash, mediaKey: retrievedMsg.mediaKey, 
                type: retrievedMsg.type, signal: (new AbortController).signal });

            body = arrayBufferToBase64(decryptedData);

        }
        catch (e) { console.error(e); }
    }
    else 
    {   
        body = retrievedMsg.body;
    }

    let deletedMsgContents = {}
    deletedMsgContents.id = revokeMessageID;
    deletedMsgContents.originalID = retrievedMsg.id.id;
    deletedMsgContents.body = body;
    deletedMsgContents.timestamp = retrievedMsg.t;
    deletedMsgContents.from = author;
    deletedMsgContents.isMedia = isMedia;
    deletedMsgContents.fileName = retrievedMsg.filename;
    deletedMsgContents.mimetype = retrievedMsg.mimetype;
    deletedMsgContents.type = retrievedMsg.type;
    deletedMsgContents.mediaText = retrievedMsg.text;
    deletedMsgContents.Jid = deletedMessageKey.remoteJid;
    deletedMsgContents.lng = retrievedMsg.lng;
    deletedMsgContents.lat = retrievedMsg.lat;

    if ("id" in deletedMsgContents)
    {
        const transcation = window.deletedMessagesDB.transaction('msgs', "readwrite");
        let request = transcation.objectStore("msgs").add(deletedMsgContents);
        request.onerror = (e) =>
        {
            if (request.error.name == "ConstraintError")
            {
                // ConstraintError occurs when an object with the same id already exists
                // This will happen when we get the revoke message again from the server
                console.log("WhatsIncognito: Not saving message becuase the message ID already exists");
            } 
            else
            {
                console.log("WhatsIncognito: Unexpected error saving deleted message");
            }
        };
        request.onsuccess = (e) =>
        {
            console.log("WhatsIncognito: Saved deleted message with ID " + deletedMsgContents.id + " from " + deletedMsgContents.from + " successfully.");
        }
    }
    else
    {
        console.log("WhatsIncognito: Deleted message contents not found");
    }
}

async function checkNodeEncoderSanity(originalFrame, isIncoming=false)
{
    var flags = new Uint8Array(originalFrame)[0];
    var decryptedFrameOpened = originalFrame.slice(1);
    if (flags & 2)
    {
        // zlib compressed. decompress
        decryptedFrameOpened = toArrayBuffer(pako.inflate(new Uint8Array(decryptedFrameOpened)));
    }

    var realNode = await nodeReaderWriter.decodeStanza(originalFrame, gzipInflate);

    // sanity check that our node parsing is deterministic
    var encodedNodeData = await nodeReaderWriter.encodeStanza(realNode, isIncoming);
    var looksGood = isEqualArray(new Uint8Array(decryptedFrameOpened), encodedNodeData.slice(1));
    if (!looksGood && !isIncoming)
    {
        debugger;
    }
    if (!looksGood && isIncoming)
    {
        // This can sometimes hit because on the encoding path, strings that represent numbers are always encoded with NIBBLE_8 (255) encoding.
        // But on the decoding path, WhatsApp servers could send us number strings encoded with regular BINARY_8 (252) encoding, 
        // which we will re-encode as NIBBLE_8 (255).
        //debugger;
    }
}

async function checkForTypingNotification(node) {
    // Check if this is a typing notification
    if (node.tag === "presence" && node.attrs && node.attrs.type === "composing") {
        // Extract the JID of the person typing
        var jid = node.attrs.from;
        if (jid) {
            // Ensure jid is a string before processing
            var jidString = typeof jid === 'object' ? jid.toString() : jid;
            
            // Debug logging
            if (WAdebugMode) {
                console.log("[Typing Notification] Presence composing from: " + jidString);
                console.log("[Typing Notification] Presence node:", node);
            }
            
            // Get the display name for the JID
            var displayName = await getDisplayNameForJID(jidString);
            
            // Log the resolved display name
            if (WAdebugMode) {
                console.log("[Typing Notification] Resolved display name: " + displayName + " (JID: " + jidString + ")");
            }
            
            // Only show notification if we have a meaningful display name
            if (displayName && displayName.trim() !== '' && 
                !displayName.includes('@') && 
                !displayName.includes('lid') &&
                displayName.length > 1) {
                // Show both UI and system notifications
                showTypingNotification(displayName, jidString);
                playBeepSound();
            } else if (WAdebugMode) {
                console.log("[Typing Notification] Skipping notification - invalid display name: " + displayName);
            }
        }
    } else if (node.tag === "chatstate" && node.content && node.content.length > 0) {
        // Handle chatstate nodes which might contain composing information
        for (var i = 0; i < node.content.length; i++) {
            var childNode = node.content[i];
            if (childNode.tag === "composing") {
                var jid = node.attrs.from;
                if (jid) {
                    // Ensure jid is a string before processing
                    var jidString = typeof jid === 'object' ? jid.toString() : jid;
                    
                    // Debug logging
                    if (WAdebugMode) {
                        console.log("[Typing Notification] Chatstate composing from: " + jidString);
                        console.log("[Typing Notification] Chatstate node:", node);
                    }
                    
                    var displayName = await getDisplayNameForJID(jidString);
                    
                    // Log the resolved display name
                    if (WAdebugMode) {
                        console.log("[Typing Notification] Resolved display name: " + displayName + " (JID: " + jidString + ")");
                    }
                    
                    // Only show notification if we have a meaningful display name
                    if (displayName && displayName.trim() !== '' && 
                        !displayName.includes('@') && 
                        !displayName.includes('lid') &&
                        displayName.length > 1) {
                        showTypingNotification(displayName, jidString);
                        playBeepSound();
                    } else if (WAdebugMode) {
                        console.log("[Typing Notification] Skipping notification - invalid display name: " + displayName);
                    }
                }
                break;
            }
        }
    }
}

async function getDisplayNameForJID(jid) {
    try {
        // Ensure jid is a string
        var jidString = typeof jid === 'object' ? jid.toString() : jid;
        
        // Log the JID for debugging
        if (WAdebugMode) {
            console.log("[Typing Notification] Processing JID: " + jidString);
        }
        
        // Handle LID format JIDs
        if (jidString.includes("@lid")) {
            // Extract the numeric portion before @lid
            var lidNumber = jidString.split('@')[0];
            if (lidNumber.includes(':')) {
                lidNumber = lidNumber.split(':')[0];
            }
            
            if (WAdebugMode) {
                console.log("[Typing Notification] Extracted LID number: " + lidNumber);
            }
            
            // Try to find a contact with this LID
            if (window.WhatsAppAPI && WhatsAppAPI.Store) {
                // Log available collections for debugging
                if (WAdebugMode) {
                    console.log("[Typing Notification] Available Store collections:", Object.keys(WhatsAppAPI.Store));
                }
                
                // Try different contact collection approaches
                try {
                    var contact = null;
                    
                    // Try Contact collection first
                    if (WhatsAppAPI.Store.Contact && WhatsAppAPI.Store.Contact.get) {
                        contact = WhatsAppAPI.Store.Contact.get(lidNumber);
                    }
                    
                    // Try Contacts collection if Contact doesn't work
                    if (!contact && WhatsAppAPI.Store.Contacts && WhatsAppAPI.Store.Contacts.get) {
                        contact = WhatsAppAPI.Store.Contacts.get(lidNumber);
                    }
                    
                    if (contact) {
                        if (WAdebugMode) {
                            console.log("[Typing Notification] Found contact by LID:", contact);
                        }
                        
                        if (contact.displayName && contact.displayName.trim() !== '') {
                            if (WAdebugMode) {
                                console.log("[Typing Notification] Using LID contact displayName: " + contact.displayName);
                            }
                            return contact.displayName;
                        } else if (contact.name && contact.name.trim() !== '') {
                            if (WAdebugMode) {
                                console.log("[Typing Notification] Using LID contact name: " + contact.name);
                            }
                            return contact.name;
                        } else if (contact.formattedName && contact.formattedName.trim() !== '') {
                            if (WAdebugMode) {
                                console.log("[Typing Notification] Using LID contact formattedName: " + contact.formattedName);
                            }
                            return contact.formattedName;
                        } else if (contact.pushname && contact.pushname.trim() !== '') {
                            if (WAdebugMode) {
                                console.log("[Typing Notification] Using LID contact pushname: " + contact.pushname);
                            }
                            return contact.pushname;
                        }
                    }
                } catch (lidError) {
                    if (WAdebugMode) {
                        console.log("[Typing Notification] Error getting contact by LID:", lidError);
                    }
                }
            }
            
            // If we can't find by LID, return the LID number
            if (WAdebugMode) {
                console.log("[Typing Notification] Using LID number as fallback: " + lidNumber);
            }
            return lidNumber;
        }
        
        // Try to get the display name from WhatsApp's API
        if (window.WhatsAppAPI) {
            // First try to get from ChatCollection
            var chat = await getChatByJID(jidString);
            if (chat) {
                // Log chat information for debugging
                if (WAdebugMode) {
                    console.log("[Typing Notification] Chat info:", chat);
                }
                
                // Try to get contact name from chat
                if (chat.contact && typeof chat.contact === 'object') {
                    // Log contact information for debugging
                    if (WAdebugMode) {
                        console.log("[Typing Notification] Contact info:", chat.contact);
                    }
                    
                    // Return the best available name
                    if (chat.contact.displayName && chat.contact.displayName.trim() !== '') {
                        if (WAdebugMode) {
                            console.log("[Typing Notification] Using displayName: " + chat.contact.displayName);
                        }
                        return chat.contact.displayName;
                    } else if (chat.contact.name && chat.contact.name.trim() !== '') {
                        if (WAdebugMode) {
                            console.log("[Typing Notification] Using name: " + chat.contact.name);
                        }
                        return chat.contact.name;
                    } else if (chat.contact.formattedName && chat.contact.formattedName.trim() !== '') {
                        if (WAdebugMode) {
                            console.log("[Typing Notification] Using formattedName: " + chat.contact.formattedName);
                        }
                        return chat.contact.formattedName;
                    } else if (chat.contact.pushname && chat.contact.pushname.trim() !== '') {
                        if (WAdebugMode) {
                            console.log("[Typing Notification] Using pushname: " + chat.contact.pushname);
                        }
                        return chat.contact.pushname;
                    }
                }
                
                // Try to get name from chat itself
                if (chat.name && chat.name.trim() !== '') {
                    if (WAdebugMode) {
                        console.log("[Typing Notification] Using chat name: " + chat.name);
                    }
                    return chat.name;
                }
                
                if (chat.formattedTitle && chat.formattedTitle.trim() !== '') {
                    if (WAdebugMode) {
                        console.log("[Typing Notification] Using chat formattedTitle: " + chat.formattedTitle);
                    }
                    return chat.formattedTitle;
                }
            }
            
            // If we couldn't get it from ChatCollection, try to find it through GUI
            try {
                var chatElem = findChatEntryElementForJID(jidString);
                if (chatElem != null) {
                    var reactData = FindReact(chatElem);
                    if (reactData && reactData.props && reactData.props.data) {
                        var chatData = reactData.props.data.data || reactData.props.data.chat;
                        if (chatData) {
                            if (WAdebugMode) {
                                console.log("[Typing Notification] GUI Chat data:", chatData);
                            }
                            
                            if (chatData.contact && typeof chatData.contact === 'object') {
                                if (chatData.contact.displayName && chatData.contact.displayName.trim() !== '') {
                                    if (WAdebugMode) {
                                        console.log("[Typing Notification] Using GUI displayName: " + chatData.contact.displayName);
                                    }
                                    return chatData.contact.displayName;
                                } else if (chatData.contact.name && chatData.contact.name.trim() !== '') {
                                    if (WAdebugMode) {
                                        console.log("[Typing Notification] Using GUI name: " + chatData.contact.name);
                                    }
                                    return chatData.contact.name;
                                } else if (chatData.contact.formattedName && chatData.contact.formattedName.trim() !== '') {
                                    if (WAdebugMode) {
                                        console.log("[Typing Notification] Using GUI formattedName: " + chatData.contact.formattedName);
                                    }
                                    return chatData.contact.formattedName;
                                } else if (chatData.contact.pushname && chatData.contact.pushname.trim() !== '') {
                                    if (WAdebugMode) {
                                        console.log("[Typing Notification] Using GUI pushname: " + chatData.contact.pushname);
                                    }
                                    return chatData.contact.pushname;
                                }
                            }
                            
                            if (chatData.name && chatData.name.trim() !== '') {
                                if (WAdebugMode) {
                                    console.log("[Typing Notification] Using GUI chat name: " + chatData.name);
                                }
                                return chatData.name;
                            }
                            
                            if (chatData.formattedTitle && chatData.formattedTitle.trim() !== '') {
                                if (WAdebugMode) {
                                    console.log("[Typing Notification] Using GUI chat formattedTitle: " + chatData.formattedTitle);
                                }
                                return chatData.formattedTitle;
                            }
                        }
                    }
                }
            } catch (guiError) {
                if (WAdebugMode) {
                    console.log("[Typing Notification] Error getting name from GUI:", guiError);
                }
            }
        }
        
        // Fallback to extracting from JID
        var phoneNumber = jidString.split('@')[0];
        if (phoneNumber.includes(':')) {
            phoneNumber = phoneNumber.split(':')[0];
        }
        
        if (WAdebugMode) {
            console.log("[Typing Notification] Using phone number: " + phoneNumber);
        }
        
        return phoneNumber;
    } catch (e) {
        console.error("Error getting display name for JID: " + jid, e);
        var jidString = typeof jid === 'object' ? jid.toString() : jid;
        return jidString.split('@')[0];
    }
}

function showTypingNotification(displayName, jid) {
    try {
        // Log the notification details for debugging
        if (WAdebugMode) {
            console.log("[Typing Notification] Showing notification for: " + displayName + " (JID: " + jid + ")");
        }
        
        // Show UI notification
        showUITypingNotification(displayName);
        
        // Show system notification
        showSystemTypingNotification(displayName);
    } catch (error) {
        console.error('Error showing typing notification:', error);
    }
}

function showUITypingNotification(displayName) {
    try {
        // Create a toast-like notification on the webpage
        var notification = document.createElement('div');
        notification.className = 'whatsapp-incognito-typing-notification';
        notification.textContent = displayName + " is typing...";
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #009688;
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 10000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        // Check if document.body is available
        if (document.body) {
            document.body.appendChild(notification);
            
            // Log the UI notification for debugging
            if (WAdebugMode) {
                console.log("[Typing Notification] UI notification shown: " + displayName + " is typing...");
            }
            
            // Remove notification after 5 seconds
            setTimeout(function() {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                    if (WAdebugMode) {
                        console.log("[Typing Notification] UI notification removed");
                    }
                }
            }, 5000);
        }
    } catch (error) {
        console.error('Error showing UI typing notification:', error);
    }
}

function showSystemTypingNotification(displayName) {
    // Check if Notification API is available
    if (typeof Notification === 'undefined') {
        console.warn('Notification API not available');
        return;
    }
    
    // Log the system notification request
    if (WAdebugMode) {
        console.log("[Typing Notification] Requesting system notification for: " + displayName);
    }
    
    // Request notification permission if not already granted
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission().then(function(permission) {
            if (permission === 'granted') {
                createSystemNotification(displayName);
            }
        }).catch(function(error) {
            console.error('Error requesting notification permission:', error);
        });
    } else if (Notification.permission === 'granted') {
        createSystemNotification(displayName);
    }
}

function createSystemNotification(displayName) {
    try {
        // Check if chrome object is available
        var iconUrl = 'images/icon_128_blue.png';
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
            iconUrl = chrome.runtime.getURL('images/icon_128_blue.png');
        }
        
        // Log the system notification creation
        if (WAdebugMode) {
            console.log("[Typing Notification] Creating system notification: " + displayName + " is typing...");
        }
        
        new Notification('WhatsApp Typing Notification', {
            body: displayName + ' is typing...',
            icon: iconUrl
        });
    } catch (error) {
        console.error('Error creating system notification:', error);
    }
}

function playBeepSound() {
    // Play three beeps
    try {
        // Check if AudioContext is available
        if (typeof window.AudioContext === 'undefined' && typeof window.webkitAudioContext === 'undefined') {
            console.warn('AudioContext not available');
            return;
        }
        
        // Create audio context
        var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Play three beeps with 200ms interval
        for (let i = 0; i < 3; i++) {
            setTimeout(function() {
                try {
                    var oscillator = audioCtx.createOscillator();
                    var gainNode = audioCtx.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    
                    oscillator.type = 'sine';
                    oscillator.frequency.value = 800; // 800 Hz
                    gainNode.gain.value = 0.3; // Volume
                    
                    oscillator.start();
                    oscillator.stop(audioCtx.currentTime + 0.1); // 100ms beep
                } catch (e) {
                    console.error("Error playing individual beep sound:", e);
                }
            }, i * 200); // 200ms apart
        }
    } catch (e) {
        console.error("Error playing beep sound:", e);
    }
}

// Stay Online functionality
var stayOnlineInterval = null;

function startStayOnline() {
    // Listen for options updates
    document.addEventListener('onOptionsUpdate', function(e) {
        var options = JSON.parse(e.detail);
        if ('stayOnline' in options) {
            stayOnlineEnabled = options.stayOnline;
            
            if (stayOnlineEnabled) {
                // Start sending periodic presence updates
                startPresenceUpdates();
            } else {
                // Stop sending periodic presence updates
                stopPresenceUpdates();
            }
        }
    });
    
    // Initial check
    if (stayOnlineEnabled) {
        startPresenceUpdates();
    }
}

function startPresenceUpdates() {
    // Clear any existing interval
    if (stayOnlineInterval) {
        clearInterval(stayOnlineInterval);
    }
    
    // Send initial presence update
    sendPresenceUpdate();
    
    // Send presence updates every 15 seconds
    stayOnlineInterval = setInterval(function() {
        sendPresenceUpdate();
    }, 15000);
}

function stopPresenceUpdates() {
    if (stayOnlineInterval) {
        clearInterval(stayOnlineInterval);
        stayOnlineInterval = null;
    }
}

function sendPresenceUpdate() {
    try {
        // Make sure WhatsApp API is available
        if (window.WhatsAppAPI && window.WhatsAppAPI.sendPresenceStatusProtocol) {
            // Send available presence status
            window.WhatsAppAPI.sendPresenceStatusProtocol({name:"", status:"available"});
            
            if (WAdebugMode) {
                console.log("[Stay Online] Sent presence update");
            }
        } else {
            console.warn("[Stay Online] WhatsApp API not available for presence updates");
        }
    } catch (error) {
        console.error("[Stay Online] Error sending presence update:", error);
    }
}