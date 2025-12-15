// -----------------------------------------------------------------------------
// Online Presence Tracking Logic
// -----------------------------------------------------------------------------

var onlineTrackerEnabled = true;
var stayOnlineEnabled = false;
var stayOnlineInterval = null;

// Exposed to window for UI
window.OnlineTracker = {
    getLogs: getLogs,
    clearLogs: clearLogs,
    deleteLog: deleteLog,
    getTrackedUsers: getTrackedUsers,
    addTrackedUser: addTrackedUser,
    removeTrackedUser: removeTrackedUser,
    isTrackedUser: isTrackedUser,
    subscribeToPresence: subscribeToPresence,
    subscribeToPresence: subscribeToPresence,
    getSessionsFromLogs: getSessionsFromLogs,
    getSystemGaps: getSystemGaps
};

function getSystemGaps() {
    var logs = getLogs();
    var gapLogs = logs.filter(l => l.jid === 'SYSTEM' && l.status === 'gap');

    return gapLogs.map(l => {
        var duration = (l.metadata && l.metadata.duration) ? l.metadata.duration : (typeof l.metadata === 'number' ? l.metadata : 0);
        return {
            start: l.timestamp,
            end: l.timestamp + duration
        };
    });
}

function getSessionsFromLogs(jid, logs) {
    if (!logs) logs = getLogs();

    // Filter for specific user
    var userLogs = logs.filter(l => l.jid === jid || l.userName === jid);
    userLogs.sort((a, b) => a.timestamp - b.timestamp);

    var sessions = [];
    var currentSession = null;

    userLogs.forEach(function (log) {
        if (log.status === 'online') {
            if (!currentSession) {
                currentSession = { start: log.timestamp, end: null };
            }
        } else if (log.status === 'offline') {
            if (currentSession) {
                currentSession.end = log.timestamp;
                sessions.push(currentSession);
                currentSession = null;
            } else {
                // Offline without online start? Maybe started before logs began?
                // Or we can assume it started recently if we have metadata.duration
                if (log.metadata && log.metadata.duration) {
                    // Only create a session if the previous status was actually online.
                    // If we are logging repeated offline events (e.g. heartbeat), 
                    // the duration represents offline time, not online time.
                    if (log.metadata.previousStatus === 'online' || !log.metadata.previousStatus) {
                        sessions.push({
                            start: log.timestamp - log.metadata.duration,
                            end: log.timestamp
                        });
                    }
                }
            }
        }
    });

    // If still online (no offline event yet)
    if (currentSession) {
        currentSession.end = Date.now();
        sessions.push(currentSession);
    }

    return sessions;
}

async function checkForOnlinePresence(node) {
    // We are looking for presence nodes
    if (node.tag === "presence") {
        var jid = node.attrs.from;
        var type = node.attrs.type;
        var status = "online";

        if (typeof WAdebugMode !== 'undefined' && WAdebugMode) {
            console.log("[OnlineTracker] Received presence node from:", jid, "Type:", type);
        }



        if (type === "unavailable") {
            status = "offline";
        }

        // Extract 'last' attribute for Last Seen info (usually seconds or timestamp)
        var lastSeen = node.attrs.last;

        if (jid) {
            // Handle JID formatting
            var originalJidObj = jid;
            jid = typeof jid === 'object' ? jid.toString() : jid; // Ensure string



            if (jid.includes('@')) {
                jid = jid.split('/')[0];
            }

            // Check if this user is being tracked using canonical matching
            var canonicalJid = getCanonicalTrackedJID(jid);

            // LID Handling: If no direct match and it's a LID, try to resolve to PN JID
            if (!canonicalJid && jid.includes('lid')) {
                var pnJid = await resolveLidToPn(jid);
                if (pnJid) {
                    if (typeof WAdebugMode !== 'undefined' && WAdebugMode) console.log("[OnlineTracker] Resolved LID:", jid, "->", pnJid);
                    // Check tracking again with the resolved PN JID
                    canonicalJid = getCanonicalTrackedJID(pnJid);
                } else {
                    if (typeof WAdebugMode !== 'undefined' && WAdebugMode) console.log("[OnlineTracker] Could not resolve LID:", jid);
                    if (typeof window.Store === 'undefined' && typeof WAdebugMode !== 'undefined' && WAdebugMode) console.log("[OnlineTracker] window.Store is undefined");
                }
            } else if (jid.includes('lid')) {
                if (typeof WAdebugMode !== 'undefined' && WAdebugMode) console.log("[OnlineTracker] LID matched directly?!", jid);
            }

            if (canonicalJid) {

                if (typeof WAdebugMode !== 'undefined' && WAdebugMode) console.log("[OnlineTracker] Matched tracked user:", jid, "->", canonicalJid);
                await handlePresenceUpdate(canonicalJid, status, lastSeen);
            } else {

                if (typeof WAdebugMode !== 'undefined' && WAdebugMode) console.log("[OnlineTracker] Ignoring non-tracked user:", jid);
            }
        }
    }
}

