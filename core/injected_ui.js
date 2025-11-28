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

// Watch for when the main UI is ready and inject our buttons
document.addEventListener('onMainUIReady', function (e) {
    // Inject the activity logs button after a small delay to ensure UI is ready
    setTimeout(function() {
        injectActivityLogsButton();
        injectViewOnceButton(); // Add the view-once button
    }, 1000);
    
    // Also expose WhatsApp API
    setTimeout(exposeWhatsAppAPI, 100);
});

// Listen for new view-once messages being saved
document.addEventListener('onViewOnceMessageSaved', function (e) {
    console.log('[WAIncognito] View-once message saved, updating badge count');
    updateViewOnceBadgeCount();
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
