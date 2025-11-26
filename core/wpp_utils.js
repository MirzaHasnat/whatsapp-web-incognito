// WPP Utility Functions
// Utility functions to safely access WPP library features

/**
 * Safely gets contact information using WPP library
 * @param {string} jid - The JID of the contact
 * @returns {Promise<Object|null>} Contact information or null if not found
 */
async function getWPPContact(jid) {
    try {
        // Check if WPP is available
        if (typeof WPP === 'undefined' || !WPP.contact) {
            if (WAdebugMode) {
                console.log("[WPP Utils] WPP library not available for contact lookup");
            }
            return null;
        }

        // Try to get contact info using WPP library
        const contact = await WPP.contact.get(jid).catch(() => null);
        if (contact) {
            if (WAdebugMode) {
                console.log("[WPP Utils] Found contact via WPP:", contact);
            }
            return contact;
        }

        return null;
    } catch (error) {
        if (WAdebugMode) {
            console.log("[WPP Utils] Error getting WPP contact:", error);
        }
        return null;
    }
}

/**
 * Safely gets chat information using WPP library
 * @param {string} jid - The JID of the chat
 * @returns {Promise<Object|null>} Chat information or null if not found
 */
async function getWPPChat(jid) {
    try {
        // Check if WPP is available
        if (typeof WPP === 'undefined' || !WPP.chat) {
            if (WAdebugMode) {
                console.log("[WPP Utils] WPP library not available for chat lookup");
            }
            return null;
        }

        // Try to get chat info using WPP library
        const chat = await WPP.chat.get(jid).catch(() => null);
        if (chat) {
            if (WAdebugMode) {
                console.log("[WPP Utils] Found chat via WPP:", chat);
            }
            return chat;
        }

        return null;
    } catch (error) {
        if (WAdebugMode) {
            console.log("[WPP Utils] Error getting WPP chat:", error);
        }
        return null;
    }
}

/**
 * Gets display name for a JID using WPP library
 * @param {string} jid - The JID to get display name for
 * @returns {Promise<string|null>} Display name or null if not found
 */
async function getDisplayNameFromWPP(jid) {
    try {
        // Try to get contact info first
        const contact = await getWPPContact(jid);
        if (contact) {
            // Try multiple name properties in order of preference
            const nameProperties = ['displayName', 'name', 'formattedName', 'pushname', 'shortName'];
            for (const prop of nameProperties) {
                if (contact[prop] && contact[prop].trim() !== '') {
                    if (WAdebugMode) {
                        console.log("[WPP Utils] Using WPP contact " + prop + ": " + contact[prop]);
                    }
                    return contact[prop];
                }
            }
        }

        // If contact didn't work, try chat
        const chat = await getWPPChat(jid);
        if (chat) {
            // Try chat name properties
            const chatNameProperties = ['name', 'formattedTitle', 'title'];
            for (const prop of chatNameProperties) {
                if (chat[prop] && chat[prop].trim() !== '') {
                    if (WAdebugMode) {
                        console.log("[WPP Utils] Using WPP chat " + prop + ": " + chat[prop]);
                    }
                    return chat[prop];
                }
            }
        }

        return null;
    } catch (error) {
        if (WAdebugMode) {
            console.log("[WPP Utils] Error getting display name from WPP:", error);
        }
        return null;
    }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getWPPContact,
        getWPPChat,
        getDisplayNameFromWPP
    };
}