async function resolveLidToPn(lid) {
    try {
        // Method 1: window.Store.Contact
        if (typeof window.Store !== 'undefined' && window.Store.Contact) {
            var contact = window.Store.Contact.get(lid);
            if (contact) {
                // Check common properties for the Linked Phone ID
                // Often contact.phoneNumber is the PN JID object or contact.id is the PN if we grabbed the right one
                // But for a LID contact, we might need to find the linked PN.
                // Sometimes contact.phoneNumber is null for LIDs.
                // Let's check if the contact object has a _serialized that is c.us? No, that would be the LID itself.

                // Look for other associated records?
                // Actually, Store.Contact.get(lid) returns the contact model.
                // Does it have a pointer to the phone user?
                // In some versions, contact.__x_phoneNumber can be used?
                // Or we might iterate contacts to find one with this LID? (Too slow)

                // Try WPP if available as it abstracts this
            }
        }

        // Method 2: WPP
        if (typeof WPP !== 'undefined' && WPP.contact) {
            var wppContact = await WPP.contact.get(lid);
            if (wppContact && wppContact.phoneNumber) {
                // wppContact.phoneNumber might be the user info
                return wppContact.phoneNumber._serialized || wppContact.phoneNumber;
            }
            // Sometimes WPP returns the same LID if it can't find PN?
        }

        // Method 3: Brute force search in Store.Contact (Efficient enough for small lists? No, Store has thousands)
        // But we only care about TRACKED users.
        // We can iterate tracked users and see if their contact has this LID?
        var tracked = getTrackedUsers();
        if (typeof window.Store !== 'undefined' && window.Store.Contact) {
            for (var tJid of tracked) {
                var c = window.Store.Contact.get(tJid);
                if (c && c.lid && c.lid._serialized === lid) {
                    return tJid;
                }
            }
        }

    } catch (e) {
        console.error("Error resolving LID:", e);
    }
    return null;
}

async function handlePresenceUpdate(jid, status, lastSeen) {
    // Prevent duplicate consecutive logs
    var lastStatus = getLastKnownStatus(jid);
    var timestamp = Date.now();



    // If status changed or it's been a long time (e.g. 1 hour)
    if (lastStatus.status !== status || (timestamp - lastStatus.timestamp > 3600000)) {

        var userName = jid;
        // Try to get a real name
        if (window.getContactName) {
            userName = await window.getContactName(jid) || jid;
        } else if (window.getDisplayNameForJID) {
            userName = await window.getDisplayNameForJID(jid) || jid;
        }

        // Fallback to WPP if name not found and WPP is available
        if ((!userName || userName === jid) && typeof getDisplayNameFromWPP === 'function') {
            var wppName = await getDisplayNameFromWPP(jid);
            if (wppName) userName = wppName;
        }

        // Calculate duration since last update (if status changed)
        // usage: Online -> Offline (duration is how long they were online)
        // duration is in ms
        var duration = null;
        if (lastStatus.timestamp > 0) {
            duration = timestamp - lastStatus.timestamp;
        }

        var metadata = {};
        if (duration) {
            metadata.duration = duration;
            metadata.previousStatus = lastStatus.status;
        }
        if (lastSeen) {
            metadata.lastSeen = lastSeen;
        }

        storeOnlineStatusLog(jid, status, timestamp, metadata, userName);
        updateLastKnownStatus(jid, status, timestamp);
    } else {

    }
}

