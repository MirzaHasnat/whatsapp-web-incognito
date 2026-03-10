// ---------------------
// UI Event handlers
// ---------------------

// Function to create and inject the activity logs button
function injectActivityLogsButton() {
    console.log('[WAIncognito] Attempting to inject activity logs button');
    
    // Check if button already exists
    if (document.getElementById('whatsapp-activity-logs-button')) {
        console.log('[WAIncognito] Activity logs button already exists');
        return;
    }
    
    // Check if the function is available
    if (typeof window.showWhatsAppActivityLogs === 'function') {
        console.log('[WAIncognito] showWhatsAppActivityLogs function is available');
    } else {
        console.log('[WAIncognito] showWhatsAppActivityLogs function is NOT available yet');
    }
    
    // Create the floating button
    var button = document.createElement('div');
    button.id = 'whatsapp-activity-logs-button';
    button.title = 'View Activity Logs';
    
    // Add click handler
    button.addEventListener('click', function() {
        console.log('[WAIncognito] Activity logs button clicked');
        // Call the function that exists in the main world context
        // Add a retry mechanism in case the function isn't available immediately
        callShowWhatsAppActivityLogs();
    });
    
    // Create icon inside button (using emoji for simplicity)
    var icon = document.createElement('div');
    icon.innerHTML = '📝';
    icon.style.cssText = `
        font-size: 24px;
        color: white;
    `;
    
    // Add badge to differentiate it from the main button
    var badge = document.createElement('div');
    badge.id = 'whatsapp-activity-logs-button-badge';
    badge.textContent = '!';
    
    button.appendChild(icon);
    button.appendChild(badge);
    
    // Add to document
    document.body.appendChild(button);
    console.log('[WAIncognito] Activity logs button injected successfully');
}

// Function to call showWhatsAppActivityLogs with retry mechanism
function callShowWhatsAppActivityLogs() {
    console.log('[WAIncognito] Checking for showWhatsAppActivityLogs function');
    if (typeof window.showWhatsAppActivityLogs === 'function') {
        console.log('[WAIncognito] showWhatsAppActivityLogs function found, calling it');
        window.showWhatsAppActivityLogs();
    } else {
        console.log('[WAIncognito] showWhatsAppActivityLogs function not found, retrying...');
        // Try again after a short delay (in case interception.js is still loading)
        setTimeout(function() {
            console.log('[WAIncognito] Retrying showWhatsAppActivityLogs (attempt 2)');
            if (typeof window.showWhatsAppActivityLogs === 'function') {
                console.log('[WAIncognito] showWhatsAppActivityLogs function found on retry, calling it');
                window.showWhatsAppActivityLogs();
            } else {
                // Try one more time with a longer delay
                setTimeout(function() {
                    console.log('[WAIncognito] Retrying showWhatsAppActivityLogs (attempt 3)');
                    if (typeof window.showWhatsAppActivityLogs === 'function') {
                        console.log('[WAIncognito] showWhatsAppActivityLogs function found on second retry, calling it');
                        window.showWhatsAppActivityLogs();
                    } else {
                        console.log('[WAIncognito] showWhatsAppActivityLogs function still not available');
                        // Show error if function is still not available
                        alert('Activity logs function is not available. Please refresh the page.');
                    }
                }, 2000);
            }
        }, 1000);
    }
}

// Function to create and inject the view-once messages button
function injectViewOnceButton() {
    console.log('[WAIncognito] Attempting to inject view-once messages button');
    
    // Check if button already exists
    if (document.getElementById('whatsapp-viewonce-button')) {
        console.log('[WAIncognito] View-once messages button already exists');
        return;
    }
    
    // Create the floating button for view-once messages
    var button = document.createElement('div');
    button.id = 'whatsapp-viewonce-button';
    button.title = 'View View-Once Messages';
    
    // Add click handler
    button.addEventListener('click', function() {
        console.log('[WAIncognito] View-once messages button clicked');
        showViewOnceMessages();
    });
    
    // Create icon inside button
    var icon = document.createElement('div');
    icon.innerHTML = '👁️';
    icon.style.cssText = `
        font-size: 24px;
        color: white;
    `;
    
    // Add badge for view-once messages
    var badge = document.createElement('div');
    badge.id = 'whatsapp-viewonce-button-badge';
    badge.textContent = '0';
    
    button.appendChild(icon);
    button.appendChild(badge);
    
    // Add to document
    document.body.appendChild(button);
    console.log('[WAIncognito] View-once messages button injected successfully');
    
    // Update badge count periodically
    updateViewOnceBadgeCount();
    setInterval(updateViewOnceBadgeCount, 30000); // Update every 30 seconds
}

// Function to update the view-once badge count
function updateViewOnceBadgeCount() {
    var viewOnceDBOpenRequest = indexedDB.open("viewOnce", 3);
    viewOnceDBOpenRequest.onsuccess = function () {
        var viewOnceDB = viewOnceDBOpenRequest.result;
        var countRequest = viewOnceDB.transaction('msgs', "readonly").objectStore("msgs").count();
        countRequest.onsuccess = function() {
            var count = countRequest.result;
            var badge = document.getElementById('whatsapp-viewonce-button-badge');
            if (badge) {
                badge.textContent = count > 99 ? '99+' : count.toString();
                // Hide badge if count is 0
                badge.style.display = count > 0 ? 'block' : 'none';
            }
        };
    };
    viewOnceDBOpenRequest.onerror = function (e) {
        console.error("WhatsIncognito: Error opening viewOnce database for badge count", e);
    };
}