function storeOnlineStatusLog(jid, status, timestamp, metadata, userName) {

    var logEntry = {
        id: Date.now() + Math.random().toString(36).substr(2, 5),
        jid: jid,
        userName: userName || jid,
        status: status,
        timestamp: timestamp || Date.now(),
        metadata: metadata
    };

    // Save to localStorage
    fallbackToLocalStorageOnlineLogs(logEntry);
}

// Storage for "Last Known Status" to prevent identical consecutive logs
var lastKnownStatuses = {};

function getLastKnownStatus(jid) {
    return lastKnownStatuses[jid] || { status: 'unknown', timestamp: 0 };
}

function updateLastKnownStatus(jid, status, timestamp) {
    lastKnownStatuses[jid] = {
        status: status,
        timestamp: timestamp
    };
}

// LocalStorage helpers for Online Logs
function fallbackToLocalStorageOnlineLogs(logEntry) {
    try {
        var logs = JSON.parse(localStorage.getItem('WAIncognitoOnlineLogs')) || [];
        logs.push(logEntry);

        // Keep only last 2000 logs to prevent storage overflow
        if (logs.length > 2000) {
            logs = logs.slice(logs.length - 2000);
        }

        localStorage.setItem('WAIncognitoOnlineLogs', JSON.stringify(logs));
    } catch (e) {
        console.error("Error saving online log to localStorage:", e);
    }
}

// Tracked Users Management
function getTrackedUsers() {
    try {
        return JSON.parse(localStorage.getItem('WAIncognitoTrackedUsers')) || [];
    } catch (e) {
        return [];
    }
}

function isTrackedUser(jid) {
    if (!jid) return false;
    return !!getCanonicalTrackedJID(jid);
}

function getCanonicalTrackedJID(jid) {
    if (!jid) return null;
    var tracked = getTrackedUsers();
    var userPart = jid.split('@')[0].split(':')[0];

    // Find the matching tracked JID
    return tracked.find(t => {
        var tPart = t.split('@')[0].split(':')[0];
        return tPart === userPart;
    });
}

function addTrackedUser(jid) {
    var tracked = getTrackedUsers();
    if (!tracked.includes(jid)) {
        tracked.push(jid);
        localStorage.setItem('WAIncognitoTrackedUsers', JSON.stringify(tracked));
        console.log("Started tracking:", jid);

        // Log visual confirmation
        storeOnlineStatusLog(jid, "system", Date.now(), null, "Started Tracking");

        // Subscribe to presence updates
        subscribeToPresence(jid);
    }
}

function subscribeToPresence(jid) {
    try {
        // 1. Try internal API
        if (window.WhatsAppAPI && window.WhatsAppAPI.Communication && window.WhatsAppAPI.Communication.subscribePresence) {
            window.WhatsAppAPI.Communication.subscribePresence(jid);
            if (typeof WAdebugMode !== 'undefined' && WAdebugMode) {
                console.log("[OnlineTracker] Subscribed to presence using Internal API:", jid);
            }
            return;
        }

        // 2. Try WPP Connect
        if (typeof WPP !== 'undefined' && WPP.chat && WPP.chat.openChatBottom) {
            // WPP doesn't have a direct "subscribe" but opening chat usually triggers it. 
            // However, strictly speaking, just ensuring we have the chat object might work.
            // Or we can try WPP.chat.get(jid)
            // WPP.chat.get might be sync or async depending on version
            Promise.resolve(WPP.chat.get(jid)).then((chat) => {
                if (typeof WAdebugMode !== 'undefined' && WAdebugMode) console.log("[OnlineTracker] Refreshed WPP chat for presence:", jid);
            }).catch(e => {
                // Ignore errors if chat not found
            });
        }

    } catch (e) {
        console.error("[OnlineTracker] Error subscribing to presence:", e);
    }
}

function refreshPresences() {
    var tracked = getTrackedUsers();
    if (tracked.length > 0) {
        if (typeof WAdebugMode !== 'undefined' && WAdebugMode) console.log("[OnlineTracker] Refreshing presence subscriptions for", tracked.length, "users");
        tracked.forEach(subscribeToPresence);
    }
}

function removeTrackedUser(jid) {
    var tracked = getTrackedUsers();
    var index = tracked.indexOf(jid);
    if (index > -1) {
        tracked.splice(index, 1);
        localStorage.setItem('WAIncognitoTrackedUsers', JSON.stringify(tracked));
        console.log("Stopped tracking:", jid);
    }
}

function getLogs() {
    try {
        return JSON.parse(localStorage.getItem('WAIncognitoOnlineLogs')) || [];
    } catch (e) {
        return [];
    }
}

function clearLogs() {
    localStorage.removeItem('WAIncognitoOnlineLogs');
}

function deleteLog(logId) {
    try {
        var logs = getLogs();
        var initialLength = logs.length;
        // The id is stored as string in generation but might need loose comparison or string conversion
        logs = logs.filter(l => l.id != logId);

        if (logs.length < initialLength) {
            localStorage.setItem('WAIncognitoOnlineLogs', JSON.stringify(logs));
            return true;
        }
        return false;
    } catch (e) {
        console.error("Error deleting log:", e);
        return false;
    }
}


// -----------------------------------------------------------------------------
// Tracker Gap Detection
// -----------------------------------------------------------------------------
function initializeTrackerConnection() {
    // Generate a session ID for this tracker instance
    var sessionId = Date.now();

    // Update heartbeat every 5 seconds
    setInterval(function () {
        var now = Date.now();
        localStorage.setItem('WAIncognitoTrackerHeartbeat', now);

        // Also refresh presences periodically (every 10 seconds - every 2nd tick)
        if (now % 10000 < 5000) {
            refreshPresences();
        }
    }, 5000);

    // Check for gaps on startup
    var lastHeartbeat = parseInt(localStorage.getItem('WAIncognitoTrackerHeartbeat'));
    if (lastHeartbeat) {
        var diff = Date.now() - lastHeartbeat;
        // If gap > 30 seconds, log a "CDC Gap" event
        if (diff > 30000) {
            console.log("Tracker Gap detected:", diff, "ms");
            console.log("Tracker Gap detected:", diff, "ms");
            storeOnlineStatusLog("SYSTEM", "gap", lastHeartbeat, { duration: diff }, "Tracker Offline");
        }
    }
}

// -----------------------------------------------------------------------------
// Stay Online Functionality
// -----------------------------------------------------------------------------

function startStayOnline() {
    // Clear any existing interval
    if (stayOnlineInterval) {
        clearInterval(stayOnlineInterval);
    }

    // Send initial presence update
    sendPresenceUpdate();

    // Send presence updates every 15 seconds
    stayOnlineInterval = setInterval(function () {
        sendPresenceUpdate();
    }, 15000);
}

function stopPresenceUpdates() {
    if (stayOnlineInterval) {
        clearInterval(stayOnlineInterval);
        stayOnlineInterval = null;
    }
}

function sendPresenceUpdate(retryCount = 0) {
    try {
        // Try using WPPConnect first (more stable API)
        if (typeof WPP !== 'undefined' && WPP.chat && WPP.chat.sendPresence) {
            WPP.chat.sendPresence('available');
            if (typeof WAdebugMode !== 'undefined' && WAdebugMode) {
                console.log("[Stay Online] Sent presence update via WPP");
            }
            return;
        }

        // Fallback to internal WhatsApp API
        if (window.WhatsAppAPI && window.WhatsAppAPI.sendPresenceStatusProtocol) {
            // Send available presence status
            window.WhatsAppAPI.sendPresenceStatusProtocol({ name: "", status: "available" });

            if (typeof WAdebugMode !== 'undefined' && WAdebugMode) {
                console.log("[Stay Online] Sent presence update via WhatsAppAPI");
            }
        } else {
            if (retryCount < 5) {
                // Retry a few times if API is not yet ready
                setTimeout(function () {
                    sendPresenceUpdate(retryCount + 1);
                }, 2000);
            } else {
                console.warn("[Stay Online] WhatsApp API not available for presence updates after retries.");
            }
        }
    } catch (error) {
        console.error("[Stay Online] Error sending presence update:", error);
    }
}

// Start the tracker
if (typeof onlineTrackerEnabled !== 'undefined' && onlineTrackerEnabled) {
    initializeTrackerConnection();
}

// Expose functions globally for interception.js to call
window.checkForOnlinePresence = checkForOnlinePresence;
window.startStayOnline = startStayOnline;
window.stopPresenceUpdates = stopPresenceUpdates;