// Function to show view-once messages in a modal
function showViewOnceMessages() {
    console.log('[WAIncognito] Showing view-once messages');
    
    // Create modal container
    var modal = document.createElement('div');
    modal.id = 'whatsapp-viewonce-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        z-index: 10000;
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    `;
    
    // Create modal content
    var modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background-color: #ffffff;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        width: 95%;
        max-width: 1100px;
        max-height: 90vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        animation: modalFadeIn 0.3s ease-out;
    `;
    
    // Add fade-in animation
    var style = document.createElement('style');
    style.textContent = `
        @keyframes modalFadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        #whatsapp-viewonce-modal ::-webkit-scrollbar {
            width: 8px;
        }
        
        #whatsapp-viewonce-modal ::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
        }
        
        #whatsapp-viewonce-modal ::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 4px;
        }
        
        #whatsapp-viewonce-modal ::-webkit-scrollbar-thumb:hover {
            background: #a1a1a1;
        }
        
        .viewonce-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 16px;
            padding: 16px;
        }
        
        .viewonce-item {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
            background: #f9f9f9;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .viewonce-item:hover {
            transform: translateY(-4px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .viewonce-item img, .viewonce-item video, .viewonce-item audio {
            width: 100%;
            max-height: 150px;
            object-fit: cover;
        }
        
        .viewonce-info {
            padding: 12px;
            font-size: 12px;
            color: #666;
        }
        
        .viewonce-caption {
            margin-top: 8px;
            font-size: 11px;
            color: #333;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    `;
    document.head.appendChild(style);
    
    // Create header
    var header = document.createElement('div');
    header.style.cssText = `
        padding: 20px 24px;
        background: linear-gradient(135deg, #008069, #005c4b);
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    `;
    
    var title = document.createElement('h2');
    title.textContent = 'View-Once Messages';
    title.style.cssText = `
        margin: 0;
        font-size: 20px;
        font-weight: 600;
    `;
    
    var closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        font-size: 28px;
        cursor: pointer;
        padding: 0;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.2s;
    `;
    
    closeButton.onmouseover = function() {
        this.style.background = 'rgba(255, 255, 255, 0.3)';
    };
    
    closeButton.onmouseout = function() {
        this.style.background = 'rgba(255, 255, 255, 0.2)';
    };
    
    closeButton.onclick = function() {
        document.body.removeChild(modal);
        if (style.parentNode) {
            style.parentNode.removeChild(style);
        }
    };
    
    header.appendChild(title);
    header.appendChild(closeButton);
    
    // Create toolbar
    var toolbar = document.createElement('div');
    toolbar.style.cssText = `
        padding: 16px 24px;
        background-color: #f0f2f5;
        border-bottom: 1px solid #e0e0e0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    
    var toolbarLeft = document.createElement('div');
    var refreshButton = document.createElement('button');
    refreshButton.textContent = 'Refresh';
    refreshButton.style.cssText = `
        background-color: #008069;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        font-size: 14px;
        transition: background 0.2s;
        box-shadow: 0 2px 4px rgba(0, 128, 105, 0.2);
    `;
    
    refreshButton.onmouseover = function() {
        this.style.background = '#006a52';
    };
    
    refreshButton.onmouseout = function() {
        this.style.background = '#008069';
    };
    
    refreshButton.onclick = function() {
        loadViewOnceMessages(gridContainer);
    };
    
    toolbarLeft.appendChild(refreshButton);
    
    var toolbarRight = document.createElement('div');
    var clearButton = document.createElement('button');
    clearButton.textContent = 'Clear All';
    clearButton.style.cssText = `
        background-color: #dc3545;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        font-size: 14px;
        transition: background 0.2s;
        box-shadow: 0 2px 4px rgba(220, 53, 69, 0.2);
    `;
    
    clearButton.onmouseover = function() {
        this.style.background = '#c82333';
    };
    
    clearButton.onmouseout = function() {
        this.style.background = '#dc3545';
    };
    
    clearButton.onclick = function() {
        if (confirm('Are you sure you want to clear all view-once messages? This action cannot be undone.')) {
            clearViewOnceMessages(function() {
                loadViewOnceMessages(gridContainer);
                updateViewOnceBadgeCount();
            });
        }
    };
    
    toolbarRight.appendChild(clearButton);
    
    toolbar.appendChild(toolbarLeft);
    toolbar.appendChild(toolbarRight);
    
    // Create content area
    var content = document.createElement('div');
    content.id = 'viewonce-content';
    content.style.cssText = `
        padding: 0 24px;
        overflow-y: auto;
        flex-grow: 1;
        max-height: calc(90vh - 180px);
    `;
    
    // Create grid container
    var gridContainer = document.createElement('div');
    gridContainer.id = 'viewonce-grid-container';
    gridContainer.className = 'viewonce-grid';
    
    // Create loading message
    var loading = document.createElement('div');
    loading.id = 'viewonce-loading';
    loading.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 200px;">
            <div style="text-align: center;">
                <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #008069; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                <p style="margin-top: 15px; color: #666;">Loading view-once messages...</p>
            </div>
        </div>
    `;
    
    // Add spinner animation
    var spinnerStyle = document.createElement('style');
    spinnerStyle.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(spinnerStyle);
    
    gridContainer.appendChild(loading);
    content.appendChild(gridContainer);
    
    // Assemble modal
    modalContent.appendChild(header);
    modalContent.appendChild(toolbar);
    modalContent.appendChild(content);
    modal.appendChild(modalContent);
    
    // Add to document
    document.body.appendChild(modal);
    
    // Load view-once messages
    loadViewOnceMessages(gridContainer);
}

// Function to load view-once messages
function loadViewOnceMessages(container) {
    // Clear container
    container.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 200px;">
            <div style="text-align: center;">
                <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #008069; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                <p style="margin-top: 15px; color: #666;">Loading view-once messages...</p>
            </div>
        </div>
    `;
    
    var viewOnceDBOpenRequest = indexedDB.open("viewOnce", 3);
    viewOnceDBOpenRequest.onsuccess = function () {
        var viewOnceDB = viewOnceDBOpenRequest.result;
        var getAllRequest = viewOnceDB.transaction('msgs', "readonly").objectStore("msgs").getAll();
        getAllRequest.onsuccess = function() {
            var messages = getAllRequest.result;
            displayViewOnceMessages(container, messages);
        };
        getAllRequest.onerror = function(e) {
            console.error("Error loading view-once messages:", e);
            container.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 200px;">
                    <div style="text-align: center; color: #dc3545;">
                        <h3>Error loading view-once messages</h3>
                        <p>Please try refreshing the page</p>
                    </div>
                </div>
            `;
        };
    };
    viewOnceDBOpenRequest.onerror = function (e) {
        console.error("Error opening viewOnce database:", e);
        container.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 200px;">
                <div style="text-align: center; color: #dc3545;">
                    <h3>Error accessing view-once database</h3>
                    <p>Please try refreshing the page</p>
                </div>
            </div>
        `;
    };
}

// Function to display view-once messages
function displayViewOnceMessages(container, messages) {
    if (messages.length === 0) {
        container.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 200px; grid-column: 1 / -1;">
                <div style="text-align: center; color: #667781;">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" style="fill: #d1d7db; margin-bottom: 16px;">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <h3 style="margin: 0 0 8px; font-weight: 500; color: #54656f;">No View-Once Messages</h3>
                    <p style="margin: 0; font-size: 14px;">View-once messages you receive will appear here</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Sort messages by timestamp (newest first)
    messages.sort((a, b) => b.timestamp - a.timestamp);
    
    var html = '';
    messages.forEach(function(msg) {
        var date = new Date(msg.timestamp);
        var formattedDate = date.toLocaleString();
        var fileName = msg.caption || 'View-Once Message';
        
        html += `
            <div class="viewonce-item" data-id="${msg.id}">
                <div style="position: relative;">`;
        
        if (msg.dataURI.startsWith("data:image")) {
            html += `<img src="${msg.dataURI}" alt="${fileName}" />`;
        } else if (msg.dataURI.startsWith("data:video")) {
            html += `<video src="${msg.dataURI}" />`;
        } else if (msg.dataURI.startsWith("data:audio")) {
            html += `<audio src="${msg.dataURI}" controls style="width: 100%; margin: 10px;" />`;
        } else {
            // Generic file representation
            html += `
                <div style="height: 150px; display: flex; align-items: center; justify-content: center; background: #e0e0e0;">
                    <div style="text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 10px;">📄</div>
                        <div>${msg.type.toUpperCase()}</div>
                    </div>
                </div>`;
        }
        
        html += `
                </div>
                <div class="viewonce-info">
                    <div style="font-weight: 500;">${fileName}</div>
                    <div style="margin-top: 4px; font-size: 11px;">${formattedDate}</div>`;
        
        if (msg.caption) {
            html += `<div class="viewonce-caption">${msg.caption}</div>`;
        }
        
        html += `
                    <div style="margin-top: 8px;">
                        <button onclick="downloadViewOnceMessage('${msg.id}')" style="
                            background: #008069;
                            color: white;
                            border: none;
                            padding: 4px 8px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 11px;
                        ">Download</button>
                    </div>
                </div>
            </div>`;
    });
    
    container.innerHTML = html;
}

// Function to download a view-once message
window.downloadViewOnceMessage = function(messageId) {
    var viewOnceDBOpenRequest = indexedDB.open("viewOnce", 3);
    viewOnceDBOpenRequest.onsuccess = function () {
        var viewOnceDB = viewOnceDBOpenRequest.result;
        var getRequest = viewOnceDB.transaction('msgs', "readonly").objectStore("msgs").get(messageId);
        getRequest.onsuccess = function() {
            var msg = getRequest.result;
            if (msg) {
                var link = document.createElement('a');
                link.href = msg.dataURI;
                
                // Determine file extension based on MIME type
                var extension = 'file';
                if (msg.mimetype) {
                    if (msg.mimetype.includes('image')) extension = 'jpg';
                    else if (msg.mimetype.includes('video')) extension = 'mp4';
                    else if (msg.mimetype.includes('audio')) extension = 'mp3';
                }
                
                var fileName = msg.caption || 'viewonce_' + messageId;
                if (!fileName.endsWith('.' + extension)) {
                    fileName += '.' + extension;
                }
                
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        };
    };
};

// Function to clear all view-once messages
function clearViewOnceMessages(callback) {
    var viewOnceDBOpenRequest = indexedDB.open("viewOnce", 3);
    viewOnceDBOpenRequest.onsuccess = function () {
        var viewOnceDB = viewOnceDBOpenRequest.result;
        var clearRequest = viewOnceDB.transaction('msgs', "readwrite").objectStore("msgs").clear();
        clearRequest.onsuccess = function() {
            console.log('[WAIncognito] Cleared all view-once messages');
            if (callback) callback();
        };
        clearRequest.onerror = function(e) {
            console.error("Error clearing view-once messages:", e);
            if (callback) callback();
        };
    };
    viewOnceDBOpenRequest.onerror = function (e) {
        console.error("Error opening viewOnce database for clearing:", e);
        if (callback) callback();
    };
}

// ---------------------
// Deleted Messages Button & Modal
// ---------------------

function injectDeletedMessagesButton() {
    console.log('[WAIncognito] Attempting to inject deleted messages button');
    if (document.getElementById('whatsapp-deleted-msgs-button')) return;

    // Use fully inline styles — styles.css is a content-script file and
    // may NOT apply to elements injected from the page world script.
    var button = document.createElement('div');
    button.id = 'whatsapp-deleted-msgs-button';
    button.title = 'View Deleted Messages';
    button.style.cssText = [
        'position: fixed',
        'bottom: 210px',
        'right: 20px',
        'width: 50px',
        'height: 50px',
        'background-color: #c0392b',
        'border-radius: 50%',
        'cursor: pointer',
        'z-index: 2147483647',
        'display: flex',
        'justify-content: center',
        'align-items: center',
        'box-shadow: 0 2px 10px rgba(0,0,0,0.35)',
        'transition: background-color 0.2s, transform 0.2s',
        'user-select: none',
    ].join('; ');

    button.addEventListener('mouseenter', function () {
        button.style.backgroundColor = '#a93226';
        button.style.transform = 'scale(1.08)';
    });
    button.addEventListener('mouseleave', function () {
        button.style.backgroundColor = '#c0392b';
        button.style.transform = 'scale(1)';
    });
    button.addEventListener('click', function () {
        showDeletedMessagesModal();
    });

    var icon = document.createElement('div');
    icon.innerHTML = '🗑️';
    icon.style.cssText = 'font-size: 22px; color: white; line-height: 1; pointer-events: none;';

    var badge = document.createElement('div');
    badge.id = 'whatsapp-deleted-msgs-button-badge';
    badge.textContent = '0';
    badge.style.cssText = [
        'position: absolute',
        'top: -5px',
        'right: -5px',
        'min-width: 20px',
        'height: 20px',
        'background-color: #e67e22',
        'border-radius: 10px',
        'display: none',
        'justify-content: center',
        'align-items: center',
        'font-size: 11px',
        'color: white',
        'font-weight: bold',
        'padding: 0 4px',
        'font-family: sans-serif',
        'pointer-events: none',
    ].join('; ');

    button.appendChild(icon);
    button.appendChild(badge);
    document.body.appendChild(button);

    updateDeletedMsgsBadgeCount();
    setInterval(updateDeletedMsgsBadgeCount, 30000);
    console.log('[WAIncognito] Deleted messages button injected successfully');
}

function updateDeletedMsgsBadgeCount() {
    var req = indexedDB.open('deletedMsgs', 2);
    req.onsuccess = function () {
        var db = req.result;
        try {
            var countReq = db.transaction('msgs', 'readonly').objectStore('msgs').count();
            countReq.onsuccess = function () {
                var count = countReq.result;
                var badge = document.getElementById('whatsapp-deleted-msgs-button-badge');
                if (badge) {
                    badge.textContent = count > 99 ? '99+' : count.toString();
                    badge.style.display = count > 0 ? 'flex' : 'none';
                }
            };
        } catch (e) { /* store may not exist yet */ }
    };
}

function resolveDisplayName(jid) {
    if (!jid) return 'Unknown';
    try {
        if (window.WPP) {
            var isLid = jid.endsWith('@lid');

            // Strategy 1: Direct ContactStore lookup (works for @s.whatsapp.net, @c.us)
            if (!isLid && window.WPP.whatsapp && window.WPP.whatsapp.ContactStore) {
                var model = window.WPP.whatsapp.ContactStore.get(jid);
                if (model) {
                    var n = model.name || model.pushname || model.verifiedName || model.formattedUser;
                    if (n && n !== jid) return n;
                }
            }

            // Strategy 2: WPP.contact.get (works for @s.whatsapp.net, @c.us)
            if (!isLid && window.WPP.contact && typeof window.WPP.contact.get === 'function') {
                var c = window.WPP.contact.get(jid);
                if (c) {
                    var n = c.name || c.pushname || c.verifiedName || c.formattedUser;
                    if (n && n !== jid) return n;
                }
            }

            // Strategy 3: @lid — scan ChatStore for a chat whose contact LID matches
            if (isLid && window.WPP.whatsapp && window.WPP.whatsapp.ChatStore) {
                var lidNum = jid.split('@')[0].split(':')[0];
                try {
                    // Try direct lookup first (works in some WA versions)
                    var cm = window.WPP.whatsapp.ChatStore.get(jid);
                    if (cm) {
                        var n = cm.name || cm.formattedTitle;
                        if (n) return n;
                    }
                } catch(e) {}
                try {
                    var allChats = window.WPP.whatsapp.ChatStore.getAll
                        ? window.WPP.whatsapp.ChatStore.getAll()
                        : (window.WPP.whatsapp.ChatStore.models || []);
                    for (var i = 0; i < allChats.length; i++) {
                        var wc = allChats[i];
                        var wcLid = (wc.contact && wc.contact.lid) ? wc.contact.lid.toString() : '';
                        if (wcLid.includes(lidNum)) {
                            return wc.name || wc.formattedTitle ||
                                (wc.contact && (wc.contact.name || wc.contact.pushname)) ||
                                '+' + lidNum;
                        }
                    }
                } catch(e) {}
            }

            // Strategy 4: @lid — scan ContactStore for matching LID
            if (isLid && window.WPP.whatsapp && window.WPP.whatsapp.ContactStore) {
                var lidNum = jid.split('@')[0].split(':')[0];
                try {
                    var allContacts = window.WPP.whatsapp.ContactStore.getAll
                        ? window.WPP.whatsapp.ContactStore.getAll()
                        : (window.WPP.whatsapp.ContactStore.models || []);
                    for (var i = 0; i < allContacts.length; i++) {
                        var contact = allContacts[i];
                        var cLid = contact.lid ? contact.lid.toString() : '';
                        if (cLid.includes(lidNum)) {
                            var n = contact.name || contact.pushname || contact.verifiedName || contact.formattedUser;
                            if (n) return n;
                        }
                    }
                } catch(e) {}
            }

            // Strategy 5: Group chats — try ChatStore/WPP.chat.get
            if (jid.endsWith('@g.us')) {
                if (window.WPP.chat && typeof window.WPP.chat.get === 'function') {
                    try {
                        var chat = window.WPP.chat.get(jid);
                        if (chat) { var n = chat.name || chat.formattedTitle; if (n) return n; }
                    } catch(e) {}
                }
                if (window.WPP.whatsapp && window.WPP.whatsapp.ChatStore) {
                    try {
                        var chatModel = window.WPP.whatsapp.ChatStore.get(jid);
                        if (chatModel) { var n = chatModel.name || chatModel.formattedTitle; if (n) return n; }
                    } catch(e) {}
                }
            }
        }
    } catch (e) {}

    // Final fallback: format as phone number or return number part
    var user = jid.split('@')[0].split(':')[0];
    if (/^\d+$/.test(user)) return '+' + user;
    return user;
}


function showDeletedMessagesModal() {
    if (document.getElementById('wa-deleted-msgs-modal')) return;

    // ---- STYLES ----
    var style = document.createElement('style');
    style.id = 'wa-deleted-msgs-style';
    style.textContent = `
        @keyframes waDMfadeIn { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:scale(1)} }
        @keyframes waDMspin   { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }

        /* ── Global reset for the modal — prevents WhatsApp global CSS from bleeding in ── */
        #wa-deleted-msgs-box, #wa-deleted-msgs-box * {
            box-sizing:border-box;
            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
            color:#111b21;
            -webkit-font-smoothing:antialiased;
            line-height:normal;
        }
        #wa-deleted-msgs-box button { cursor:pointer; }
        #wa-deleted-msgs-box input, #wa-deleted-msgs-box select { font-family:inherit; }
        #wa-deleted-msgs-box a { text-decoration:none; }
        /* Force media elements to always be visible — WhatsApp global CSS hides them */
        #wa-deleted-msgs-box audio,
        #wa-deleted-msgs-box video,
        #wa-deleted-msgs-box img {
            display:block !important;
            visibility:visible !important;
            opacity:1 !important;
        }

        #wa-deleted-msgs-modal {
            position:fixed;top:0;left:0;width:100%;height:100%;
            background:rgba(0,0,0,0.68);z-index:99999;
            display:flex;justify-content:center;align-items:center;
            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
        }
        #wa-deleted-msgs-box {
            background:#f0f2f5;border-radius:14px;
            box-shadow:0 20px 60px rgba(0,0,0,0.4);
            width:96%;max-width:1080px;height:88vh;
            overflow:hidden;display:flex;flex-direction:column;
            animation:waDMfadeIn .22s ease-out;
        }
        /* ── Top bar ── */
        .wadm-topbar {
            background:#128c7e;color:#fff !important;
            padding:0 20px;height:56px;
            display:flex;align-items:center;justify-content:space-between;flex-shrink:0;
        }
        .wadm-topbar-title { font-size:18px;font-weight:600;color:#fff !important;display:flex;align-items:center;gap:9px; }
        .wadm-topbar-actions { display:flex;gap:8px;align-items:center; }
        .wadm-topbar-search {
            background:rgba(255,255,255,.18);border:none;border-radius:20px;
            color:#fff !important;padding:6px 14px;font-size:13px;outline:none;width:200px;
            transition:background .2s;
        }
        .wadm-topbar-search::placeholder { color:rgba(255,255,255,.75) !important; }
        .wadm-topbar-search:focus { background:rgba(255,255,255,.28); }
        .wadm-clear-btn {
            background:rgba(255,255,255,.18);border:none;border-radius:6px;
            color:#fff !important;padding:6px 12px;font-size:12px;font-weight:600;
            cursor:pointer;transition:background .2s;
        }
        .wadm-clear-btn:hover { background:rgba(255,255,255,.3); }
        .wadm-close-btn {
            background:none;border:none;color:#fff !important;font-size:24px;
            cursor:pointer;opacity:.8;line-height:1;padding:0 4px;
        }
        .wadm-close-btn:hover { opacity:1; }


        /* ── Two-panel body ── */
        .wadm-body { display:flex;flex:1;overflow:hidden; }

        /* ── LEFT SIDEBAR ── */
        .wadm-sidebar {
            width:330px;flex-shrink:0;background:#fff;
            border-right:1px solid #e9edef;
            display:flex;flex-direction:column;overflow:hidden;
        }
        .wadm-sidebar-header {
            padding:12px 16px;background:#f0f2f5;
            border-bottom:1px solid #e9edef;font-size:12px;
            color:#54656f !important;font-weight:600;text-transform:uppercase;
            letter-spacing:.5px;flex-shrink:0;
        }
        .wadm-chat-list { overflow-y:auto;flex:1; }
        .wadm-chat-item {
            display:flex;align-items:center;gap:13px;
            padding:13px 16px;cursor:pointer;
            border-bottom:1px solid #f0f2f5;
            transition:background .15s;position:relative;
        }
        .wadm-chat-item:hover { background:#f5f6f6; }
        .wadm-chat-item.active { background:#e7f3ef; }
        .wadm-chat-avatar {
            width:46px;height:46px;border-radius:50%;flex-shrink:0;
            background:#dfe5e7;display:flex;align-items:center;
            justify-content:center;font-size:20px;overflow:hidden;
        }
        .wadm-chat-info { min-width:0;flex:1; }
        .wadm-chat-name {
            font-size:15px;font-weight:500;color:#111b21 !important;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        }
        .wadm-chat-preview {
            font-size:13px;color:#667781 !important;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;
        }
        .wadm-chat-badge {
            background:#25d366;color:#fff !important;font-size:11px;font-weight:700;
            min-width:20px;height:20px;border-radius:10px;
            display:flex;align-items:center;justify-content:center;
            padding:0 5px;flex-shrink:0;
        }

        /* ── RIGHT PANEL ── */
        .wadm-msgs-panel {
            flex:1;display:flex;flex-direction:column;overflow:hidden;
            background:#efeae2;
        }
        .wadm-msgs-panel-header {
            background:#f0f2f5;padding:11px 18px;
            border-bottom:1px solid #e9edef;
            display:flex;align-items:center;gap:12px;flex-shrink:0;
        }
        .wadm-msgs-panel-avatar {
            width:38px;height:38px;border-radius:50%;
            background:#dfe5e7;display:flex;align-items:center;
            justify-content:center;font-size:18px;
        }
        .wadm-msgs-panel-name { font-size:15px;font-weight:600;color:#111b21 !important; }
        .wadm-msgs-panel-sub { font-size:12px;color:#667781 !important; }
        .wadm-msgs-list {
            flex:1;overflow-y:auto;padding:16px 60px 16px 20px;
            display:flex;flex-direction:column;gap:6px;
        }


        /* ── Chat bubbles ── */
        .wadm-bubble-wrap { display:flex;flex-direction:column;max-width:68%; }
        .wadm-bubble-wrap.outgoing { align-self:flex-end;align-items:flex-end; }
        .wadm-bubble-wrap.incoming { align-self:flex-start;align-items:flex-start; }
        .wadm-sender-name { font-size:12px;font-weight:600;color:#c0392b !important;margin-bottom:3px;padding:0 4px; }
        .wadm-bubble {
            padding:7px 12px 6px;border-radius:8px;
            box-shadow:0 1px 2px rgba(0,0,0,.12);
            font-size:14px;line-height:1.5;word-break:break-word;
            max-width:100%;position:relative;
            color:#111b21 !important;
            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif !important;
        }
        .wadm-bubble * { color:inherit; box-sizing:border-box; }
        .wadm-bubble.outgoing { background:#d9fdd3 !important;border-radius:8px 0 8px 8px;color:#111b21 !important; }
        .wadm-bubble.incoming { background:#ffffff !important;border-radius:0 8px 8px 8px;color:#111b21 !important; }
        .wadm-bubble .wadm-deleted-label {
            color:#8696a0 !important;font-style:italic;font-size:13px;
            display:flex;align-items:center;gap:5px;
        }
        .wadm-bubble-footer {
            font-size:11px;color:#667781 !important;

            margin-top:3px;text-align:right;padding:0 2px;
        }
        .wadm-bubble-del {
            position:absolute;top:-8px;right:-8px;
            width:18px;height:18px;border-radius:50%;
            background:#fff;border:1px solid #e9edef;
            color:#c0392b;font-size:11px;cursor:pointer;
            display:flex;align-items:center;justify-content:center;
            opacity:0;transition:opacity .2s;
            box-shadow:0 1px 3px rgba(0,0,0,.15);
        }
        .wadm-bubble-wrap:hover .wadm-bubble-del { opacity:1; }
        .wadm-media-img {
            max-width:240px;max-height:180px;border-radius:6px;object-fit:cover;
            cursor:pointer;display:block !important;margin-bottom:4px;
            visibility:visible !important;opacity:1 !important;
        }
        .wadm-media-audio {
            display:block !important;
            visibility:visible !important;
            opacity:1 !important;
            width:100% !important;
            min-width:200px;
            height:40px !important;
            min-height:40px !important;
            max-height:60px !important;
            margin-bottom:6px;
            border-radius:6px;
            outline:none;
            background:#f0f0f0;
        }
        .wadm-media-video {
            display:block !important;
            visibility:visible !important;
            opacity:1 !important;
            max-width:240px;border-radius:6px;margin-bottom:4px;
        }
        .wadm-media-doc {
            display:flex;align-items:center;gap:8px;
            background:#e9edef;padding:8px 10px;border-radius:6px;margin-bottom:4px;font-size:13px;
            color:#111b21 !important;
        }


        /* ── Empty / placeholder states ── */
        .wadm-no-chat-selected {
            flex:1;display:flex;flex-direction:column;
            align-items:center;justify-content:center;gap:12px;
            color:#8696a0;
        }
        .wadm-no-chat-selected svg { opacity:.6; }
        .wadm-no-chat-selected h3 { margin:0;font-size:16px;font-weight:500; }
        .wadm-empty-msgs {
            flex:1;display:flex;align-items:center;
            justify-content:center;color:#8696a0;font-size:14px;
        }
        .wadm-spinner { width:36px;height:36px;border:4px solid #e9edef;border-top-color:#128c7e;border-radius:50%;animation:waDMspin 1s linear infinite; }
        .wadm-loading { display:flex;justify-content:center;align-items:center;height:100%;flex-direction:column;gap:12px;color:#8696a0; }

        .wadm-sidebar ::-webkit-scrollbar { width:5px; }
        .wadm-sidebar ::-webkit-scrollbar-thumb { background:#c1c1c1;border-radius:3px; }
        .wadm-msgs-list  ::-webkit-scrollbar { width:5px; }
        .wadm-msgs-list  ::-webkit-scrollbar-thumb { background:#c1c1c1;border-radius:3px; }
    `;
    document.head.appendChild(style);

    // ─── SCAFFOLD ───
    var modal = document.createElement('div');
    modal.id = 'wa-deleted-msgs-modal';
    modal.addEventListener('click', function(e) { if (e.target === modal) closeDeletedMessagesModal(); });

    var box = document.createElement('div');
    box.id = 'wa-deleted-msgs-box';

    // Top bar
    var topbar = document.createElement('div');
    topbar.className = 'wadm-topbar';
    topbar.innerHTML = '<div class="wadm-topbar-title">🗑️ Deleted Messages</div>';
    var topbarActions = document.createElement('div');
    topbarActions.className = 'wadm-topbar-actions';

    var searchInput = document.createElement('input');
    searchInput.className = 'wadm-topbar-search';
    searchInput.placeholder = '🔍  Search chats or messages…';
    searchInput.type = 'text';

    var clearBtn = document.createElement('button');
    clearBtn.className = 'wadm-clear-btn';
    clearBtn.textContent = '🗑 Clear All';

    var closeBtn = document.createElement('button');
    closeBtn.className = 'wadm-close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = closeDeletedMessagesModal;

    topbarActions.appendChild(searchInput);
    topbarActions.appendChild(clearBtn);
    topbarActions.appendChild(closeBtn);
    topbar.appendChild(topbarActions);

    // Body (two panels)
    var body = document.createElement('div');
    body.className = 'wadm-body';

    // Left sidebar
    var sidebar = document.createElement('div');
    sidebar.className = 'wadm-sidebar';
    var sidebarHeader = document.createElement('div');
    sidebarHeader.className = 'wadm-sidebar-header';
    sidebarHeader.id = 'wadm-sidebar-header';
    sidebarHeader.textContent = 'Chats';
    var chatList = document.createElement('div');
    chatList.className = 'wadm-chat-list';
    chatList.id = 'wadm-chat-list';
    chatList.innerHTML = '<div class="wadm-loading"><div class="wadm-spinner"></div></div>';
    sidebar.appendChild(sidebarHeader);
    sidebar.appendChild(chatList);

    // Right panel
    var msgsPanel = document.createElement('div');
    msgsPanel.className = 'wadm-msgs-panel';
    msgsPanel.id = 'wadm-msgs-panel';
    msgsPanel.innerHTML = `
        <div class="wadm-no-chat-selected">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <h3>Select a chat to view deleted messages</h3>
        </div>`;

    body.appendChild(sidebar);
    body.appendChild(msgsPanel);

    box.appendChild(topbar);
    box.appendChild(body);
    modal.appendChild(box);
    document.body.appendChild(modal);

    // ─── DATA & STATE ───
    var allMessages = [];
    var selectedJid = null;
    var chatGroups = {};   // { jid: { name, jid, msgs[] } }
    var chatOrder = [];    // ordered jids

    function escapeHTML(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function getInitials(name) {
        var parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    }

    function avatarHTML(jid, name, size) {
        var isGroup = jid && jid.endsWith('@g.us');
        var emoji = isGroup ? '👥' : '👤';
        return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:#dfe5e7;display:flex;align-items:center;justify-content:center;font-size:' + Math.round(size * 0.45) + 'px;flex-shrink:0;">' + emoji + '</div>';
    }

    // ─── LOAD ───
    function loadMessages() {
        chatList.innerHTML = '<div class="wadm-loading"><div class="wadm-spinner"></div></div>';
        var req = indexedDB.open('deletedMsgs', 2);
        req.onerror = function () {
            chatList.innerHTML = '<div style="padding:20px;color:#c0392b;font-size:13px;">❌ Could not open database</div>';
        };
        req.onsuccess = function () {
            var db = req.result;
            try {
                var getAllReq = db.transaction('msgs', 'readonly').objectStore('msgs').getAll();
                getAllReq.onsuccess = function () {
                    allMessages = getAllReq.result || [];
                    buildGroups();
                    renderSidebar();
                    if (selectedJid && chatGroups[selectedJid]) {
                        renderMessages(selectedJid);
                    }
                };
            } catch(e) {
                chatList.innerHTML = '<div style="padding:20px;color:#c0392b;font-size:13px;">❌ ' + e.message + '</div>';
            }
        };
    }

    // ─── BUILD GROUPS ───
    function buildGroups() {
        chatGroups = {};
        chatOrder = [];

        var query = (searchInput.value || '').toLowerCase().trim();

        var msgs = allMessages.slice().sort(function(a,b){
            return (b.timestamp || 0) - (a.timestamp || 0);
        });

        msgs.forEach(function(m) {
            var key = m.Jid || 'unknown';
            if (!chatGroups[key]) {
                // For 1-on-1 chats: chatName > live lookup > stored fromName > formatted JID
                var isGroupJid = key.endsWith('@g.us');
                var displayName = m.chatName ||
                    resolveDisplayName(key) ||
                    (!isGroupJid && m.fromName) ||   // for DMs, sender name = chat name
                    key;

                chatGroups[key] = {
                    name: displayName,
                    jid: key,
                    msgs: [],
                    latestTs: 0
                };
                chatOrder.push(key);
            }
            chatGroups[key].msgs.push(m);
            if ((m.timestamp || 0) > chatGroups[key].latestTs) {
                chatGroups[key].latestTs = m.timestamp || 0;
            }
        });

        // Sort sidebar by most recent message
        chatOrder.sort(function(a,b) {
            return (chatGroups[b].latestTs || 0) - (chatGroups[a].latestTs || 0);
        });

        // Filter by search query (chat-level)
        if (query) {
            chatOrder = chatOrder.filter(function(key) {
                var g = chatGroups[key];
                if (g.name.toLowerCase().includes(query)) return true;
                if (g.jid.toLowerCase().includes(query)) return true;
                return g.msgs.some(function(m) {
                    return (m.body && m.body.toLowerCase().includes(query)) ||
                           (m.mediaText && m.mediaText.toLowerCase().includes(query)) ||
                           (m.from && m.from.toLowerCase().includes(query));
                });
            });
        }

        document.getElementById('wadm-sidebar-header').textContent =
            chatOrder.length + ' Chat' + (chatOrder.length !== 1 ? 's' : '');
    }

    // ─── RENDER SIDEBAR ───
    function renderSidebar() {
        chatList.innerHTML = '';

        if (chatOrder.length === 0) {
            chatList.innerHTML = '<div style="padding:30px 16px;text-align:center;color:#8696a0;font-size:13px;">No deleted messages yet.<br>They\'ll appear here when someone deletes a message.</div>';
            return;
        }

        chatOrder.forEach(function(jid) {
            var g = chatGroups[jid];
            var item = document.createElement('div');
            item.className = 'wadm-chat-item' + (jid === selectedJid ? ' active' : '');
            item.dataset.jid = jid;

            // Latest message preview
            var latestMsg = g.msgs.reduce(function(a, b) {
                return (a.timestamp || 0) >= (b.timestamp || 0) ? a : b;
            });
            var previewText = latestMsg.body
                ? latestMsg.body.substring(0, 50)
                : (latestMsg.isMedia ? '📎 Media' : 'Deleted message');
            var timeStr = latestMsg.timestamp
                ? new Date(latestMsg.timestamp * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
                : '';

            item.innerHTML =
                avatarHTML(jid, g.name, 46) +
                '<div class="wadm-chat-info">' +
                  '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                    '<span class="wadm-chat-name">' + escapeHTML(g.name) + '</span>' +
                    '<span style="font-size:11px;color:#667781;">' + escapeHTML(timeStr) + '</span>' +
                  '</div>' +
                  '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px;">' +
                    '<span class="wadm-chat-preview">🗑 ' + escapeHTML(previewText) + '</span>' +
                    '<span class="wadm-chat-badge">' + g.msgs.length + '</span>' +
                  '</div>' +
                '</div>';

            item.addEventListener('click', function() {
                selectedJid = jid;
                // Update active state
                document.querySelectorAll('.wadm-chat-item').forEach(function(el) {
                    el.classList.remove('active');
                });
                item.classList.add('active');
                renderMessages(jid);
            });

            chatList.appendChild(item);
        });
    }

    // ─── RENDER MESSAGES (right panel) ───
    function renderMessages(jid) {
        var g = chatGroups[jid];
        if (!g) return;

        var isGroup = jid.endsWith('@g.us');
        msgsPanel.innerHTML = '';

        // Panel header
        var panelHeader = document.createElement('div');
        panelHeader.className = 'wadm-msgs-panel-header';
        panelHeader.innerHTML =
            avatarHTML(jid, g.name, 38) +
            '<div>' +
              '<div class="wadm-msgs-panel-name">' + escapeHTML(g.name) + '</div>' +
              '<div class="wadm-msgs-panel-sub">' + g.msgs.length + ' deleted message' + (g.msgs.length !== 1 ? 's' : '') + '</div>' +
            '</div>';
        msgsPanel.appendChild(panelHeader);

        // Messages list
        var msgsList = document.createElement('div');
        msgsList.className = 'wadm-msgs-list';

        var msgs = g.msgs.slice().sort(function(a,b) {
            return (a.timestamp || 0) - (b.timestamp || 0);
        });

        msgs.forEach(function(msg) {
            // fromJid = full JID stored at save time; from = raw number part
            var fromJid = msg.fromJid || (msg.from ? (msg.from + '@s.whatsapp.net') : '');
            var isMe = msg.fromMe || false;

            // Priority: stored display name → live WPP lookup → format phone number
            var senderName = msg.fromName
                || (fromJid ? resolveDisplayName(fromJid) : null)
                || (msg.from && /^\d+$/.test(msg.from) ? '+' + msg.from : msg.from)
                || (isMe ? 'You' : 'Unknown');

            var dateStr = msg.timestamp
                ? new Date(msg.timestamp * 1000).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})
                : '—';

            var wrap = document.createElement('div');
            wrap.className = 'wadm-bubble-wrap ' + (isMe ? 'outgoing' : 'incoming');

            // Show sender name in group chats for incoming msgs
            if (isGroup && !isMe) {
                var senderEl = document.createElement('div');
                senderEl.className = 'wadm-sender-name';
                senderEl.textContent = senderName;
                wrap.appendChild(senderEl);
            }

            var bubble = document.createElement('div');
            bubble.className = 'wadm-bubble ' + (isMe ? 'outgoing' : 'incoming');

            // Build bubble content
            if (msg.isMedia) {
                var mime = msg.mimetype || '';
                var b64 = msg.body;
                if (b64 && mime) {
                    var dataURI = 'data:' + mime + ';base64,' + b64;
                    var mediaEl;
                    if (mime.startsWith('image/')) {
                        mediaEl = document.createElement('img');
                        mediaEl.className = 'wadm-media-img';
                        mediaEl.src = dataURI;
                        mediaEl.alt = 'image';
                        mediaEl.onclick = function() { window.open(dataURI, '_blank'); };
                    } else if (mime.startsWith('video/')) {
                        mediaEl = document.createElement('video');
                        mediaEl.className = 'wadm-media-video';
                        mediaEl.src = dataURI;
                        mediaEl.setAttribute('controls', '');
                        mediaEl.style.cssText = 'display:block!important;visibility:visible!important;opacity:1!important;max-width:240px;border-radius:6px;margin-bottom:4px;';
                    } else if (mime.startsWith('audio/')) {
                        mediaEl = document.createElement('audio');
                        mediaEl.className = 'wadm-media-audio';
                        mediaEl.src = dataURI;
                        // Use setAttribute instead of .controls = true — more reliable across browsers
                        mediaEl.setAttribute('controls', '');
                        // Also set preload so the player shows without needing interaction
                        mediaEl.setAttribute('preload', 'metadata');
                        // Force inline style to override any WhatsApp global CSS that hides audio elements
                        mediaEl.style.cssText = [
                            'display:block!important',
                            'visibility:visible!important',
                            'opacity:1!important',
                            'width:100%!important',
                            'min-width:200px',
                            'height:40px!important',
                            'min-height:40px!important',
                            'border-radius:6px',
                            'margin-bottom:6px',
                            'background:#f0f2f5',
                        ].join(';');

                    } else {
                        var docDiv = document.createElement('div');
                        docDiv.className = 'wadm-media-doc';
                        var fname = msg.fileName || 'file';
                        docDiv.innerHTML = '📎 <a href="' + dataURI + '" download="' + escapeHTML(fname) + '" style="color:#128c7e;text-decoration:none;font-size:13px;">' + escapeHTML(fname) + '</a>';
                        bubble.appendChild(docDiv);
                    }
                    if (mediaEl) bubble.appendChild(mediaEl);
                    if (msg.mediaText) {
                        var captionEl = document.createElement('div');
                        captionEl.textContent = msg.mediaText;
                        bubble.appendChild(captionEl);
                    }
                } else {
                    bubble.innerHTML = '<span class="wadm-deleted-label">🚫 Media not available</span>';
                }
            } else if (msg.body) {
                bubble.textContent = msg.body;
            } else {
                bubble.innerHTML = '<span class="wadm-deleted-label">🚫 This message was deleted</span>';
            }

            // Delete entry button (appears on hover)
            var delBtn = document.createElement('button');
            delBtn.className = 'wadm-bubble-del';
            delBtn.title = 'Remove from log';
            delBtn.textContent = '✕';
            delBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                deleteSingleDeletedMessage(msg.id, function() {
                    allMessages = allMessages.filter(function(m) { return m.id !== msg.id; });
                    buildGroups();
                    renderSidebar();
                    if (chatGroups[jid]) {
                        renderMessages(jid);
                    } else {
                        // Chat gone — show empty state
                        selectedJid = null;
                        msgsPanel.innerHTML = '<div class="wadm-no-chat-selected"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><h3>Select a chat to view deleted messages</h3></div>';
                    }
                    updateDeletedMsgsBadgeCount();
                });
            });
            bubble.appendChild(delBtn);

            // Timestamp
            var footerEl = document.createElement('div');
            footerEl.className = 'wadm-bubble-footer';
            footerEl.textContent = dateStr;

            wrap.appendChild(bubble);
            wrap.appendChild(footerEl);
            msgsList.appendChild(wrap);
        });

        msgsPanel.appendChild(msgsList);

        // Scroll to bottom
        msgsList.scrollTop = msgsList.scrollHeight;
    }

    // ─── EVENTS ───
    searchInput.addEventListener('input', function() {
        buildGroups();
        renderSidebar();
        if (selectedJid && chatGroups[selectedJid]) {
            renderMessages(selectedJid);
        } else if (selectedJid && !chatGroups[selectedJid]) {
            selectedJid = null;
            msgsPanel.innerHTML = '<div class="wadm-no-chat-selected"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><h3>Select a chat</h3></div>';
        }
    });

    clearBtn.onclick = function() {
        if (!confirm('Clear ALL deleted messages? This cannot be undone.')) return;
        var req = indexedDB.open('deletedMsgs', 2);
        req.onsuccess = function() {
            var db = req.result;
            db.transaction('msgs', 'readwrite').objectStore('msgs').clear().onsuccess = function() {
                allMessages = [];
                selectedJid = null;
                buildGroups();
                renderSidebar();
                msgsPanel.innerHTML = '<div class="wadm-no-chat-selected"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><h3>No deleted messages</h3></div>';
                updateDeletedMsgsBadgeCount();
            };
        };
    };

    loadMessages();
}

function deleteSingleDeletedMessage(msgId, callback) {
    var req = indexedDB.open('deletedMsgs', 2);
    req.onsuccess = function () {
        var db = req.result;
        db.transaction('msgs', 'readwrite').objectStore('msgs').delete(msgId).onsuccess = function () {
            if (callback) callback();
        };
    };
}

function closeDeletedMessagesModal() {
    var modal = document.getElementById('wa-deleted-msgs-modal');
    var style = document.getElementById('wa-deleted-msgs-style');
    if (modal) modal.remove();
    if (style) style.remove();
}

// ---- Robust button injection ----
// We use BOTH the event (in case it fires correctly) AND a polling approach
// (in case injected_ui.js loads after WhatsApp Web has already rendered its layout).

var _buttonsInjected = false;

function tryInjectButtons() {
    if (_buttonsInjected) return;

    // Try multiple selectors — WhatsApp Web class names change between versions.
    var mainContainer = document.querySelector('.two') ||
                        document.querySelector('[data-testid="side"]') ||
                        document.querySelector('[data-testid="chat-list"]') ||
                        document.querySelector('div[class*="app-wrapper"]') ||
                        document.querySelector('#app header');

    if (!mainContainer) {
        return; // not ready yet, keep polling
    }

    _buttonsInjected = true;
    console.log('[WAIncognito] Main UI detected, injecting buttons');

    setTimeout(function () {
        injectActivityLogsButton();
        injectViewOnceButton();
        injectDeletedMessagesButton();
    }, 1200);

    setTimeout(exposeWhatsAppAPI, 200);
}

// Strategy 1: Listen for the custom event dispatched by ui.js
document.addEventListener('onMainUIReady', function (e) {
    console.log('[WAIncognito] onMainUIReady event received');
    tryInjectButtons();
});

// Strategy 2: Poll every 500ms for up to 60 seconds (handles page load timing race)
var _pollInterval = setInterval(function () {
    if (_buttonsInjected) {
        clearInterval(_pollInterval);
        return;
    }
    tryInjectButtons();
}, 500);

// Stop polling after 60 seconds regardless
setTimeout(function () { clearInterval(_pollInterval); }, 60000);

// Strategy 3: Hard fallback — inject the deleted messages button after 5s
// regardless of whether the main UI was detected, since the button is now
// fully self-contained with inline styles.
setTimeout(function () {
    if (!document.getElementById('whatsapp-deleted-msgs-button')) {
        console.log('[WAIncognito] Fallback: injecting deleted messages button directly');
        injectDeletedMessagesButton();
    }
}, 5000);



// Listen for new view-once messages being saved
document.addEventListener('onViewOnceMessageSaved', function (e) {
    console.log('[WAIncognito] View-once message saved, updating badge count');
    updateViewOnceBadgeCount();
});

// Listen for new deleted messages being saved
document.addEventListener('onDeletedMessageSaved', function (e) {
    console.log('[WAIncognito] Deleted message saved, updating badge count');
    updateDeletedMsgsBadgeCount();
});

document.addEventListener('onPresenceOptionTicked', function (e)
{
    WhatsAppAPI.sendPresenceStatusProtocol({name:"",status:"unavailable"})
});

document.addEventListener('onPresenceOptionUnticked', function (e)
{
    WhatsAppAPI.sendPresenceStatusProtocol({name:"",status:"available"})
});


document.addEventListener('onIncognitoOptionsOpened', function (e)
{
    var drop = document.getElementsByClassName("drop")[0];
    fixCSSPositionIfNeeded(drop);
    Velocity(drop, { scale: [1, 0], opacity: [1, 0] }, { defaultDuration: 100, easing: [.1, .82, .25, 1] });


    /*
    var safetyDelayPanel = document.getElementById("incognito-safety-delay-option-panel");
    if (!readConfirmationsHookEnabled)
    {
        safetyDelayPanel.style.opacity = 0;
        safetyDelayPanel.style.height = 0;
        safetyDelayPanel.style.marginTop = "-10px";
    }
    */
});

document.addEventListener('onIncognitoOptionsClosed', function (e)
{
    var drop = document.getElementsByClassName("drop")[0];
    fixCSSPositionIfNeeded(drop);
    Velocity(drop, { scale: [0, 1], opacity: [0, 1] }, { defaultDuration: 100, easing: [.1, .82, .25, 1] });


    // if (!document.getElementById("incognito-radio-enable-safety-delay").checked) return;
    // validateSafetyDelay();
});

function validateSafetyDelay()
{
    var string = document.getElementById("incognito-option-safety-delay").value;
    var isValid = false;
    var number = Math.floor(Number(string));
    if ((String(number) === string && number >= 1 && number <= 30) || string == "") isValid = true;
    if (!isValid)
    {
        document.getElementById("incognito-option-safety-delay").disabled = true;
        document.getElementById("incognito-option-safety-delay").value = "";
        document.getElementById("incognito-radio-disable-safety-delay").checked = true;
        document.getElementById("incognito-radio-enable-safety-delay").checked = false;

        showToast("The safety delay must be an integer number in range 1-30 !");
    }
}

document.addEventListener('onOptionsUpdate', function (e)
{
    // update enforcing globals
    // TODO: move outside injected_ui.js
    var options = JSON.parse(e.detail);
    if ('readConfirmationsHook' in options) readConfirmationsHookEnabled = options.readConfirmationsHook;
    if ('onlineUpdatesHook' in options) onlineUpdatesHookEnabled = options.onlineUpdatesHook;
    if ('typingUpdatesHook' in options) typingUpdatesHookEnabled = options.typingUpdatesHook;
    if ('safetyDelay' in options) safetyDelay = options.safetyDelay;
    if ('saveDeletedMsgs' in options) saveDeletedMsgsHookEnabled = options.saveDeletedMsgs;
    if ('showDeviceTypes' in options) showDeviceTypesEnabled = options.showDeviceTypes;
    if ('autoReceiptOnReplay' in options) autoReceiptOnReplay = options.autoReceiptOnReplay;
    if ('allowStatusDownload' in options) allowStatusDownload = options.allowStatusDownload;
    if ('typingNotifications' in options) typingNotificationsEnabled = options.typingNotifications;
    if ('stayOnline' in options) stayOnlineEnabled = options.stayOnline;

    // update graphics
    var safetyDelayPanel = document.getElementById("incognito-safety-delay-option-panel");
    var safetyDelayPanelExpectedHeight = 42; // be careful with this
    if (readConfirmationsHookEnabled)
    {
        // set unread counters to transperent
        setGlobalColorVaraibleString("--WDS-persistent-always-branded", 'rgba(9, 210, 97, 0.3)');
        if (safetyDelayPanel != null)
        {
            Velocity(safetyDelayPanel, { height: safetyDelayPanelExpectedHeight, opacity: 0.8, marginTop: 0 }, { defaultDuration: 200, easing: [.1, .82, .25, 1] });
        }
    }
    else
    {
        // set unread counters to solid
        setGlobalColorVaraibleString("--WDS-persistent-always-branded", 'rgba(9, 210, 97, 1)');
        if (safetyDelayPanel != null)
        {
            Velocity(safetyDelayPanel, { height: 0, opacity: 0, marginTop: -10 }, { defaultDuration: 200, easing: [.1, .82, .25, 1] });
        }
        var warningMessage = document.getElementsByClassName("incognito-message").length > 0 ?
            document.getElementsByClassName("incognito-message")[0] : null;
        if (warningMessage != null)
        {
            Velocity(warningMessage, { scaleY: [0, 1], opacity: [0, 1] }, { defaultDuration: 300, easing: [.1, .82, .25, 1] });
            setTimeout(function () { warningMessage.parentNode.removeChild(warningMessage); }, 300);
        }
    }

    var unreadCounters = document.getElementsByClassName(UIClassNames.UNREAD_COUNTER_CLASS);
    for (var i = 0; i < unreadCounters.length; i++)
    {
        unreadCounters[i].classList.remove("blocked-color");
    }
});

document.addEventListener('onReadConfirmationBlocked', async function (e)
{
    var blockedJid = e.detail;
    var blockedUser = blockedJid.substring(0, blockedJid.indexOf("@"));

    var chat = await getChatByJID(blockedJid);
    if (!chat) return;

    if (readConfirmationsHookEnabled && safetyDelay > 0 && chat.id.user == blockedUser)
    {
        markChatAsPendingReciptsSending(chat);
    }
    else if (readConfirmationsHookEnabled && chat.id.user == blockedUser)
    {
        markChatAsBlocked(chat);
    }
    else
    {
        console.warn("WAIncognito: Could not find chat for JID " + blockedJid);
    }

    if (!(chat.id in blockedChats))
    {
        // window.WhatsAppAPI.UI.scrollChatToBottom(chat);
    }

    blockedChats[chat.id] = chat;

});

document.addEventListener('onPaneChatOpened', function (e)
{
    var chat = getCurrentChat();
    chats[chat.id] = chat;
});

document.addEventListener('onDropdownOpened', function (e)
{
    // the user has opened a dropdown. Make sure clicking "Mark as read" triggers our code

    var dropdown = document.getElementsByClassName(UIClassNames.DROPDOWN_CLASS)[0];
    if (dropdown == undefined) return;

    var menuItems = dropdown.getElementsByClassName(UIClassNames.DROPDOWN_ENTRY_CLASS);
    var reactResult = FindReact(document.getElementsByClassName(UIClassNames.OUTER_DROPDOWN_CLASS)[0]);
    if (reactResult == null) return;
    if (reactResult.props.children.length == 0) return;

    var reactMenuItems = reactResult.props.children[0].props.children;
    if (reactMenuItems.props == undefined) return;
    
    reactMenuItems = reactMenuItems.props.children;

    var markAsReadButton = null;
    var props = null;
    for (var i = 0; i < reactMenuItems.length; i++)
    {
        if (reactMenuItems[i] == null) continue;

        if (reactMenuItems[i].key == "mark_unread")
        {
            markAsReadButton = menuItems[i];
            props = reactMenuItems[i].props;
            break;
        }
    }

    if (props != null)
    {
        var name = props.chat.name;
        var formattedName = props.chat.contact.name;
        var jid = props.chat.id;
        var lastMessageIndex = props.chat.lastReceivedKey.id;
        var unreadCount = props.chat.unreadCount;
        var isGroup = props.chat.isGroup;
        var fromMe = props.chat.lastReceivedKey.fromMe;
        if (unreadCount > 0)
        {
            // this is mark-as-read button, not mark-as-unread
            markAsReadButton.addEventListener("mousedown", function (e)
            {
                var data = { name: name, formattedName: formattedName, jid: jid, lastMessageIndex: lastMessageIndex, 
                            fromMe: fromMe, unreadCount: unreadCount, isGroup: isGroup };

                document.dispatchEvent(new CustomEvent('onMarkAsReadClick', { detail: JSON.stringify(data) }));
            });
        }
    }
});

document.addEventListener('sendReadConfirmation', async function (e)
{
    var data = JSON.parse(e.detail);
    var messageIndex = data.index != undefined ? data.index : data.lastMessageIndex;
    var messageID = data.jid + messageIndex;

    var chat = await getChatByJID(data.jid);

    // add an exception and remove it after a short time at any case
    exceptionsList.push(normalizeJID(data.jid));
    setTimeout(function() { exceptionsList = exceptionsList.filter(i => i !== data.jid); }, 2000);
    
    WhatsAppAPI.Seen.sendSeen(chat).then(result =>
    {
        if (data.jid in blinkingChats)
        {
            clearInterval(blinkingChats[data.jid]["timerID"]);
            delete blinkingChats[data.jid];
        }
        if (data.jid in blockedChats)
        {
            delete blockedChats[data.jid];
        }
    });

    chat.unreadCount -= data.unreadCount;

    // animate out the incognito message
    var warningMessage = document.getElementsByClassName("incognito-message").length > 0 ? document.getElementsByClassName("incognito-message")[0] : null;
    if (warningMessage != null && warningMessage.messageID.startsWith(data.jid))
    {
        Velocity(warningMessage, { height: 0, opacity: 0, marginTop: 0, marginBottom: 0 }, { defaultDuration: 300, easing: [.1, .82, .25, 1] });
        setTimeout(function() {warningMessage.remove();}, 300);
    }

    //var node = ["action",{"type":"set","epoch":"30"},[["read",{"jid":data.jid,"index":data.index,"owner":"false","count":data.unreadCount.toString()},null]]];
    //WACrypto.sendNode(node);
});

document.addEventListener("getDeletedMessageByID", async function(e) 
{
    var data = JSON.parse(e.detail);
    var msgID = data.messageID;

    if (window.deletedMessagesDB == null) return;

    var transcation = window.deletedMessagesDB.transaction('msgs', "readonly");
    var msgsStore = transcation.objectStore("msgs");

    // search the message ID in both the original message ID and the revoked message ID
    let requestByID = msgsStore.get(msgID);
    
    requestByID.onsuccess = (e) =>
    {
        var messageData = requestByID.result;
        if (messageData)
        {
            document.dispatchEvent(new CustomEvent("onDeletedMessageReceived", {detail: JSON.stringify({messageData: messageData, messageID: msgID})}));
            return;
        }

        // Did not find the message data by revoked message ID. try by original message ID
        var originalIDIndex = msgsStore.index('originalID_index');
        var requestByOriginalID = originalIDIndex.get(msgID);
        requestByOriginalID.onsuccess = (e) =>
        {
            var messageData = requestByOriginalID.result;

            document.dispatchEvent(new CustomEvent("onDeletedMessageReceived", {detail: JSON.stringify({messageData: messageData, messageID: msgID})}));
        }
    }
    
});

document.addEventListener("getDeviceTypeForMessage", async function(e) 
{
    var data = JSON.parse(e.detail);
    var msgID = data.messageID;
    var deviceType = null;

    if (deviceTypesPerMessage[msgID] != undefined && showDeviceTypesEnabled)
        deviceType = deviceTypesPerMessage[msgID];

    setTimeout(function()
    {
        document.dispatchEvent(new CustomEvent("onDeviceTypeReceived", {detail: JSON.stringify({deviceType: deviceType, messageID: msgID})}));
    }, 20);
});

function markChatAsPendingReciptsSending(chat)
{
    if (chat.pendingSeenCount != 0) chat.pendingSeenCount = 0;

    if (chat.unreadCount == 0)
    {
        return;
    }

    var currentChat = getCurrentChat();
    if (currentChat.id.user != chat.id.user) 
    {
        return;
    }

    var messageID = chat.id + chat.lastReceivedKey.id;
    var previousMessage = document.getElementsByClassName("incognito-message").length > 0 ? 
                            document.getElementsByClassName("incognito-message")[0] : null;
    var seconds = safetyDelay;

    var chatWindow = getCurrentChatPanel();

    if (chatWindow != null && chat.unreadCount > 0 && (previousMessage == null || previousMessage.messageID != messageID))
    {
        if (chat.id in blinkingChats)
        {
            seconds = blinkingChats[chat.id]["time"];
            clearInterval(blinkingChats[chat.id]["timerID"]);
        }

        // make a warning message at the chat panel
        var warningMessage = document.createElement('div');
        warningMessage.setAttribute('class', 'incognito-message middle');
        warningMessage.innerHTML = "Sending read receipts in " + seconds + " seconds...";
        warningMessage.messageID = messageID;

        var cancelButton = document.createElement('div');
        cancelButton.setAttribute('class', 'incognito-cancel-button');
        cancelButton.innerHTML = "Cancel";
        warningMessage.appendChild(cancelButton);

        // insert it under the unread counter, or at the end of the chat panel
        var parent = document.getElementsByClassName(UIClassNames.INNER_CHAT_PANEL_CLASS)[0];
        if (previousMessage != null)
            parent.removeChild(previousMessage);
        var unreadMarker = getUnreadMarkerElement(parent);
        if (unreadMarker != null)
            unreadMarker.parentNode.insertBefore(warningMessage, unreadMarker.nextSibling);
        else
        {
            warningMessage.setAttribute('class', 'incognito-message');
            parent.appendChild(warningMessage);
        }
        Velocity(warningMessage, { height: warningMessage.clientHeight, opacity: 1, marginTop: [12, 0], marginBottom: [12, 0] },
            { defaultDuration: 400, easing: [.1, .82, .25, 1] });

        var blockedChatElem = findChatEntryElementForJID(chat.id);

        function makeUnreadCounterBlink()
        {
            chat.pendingSeenCount = 0;
    
            if (blockedChatElem != null)
            {
                var unreadCounter = blockedChatElem.querySelector("html[dir] ." + UIClassNames.UNREAD_COUNTER_CLASS);
                if (unreadCounter != null)
                {
                    unreadCounter.classList.add("blinking");
                }
            }
        }
    
        makeUnreadCounterBlink();
        setTimeout(makeUnreadCounterBlink, 200); // for multi-device pendingSeenCount

        var id = setInterval(function ()
        {
            chat.pendingSeenCount = 0;

            seconds--;
            if (seconds > 0)
            {
                warningMessage.firstChild.textContent = "Sending read receipts in " + seconds + " seconds...";
                blinkingChats[chat.id] = { timerID: id, time: seconds, chat: chat };
            }
            else
            {
                // time's up, sending receipt
                clearInterval(id);
                var data = { jid: chat.id, index: chat.lastReceivedKey.id, fromMe: chat.lastReceivedKey.fromMe, unreadCount: chat.unreadCount };
                document.dispatchEvent(new CustomEvent('sendReadConfirmation', { detail: JSON.stringify(data) }));

                var unreadCounter = blockedChatElem.querySelector("html[dir] ." + UIClassNames.UNREAD_COUNTER_CLASS);
                unreadCounter.className = unreadCounter.className.replace("blocked-color", "").replace("blinking", "");
            }
        }, 1000);

        blinkingChats[chat.id] = { timerID: id, time: seconds, chat: chat };

        cancelButton.onclick = function ()
        {
            clearInterval(id);
            delete blinkingChats[chat.id];

            markChatAsBlocked(chat);
        };
    }
}

function markChatAsBlocked(chat)
{
    if (chat.unreadCount == 0 && chat.pendingSeenCount == 0)
    {
        return;
    }

    var currentChat = getCurrentChat();
    var messageID = chat.id + chat.lastReceivedKey.id;

    if (currentChat.id.user == chat.id.user)
    {
        //
        // Create a "receipts blocked" warning if needed
        //

        var warningMessage = document.getElementsByClassName("incognito-message").length > 0 ?
        document.getElementsByClassName("incognito-message")[0] : null;
        var warningWasEmpty = warningMessage == null;
        if (warningMessage == null)
        {
            warningMessage = document.createElement('div');
            warningMessage.setAttribute('class', 'incognito-message middle');
            warningMessage.innerHTML = "Read receipts were blocked.";

            var sendButton = document.createElement('div');
            sendButton.setAttribute('class', 'incognito-send-button');
            sendButton.innerHTML = "Mark as read";
            warningMessage.appendChild(sendButton);
        }
        else
        {
            // we already have a warning message, remove it first
            warningMessage.remove();
        }

        var sendButton = warningMessage.lastChild;
        sendButton.setAttribute('class', 'incognito-send-button');
        sendButton.innerHTML = "Mark as read";
        sendButton.onclick = function ()
        {
            var data = {
                name: chat.name, jid: chat.id, lastMessageIndex: chat.lastReceivedKey.id,
                fromMe: chat.lastReceivedKey.fromMe, unreadCount: chat.unreadCount, isGroup: chat.isGroup,
                formattedName: chat.contact.name
            };
            document.dispatchEvent(new CustomEvent('onMarkAsReadClick', { detail: JSON.stringify(data) }));
        };

        warningMessage.messageID = messageID;

        //
        // Put that warning in the chat panel, under the unread counter or at the bottom
        //

        var innerChatPanel = document.getElementsByClassName(UIClassNames.INNER_CHAT_PANEL_CLASS)[0];
        var unreadMarker = getUnreadMarkerElement(innerChatPanel);
        if (unreadMarker != null)
            unreadMarker.parentNode.insertBefore(warningMessage, unreadMarker.nextSibling);
        else
        {
            warningMessage.setAttribute('class', 'incognito-message');
            innerChatPanel.appendChild(warningMessage);
        }
    }
    else
    {
        console.warn("WAIncognito: Could not mark chat " + chat.id + " as blocked.");
    }

    //
    // turn the unread counter of the chat to red
    //

    var chatUnreadRead = chat.unreadCount;
    
    function markUnreadCounter()
    {
        var blockedChatElem = findChatEntryElementForJID(chat.id);
        chat.pendingSeenCount = 0;

        if (blockedChatElem != null)
        {
            var unreadCounter = blockedChatElem.querySelector("html[dir] ." + UIClassNames.UNREAD_COUNTER_CLASS);
            if (unreadCounter && !unreadCounter.className.includes("blocked-color"))
                unreadCounter.classList.add("blocked-color");
        }
    }

    markUnreadCounter();
    setTimeout(markUnreadCounter, 200); // for multi-device pendingSeenCount
    

    // if it didn't exist previously, animate it in
    if (blockedChats[chat.id] == undefined || warningWasEmpty)
        Velocity(warningMessage, { scaleY: [1, 0], opacity: [1, 0] }, { defaultDuration: 400, easing: [.1, .82, .25, 1] });

    if (warningMessage)
        warningMessage.firstChild.textContent = "Read receipts were blocked.";
}

function setGlobalColorVaraibleString(variable, colorString)
{
    var selector2 = ".xj6uduu.xj6uduu, .xj6uduu.xj6uduu:root";
    var selector3 = ".x8mwjyx.x8mwjyx, .x8mwjyx.x8mwjyx:root";
    var selector4 = ".x1h89ln0.x1h89ln0, .x1h89ln0.x1h89ln0:root";
    
    if (document.querySelector(selector2))
    {
        document.querySelector(selector2).style.setProperty(variable, colorString);
    }

    if (document.querySelector(UIClassNames.GLOBAL_COLORS_CONTAINER_SELECTOR))
    {
        document.querySelector(UIClassNames.GLOBAL_COLORS_CONTAINER_SELECTOR).style.setProperty(variable, colorString);
    }

    if (document.querySelector(selector3))
    {
        document.querySelector(selector3).style.setProperty(variable, colorString);
    }
    
    if (document.querySelector(":root"))
    {
        document.querySelector(':root').style.setProperty(variable, colorString);
    }
    
    if (document.querySelector(".color-refresh"))
    {
        document.querySelector('.color-refresh').style.setProperty(variable, colorString);
    }
}

function getUnreadMarkerElement(parentElement = null)
{
    if (parentElement == null) parentElement = document;

    var elements1 = parentElement.getElementsByClassName(UIClassNames.UNREAD_MARKER_CLASS)
    var elements2 = parentElement.getElementsByClassName(UIClassNames.UNREAD_MARKER_CLASS_2);
    var elements3 = parentElement.getElementsByClassName(UIClassNames.UNREAD_MARKER_CLASS_3);

    if (elements1.length > 0) return elements1[0];
    if (elements2.length > 0) return elements2[0];
    if (elements3.length > 0) return elements3[0];

    return null;
}

setTimeout(function() {
    if (!window.onerror) return;

    // WhatsApp hooks window.onerror.
    // This makes extension-related errors not printed out,
    // so make a hook-on-hook to print those first
    var originalOnError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error)
    {
        console.error(error);
        originalOnError.call(window, message, source, lineno, colno, error);
    }
}, 1000);
