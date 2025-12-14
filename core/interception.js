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
var typingNotificationExclusions = new Set(); // Set of JIDs to exclude from typing notifications

// Expose typing log functions to global scope for frontend access
window.getWhatsAppActivityLogs = function (callback) {
    return getTypingLogs(callback);
};
window.getWhatsAppActivityLogsWithFilters = function (options, callback) {
    return getTypingLogsWithFilters(options, callback);
};
window.getWhatsAppActivityLogStats = function (callback) {
    return getTypingLogStats(callback);
};
window.clearWhatsAppActivityLogs = function (callback) {
    return clearTypingLogs(callback);
};
window.exportWhatsAppActivityLogs = function (format, callback) {
    return exportTypingLogs(format, callback);
};
window.loadAllChatsAndLog = function () {
    return loadAllChatsAndLog();
};
window.loadAllChatsAndLog = function () {
    return loadAllChatsAndLog();
};
window.toggleTypingExclusion = function (jid, name) {
    if (typingNotificationExclusions.has(jid)) {
        typingNotificationExclusions.delete(jid);
        console.log("Allowed typing notifications for " + jid);
    } else {
        typingNotificationExclusions.add(jid);
        console.log("Excluded typing notifications for " + jid);
    }
    localStorage.setItem("WAIncognito_TypingExclusions", JSON.stringify(Array.from(typingNotificationExclusions)));

    // Refresh the logs if the modal is open
    if (document.getElementById('whatsapp-logs-modal')) {
        // We need to trigger a refresh of the logs display
        // Since we don't have direct access to displayLogs here, we can dispatch an event or
        // re-open the modal (clunky).
        // A better way is to filter the logs visually or let the user click refresh.
        // For now, let's just save.
    }
};
window.getTypingExclusions = function () {
    return Array.from(typingNotificationExclusions);
};
window.showWhatsAppActivityLogs = function () {
    console.log('[WAIncognito] showWhatsAppActivityLogs function called');
    // Create modal container
    var modal = document.createElement('div');
    modal.id = 'whatsapp-logs-modal';
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
        
        #whatsapp-logs-modal ::-webkit-scrollbar {
            width: 8px;
        }
        
        #whatsapp-logs-modal ::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
        }
        
        #whatsapp-logs-modal ::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 4px;
        }
        
        #whatsapp-logs-modal ::-webkit-scrollbar-thumb:hover {
            background: #a1a1a1;
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
    title.textContent = 'WhatsApp Activity Logs';
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

    closeButton.onmouseover = function () {
        this.style.background = 'rgba(255, 255, 255, 0.3)';
    };

    closeButton.onmouseout = function () {
        this.style.background = 'rgba(255, 255, 255, 0.2)';
    };

    closeButton.onclick = function () {
        document.body.removeChild(modal);
        if (style.parentNode) {
            style.parentNode.removeChild(style);
        }
    };

    header.appendChild(title);
    header.appendChild(closeButton);

    // Create filter section
    var filterSection = document.createElement('div');
    filterSection.style.cssText = `
        padding: 16px 24px;
        background-color: #f0f2f5;
        border-bottom: 1px solid #e0e0e0;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
    `;

    var filterLabel = document.createElement('span');
    filterLabel.textContent = 'Filters:';
    filterLabel.style.cssText = `
        font-weight: 600;
        color: #3b4a54;
        font-size: 14px;
    `;

    var userFilterInput = document.createElement('input');
    userFilterInput.type = 'text';
    userFilterInput.placeholder = 'Search by user name...';
    userFilterInput.style.cssText = `
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        flex-grow: 1;
        min-width: 180px;
        font-size: 14px;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
        transition: border 0.2s;
    `;

    userFilterInput.onfocus = function () {
        this.style.borderColor = '#008069';
        this.style.boxShadow = 'inset 0 1px 2px rgba(0, 0, 0, 0.05), 0 0 0 2px rgba(0, 128, 105, 0.2)';
    };

    userFilterInput.onblur = function () {
        this.style.borderColor = '#ddd';
        this.style.boxShadow = 'inset 0 1px 2px rgba(0, 0, 0, 0.05)';
    };

    var tabFilterSelect = document.createElement('select');
    tabFilterSelect.style.cssText = `
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        background-color: white;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        cursor: pointer;
    `;

    var allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = 'All Tabs';

    var onTabOption = document.createElement('option');
    onTabOption.value = 'on';
    onTabOption.textContent = 'On Tab';

    var offTabOption = document.createElement('option');
    offTabOption.value = 'off';
    offTabOption.textContent = 'Off Tab';

    tabFilterSelect.appendChild(allOption);
    tabFilterSelect.appendChild(onTabOption);
    tabFilterSelect.appendChild(offTabOption);

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

    refreshButton.onmouseover = function () {
        this.style.background = '#006a52';
    };

    refreshButton.onmouseout = function () {
        this.style.background = '#008069';
    };

    filterSection.appendChild(filterLabel);
    filterSection.appendChild(userFilterInput);
    filterSection.appendChild(tabFilterSelect);
    filterSection.appendChild(refreshButton);

    // Create stats section
    var statsSection = document.createElement('div');
    statsSection.id = 'logs-stats';
    statsSection.style.cssText = `
        padding: 16px 24px;
        background-color: #e8f4f1;
        border-bottom: 1px solid #d0e8e2;
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        font-size: 14px;
    `;

    // Create content area
    var content = document.createElement('div');
    content.id = 'logs-content';
    content.style.cssText = `
        padding: 0 24px;
        overflow-y: auto;
        flex-grow: 1;
        max-height: calc(90vh - 250px);
    `;

    // Create loading message
    var loading = document.createElement('div');
    loading.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 200px;">
            <div style="text-align: center;">
                <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #008069; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                <p style="margin-top: 15px; color: #666;">Loading activity logs...</p>
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

    content.appendChild(loading);

    // Create footer
    var footer = document.createElement('div');
    footer.style.cssText = `
        padding: 16px 24px;
        background-color: #f0f2f5;
        display: flex;
        justify-content: space-between;
        border-top: 1px solid #e0e0e0;
    `;

    var clearButton = document.createElement('button');
    clearButton.textContent = 'Clear All Logs';
    clearButton.style.cssText = `
        background-color: #dc3545;
        color: white;
        border: none;
        padding: 10px 18px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        font-size: 14px;
        transition: background 0.2s;
        box-shadow: 0 2px 4px rgba(220, 53, 69, 0.2);
    `;

    clearButton.onmouseover = function () {
        this.style.background = '#c82333';
    };

    clearButton.onmouseout = function () {
        this.style.background = '#dc3545';
    };

    clearButton.onclick = function () {
        if (confirm('Are you sure you want to clear all activity logs? This action cannot be undone.')) {
            window.clearWhatsAppActivityLogs(function () {
                // Refresh the logs display
                displayLogs();
                updateStats();
            });
        }
    };

    var exportButton = document.createElement('button');
    exportButton.textContent = 'Export Logs';
    exportButton.style.cssText = `
        background-color: #007bff;
        color: white;
        border: none;
        padding: 10px 18px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        font-size: 14px;
        transition: background 0.2s;
        box-shadow: 0 2px 4px rgba(0, 123, 255, 0.2);
    `;

    exportButton.onmouseover = function () {
        this.style.background = '#0069d9';
    };

    exportButton.onmouseout = function () {
        this.style.background = '#007bff';
    };

    exportButton.onclick = function () {
        // Simple export as JSON for now
        window.exportWhatsAppActivityLogs('json', function (data) {
            if (data) {
                var blob = new Blob([data], { type: 'application/json' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'whatsapp-activity-logs-' + new Date().toISOString().slice(0, 10) + '.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        });
    };

    var exclusionsButton = document.createElement('button');
    exclusionsButton.textContent = 'Manage Exclusions';
    exclusionsButton.style.cssText = `
        background-color: #6c757d;
        color: white;
        border: none;
        padding: 10px 18px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        font-size: 14px;
        transition: background 0.2s;
        box-shadow: 0 2px 4px rgba(108, 117, 125, 0.2);
        margin-left: 10px;
    `;

    exclusionsButton.onclick = function () {
        showExclusionsModal();
    };

    function showExclusionsModal() {
        var contentElement = document.getElementById('logs-content');
        if (!contentElement) return;

        // Hide main sections
        if (typeof filterSection !== 'undefined') filterSection.style.display = 'none';
        if (typeof statsSection !== 'undefined') statsSection.style.display = 'none';
        if (typeof footer !== 'undefined') footer.style.display = 'none';

        // Clear content
        contentElement.innerHTML = '';

        // Create container
        var container = document.createElement('div');
        container.style.padding = '20px 0';

        // Header
        var title = document.createElement('h3');
        title.textContent = 'Manage Exclusions';
        title.style.cssText = 'color: #3b4a54; margin-bottom: 8px; margin-top: 0;';
        container.appendChild(title);

        var description = document.createElement('p');
        description.textContent = 'Search for chats to exclude from typing notifications.';
        description.style.cssText = 'color: #667781; margin-bottom: 20px; font-size: 14px;';
        container.appendChild(description);

        // Search Section
        var searchContainer = document.createElement('div');
        searchContainer.style.cssText = 'position: relative; margin-bottom: 24px;';

        var searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search by contact name or phone number...';
        searchInput.style.cssText = `
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
            box-sizing: border-box;
            outline: none;
        `;
        searchInput.onfocus = function () { this.style.borderColor = '#008069'; };
        searchInput.onblur = function () { this.style.borderColor = '#ddd'; };

        var suggestionsBox = document.createElement('ul');
        suggestionsBox.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-top: none;
            border-radius: 0 0 6px 6px;
            max-height: 200px;
            overflow-y: auto;
            margin: 0;
            padding: 0;
            list-style: none;
            z-index: 10001;
            display: none;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;

        searchContainer.appendChild(searchInput);
        searchContainer.appendChild(suggestionsBox);
        container.appendChild(searchContainer);

        // Exclusions List Title
        var listTitle = document.createElement('h4');
        listTitle.textContent = 'Currently Excluded';
        listTitle.style.cssText = 'color: #3b4a54; margin-bottom: 12px; font-size: 16px; border-bottom: 2px solid #f0f2f5; padding-bottom: 8px; margin-top: 0;';
        container.appendChild(listTitle);

        // Exclusions List Container
        var listContainer = document.createElement('div');
        listContainer.id = 'exclusion-list-container';
        listContainer.style.maxHeight = '300px';
        listContainer.style.overflowY = 'auto';
        container.appendChild(listContainer);

        // Back Button
        var backButton = document.createElement('button');
        backButton.textContent = 'Back to Logs';
        backButton.style.cssText = `
            background-color: #008069;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            margin-top: 20px;
            box-shadow: 0 2px 4px rgba(0, 128, 105, 0.2);
        `;
        backButton.onclick = function () {
            // Restore views
            if (typeof filterSection !== 'undefined') filterSection.style.display = 'flex';
            if (typeof statsSection !== 'undefined') statsSection.style.display = 'flex';
            if (typeof footer !== 'undefined') footer.style.display = 'flex';

            // Reload logs
            displayLogs();
        };
        container.appendChild(backButton);

        contentElement.appendChild(container);

        // Logic
        var allChats = [];
        var loaded = false;

        function loadChats() {
            if (loaded) return;
            // Show loading indicator
            searchInput.placeholder = "Loading contacts...";

            // Use setTimeout to allow UI to render first
            setTimeout(function () {
                if (window.getAllChatsSimple) {
                    allChats = window.getAllChatsSimple();
                    loaded = true;
                    searchInput.placeholder = 'Search by contact name or phone number...';
                } else if (window.loadAllChatsAndLog) {
                    allChats = window.loadAllChatsAndLog(5000);
                    loaded = true;
                    searchInput.placeholder = 'Search by contact name or phone number...';
                }
            }, 50);
        }

        function renderExclusions() {
            var exclusions = window.getTypingExclusions();
            listContainer.innerHTML = '';

            if (exclusions.length === 0) {
                var empty = document.createElement('div');
                empty.textContent = 'No chats excluded yet.';
                empty.style.cssText = 'color: #8696a0; font-style: italic; padding: 10px 0;';
                listContainer.appendChild(empty);
                return;
            }

            exclusions.forEach(function (jid) {
                var item = document.createElement('div');
                item.style.cssText = 'border-bottom: 1px solid #e0e0e0; padding: 12px 0; display: flex; justify-content: space-between; align-items: center;';

                // Try to find name if available in our loaded chats
                var displayName = jid;
                var detailText = '';

                if (allChats && allChats.length > 0) {
                    var chatInfo = allChats.find(c => c.jid === jid);
                    if (chatInfo) {
                        displayName = chatInfo.name;
                        detailText = jid;
                    }
                }

                var infoDiv = document.createElement('div');
                var nameSpan = document.createElement('div');
                nameSpan.textContent = displayName;
                nameSpan.style.fontWeight = '500';
                nameSpan.style.color = '#3b4a54';

                infoDiv.appendChild(nameSpan);

                if (detailText) {
                    var detailSpan = document.createElement('div');
                    detailSpan.textContent = detailText;
                    detailSpan.style.fontSize = '12px';
                    detailSpan.style.color = '#667781';
                    infoDiv.appendChild(detailSpan);
                }

                var removeBtn = document.createElement('button');
                removeBtn.textContent = 'Remove';
                removeBtn.style.cssText = `
                    background-color: #dc3545;
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                `;
                removeBtn.onclick = function () {
                    window.toggleTypingExclusion(jid);
                    renderExclusions();
                };

                item.appendChild(infoDiv);
                item.appendChild(removeBtn);
                listContainer.appendChild(item);
            });
        }

        renderExclusions();
        loadChats();

        // Autocomplete Logic
        searchInput.addEventListener('input', function () {
            var query = this.value.toLowerCase();
            suggestionsBox.innerHTML = '';

            if (query.length < 1) {
                suggestionsBox.style.display = 'none';
                return;
            }

            // Exclude already excluded items from suggestions
            var currentExclusions = new Set(window.getTypingExclusions());

            var matches = allChats.filter(function (chat) {
                if (currentExclusions.has(chat.jid)) return false;

                var nameMatch = chat.name && chat.name.toLowerCase().includes(query);
                var jidMatch = chat.jid && chat.jid.toLowerCase().includes(query);
                return nameMatch || jidMatch;
            }).slice(0, 10);

            if (matches.length > 0) {
                suggestionsBox.style.display = 'block';
                matches.forEach(function (chat) {
                    var li = document.createElement('li');
                    li.style.cssText = 'padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #f0f0f0; display: flex; box-sizing: border-box; flex-direction: column;';
                    li.onmouseover = function () { this.style.backgroundColor = '#f5f5f5'; };
                    li.onmouseout = function () { this.style.backgroundColor = 'white'; };

                    var nameDiv = document.createElement('div');
                    nameDiv.textContent = chat.name;
                    nameDiv.style.fontWeight = '500';
                    nameDiv.style.color = '#3b4a54';

                    var jidDiv = document.createElement('div');
                    jidDiv.textContent = chat.jid;
                    jidDiv.style.fontSize = '12px';
                    jidDiv.style.color = '#667781';

                    li.appendChild(nameDiv);
                    li.appendChild(jidDiv);

                    li.onclick = function () {
                        window.toggleTypingExclusion(chat.jid);
                        searchInput.value = '';
                        suggestionsBox.style.display = 'none';
                        renderExclusions();
                    };

                    suggestionsBox.appendChild(li);
                });
            } else {
                suggestionsBox.style.display = 'none';
            }
        });

        // Close suggestions on click outside
        document.addEventListener('click', function (e) {
            if (!searchContainer.contains(e.target)) {
                suggestionsBox.style.display = 'none';
            }
        });
    }

    footer.appendChild(exclusionsButton);
    footer.appendChild(clearButton);
    footer.appendChild(exportButton);

    // Assemble modal
    modalContent.appendChild(header);
    modalContent.appendChild(filterSection);
    modalContent.appendChild(statsSection);
    modalContent.appendChild(content);
    modalContent.appendChild(footer);
    modal.appendChild(modalContent);

    // Add to document
    document.body.appendChild(modal);

    // Function to update stats
    function updateStats() {
        window.getWhatsAppActivityLogStats(function (stats) {
            var statsElement = document.getElementById('logs-stats');
            if (statsElement) {
                statsElement.innerHTML = `
                    <div style="display: flex; align-items: center;">
                        <div style="background-color: #008069; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: bold;">${stats.totalLogs}</div>
                        <div>
                            <div style="font-weight: 600; color: #3b4a54;">Total Logs</div>
                            <div style="font-size: 12px; color: #667781;">Activity events</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <div style="background-color: #54656f; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: bold;">${stats.uniqueUsers}</div>
                        <div>
                            <div style="font-weight: 600; color: #3b4a54;">Unique Users</div>
                            <div style="font-size: 12px; color: #667781;">Different contacts</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <div style="background-color: #28a745; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: bold;">${stats.onTabCount}</div>
                        <div>
                            <div style="font-weight: 600; color: #3b4a54;">On Tab</div>
                            <div style="font-size: 12px; color: #667781;">Active window</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <div style="background-color: #ffc107; color: black; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: bold;">${stats.offTabCount}</div>
                        <div>
                            <div style="font-weight: 600; color: #3b4a54;">Off Tab</div>
                            <div style="font-size: 12px; color: #667781;">Background</div>
                        </div>
                    </div>
                    ${stats.mostActiveUser ? `
                    <div style="display: flex; align-items: center;">
                        <div style="background-color: #1982c4; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: bold;">★</div>
                        <div>
                            <div style="font-weight: 600; color: #3b4a54;">${stats.mostActiveUser}</div>
                            <div style="font-size: 12px; color: #667781;">${stats.mostActiveUserCount} events</div>
                        </div>
                    </div>` : ''}
                `;
            }
        });
    }

    // Function to display logs
    function displayLogs(filters = {}) {
        var contentElement = document.getElementById('logs-content');
        if (contentElement) {
            // Show loading state
            contentElement.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 200px;">
                    <div style="text-align: center;">
                        <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #008069; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                        <p style="margin-top: 15px; color: #666;">Loading activity logs...</p>
                    </div>
                </div>
            `;

            window.getWhatsAppActivityLogsWithFilters(filters, function (logs) {
                if (contentElement) {
                    if (logs && logs.length > 0) {
                        var html = '<div style="padding: 16px 0;">';

                        logs.forEach(function (log) {
                            var date = new Date(log.timestamp);
                            var formattedDate = date.toLocaleString();
                            var timeAgo = getTimeAgo(log.timestamp);

                            html += `
                                <div style="border-bottom: 1px solid #e0e0e0; padding: 16px 0; transition: background 0.2s; border-radius: 8px; margin-bottom: 4px;">
                                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                        <div>
                                            <div style="font-weight: 600; color: #3b4a54; font-size: 16px;">${log.userName || 'Unknown User'}</div>
                                            <div style="margin-top: 4px; display: flex; align-items: center;">
                                                <span style="background-color: #008069; color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500;">${log.action}</span>
                                                ${log.onWhatsappTab ?
                                    '<span style="background-color: #28a745; color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; margin-left: 8px;">On Tab</span>' :
                                    '<span style="background-color: #ffc107; color: black; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; margin-left: 8px;">Off Tab</span>'}
                                                
                                                <button class="mute-button" data-jid="${log.jid}" title="Mute/Unmute this user" style="
                                                    background: none; 
                                                    border: 1px solid #ddd; 
                                                    border-radius: 4px; 
                                                    margin-left: 10px; 
                                                    cursor: pointer; 
                                                    font-size: 12px;
                                                    padding: 2px 6px;
                                                    color: #667781;
                                                ">
                                                    ${typingNotificationExclusions.has(log.jid) ? '🔇 Muted' : '🔊 Mute'}
                                                </button>
                                            </div>
                                        </div>
                                        <div style="text-align: right;">
                                            <div style="color: #667781; font-size: 14px; font-weight: 500;">${timeAgo}</div>
                                            <div style="color: #8696a0; font-size: 12px; margin-top: 4px;">${formattedDate}</div>
                                        </div>
                                    </div>
                                    <div style="margin-top: 12px; color: #667781; font-size: 14px; display: flex; align-items: center;">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" style="margin-right: 6px; fill: #8696a0;">
                                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                        </svg>
                                        <span style="font-family: monospace;">${log.jid || 'N/A'}</span>
                                    </div>
                                    <div style="margin-top: 8px; color: #8696a0; font-size: 13px; display: flex; align-items: center;">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" style="margin-right: 6px; fill: #8696a0;">
                                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                        </svg>
                                        ${log.pageTitle || 'Unknown Page'}
                                    </div>
                                </div>
                            `;
                        });

                        html += '</div>';
                        html += '</div>';
                        contentElement.innerHTML = html;

                        // Add event delegation for buttons
                        contentElement.onclick = function (e) {
                            var btn = e.target.closest('.mute-button');
                            if (btn) {
                                var jid = btn.getAttribute('data-jid');
                                if (jid) {
                                    window.toggleTypingExclusion(jid);
                                    // Refresh logs to update UI
                                    displayLogs(filters);
                                }
                            }
                        };
                    } else {
                        contentElement.innerHTML = `
                            <div style="display: flex; justify-content: center; align-items: center; height: 200px;">
                                <div style="text-align: center; color: #667781;">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" style="fill: #d1d7db; margin-bottom: 16px;">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                    </svg>
                                    <h3 style="margin: 0 0 8px; font-weight: 500; color: #54656f;">No Activity Logs Found</h3>
                                    <p style="margin: 0; font-size: 14px;">There are no activity logs matching your current filters.</p>
                                </div>
                            </div>
                        `;
                    }
                }
            });
        }
    }

    // Helper function to get time ago
    function getTimeAgo(timestamp) {
        var now = Date.now();
        var seconds = Math.floor((now - timestamp) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
        return Math.floor(seconds / 86400) + 'd ago';
    }

    // Set up filter event handlers
    userFilterInput.addEventListener('input', function () {
        applyFilters();
    });

    tabFilterSelect.addEventListener('change', function () {
        applyFilters();
    });

    refreshButton.onclick = function () {
        applyFilters();
        updateStats();
    };

    function applyFilters() {
        var filters = {};

        if (userFilterInput.value.trim() !== '') {
            filters.userName = userFilterInput.value.trim();
        }

        if (tabFilterSelect.value === 'on') {
            filters.onWhatsappTab = true;
        } else if (tabFilterSelect.value === 'off') {
            filters.onWhatsappTab = false;
        }

        displayLogs(filters);
    }

    // Load logs and stats initially
    displayLogs();
    updateStats();
};

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
wsHook.before = function (originalData, url) {
    var promise = async function (originalData) {

        if (WAPassthrough) return originalData;

        try {
            if (!(originalData instanceof ArrayBuffer || originalData instanceof Uint8Array)) return originalData;

            // encrytped binary payload
            var decryptedFrames = await MultiDevice.decryptNoisePacket(originalData, isIncoming = false);
            if (decryptedFrames == null) return originalData;

            for (var i = 0; i < decryptedFrames.length; i++) {
                var decryptedFrameInfo = decryptedFrames[i];
                var decryptedFrame = decryptedFrameInfo.frame;
                var decryptedFrameOriginal = decryptedFrameInfo.frameUncompressed;
                var counter = decryptedFrameInfo.counter;

                var realNode = await nodeReaderWriter.decodeStanza(decryptedFrameOriginal, gzipInflate);

                var [isAllowed, manipulatedNode] = await NodeHandler.interceptOutgoingNode(realNode);
                decryptedFrames[i] = { node: manipulatedNode, counter: counter };

                if (WAdebugMode || WAPassthroughWithDebug) {
                    printNode(manipulatedNode, isIncoming = false, decryptedFrame.byteLength);
                    if (WAPassthroughWithDebug) return originalData;
                }

                // sanity check that our node parsing is complete
                await checkNodeEncoderSanity(decryptedFrameOriginal, isIncoming = false);
            }

            var packedNode = await MultiDevice.encryptAndPackNodesForSending(decryptedFrames, isIncoming = false);

            var looksEqual = isEqualArray(new Uint8Array(originalData), new Uint8Array(packedNode));
            if (!looksEqual && isAllowed) {
                debugger;
            }

            if (isInitializing) {
                isInitializing = false;
                console.log("WhatsIncognito: Interception is working.");
                document.dispatchEvent(new CustomEvent('onInterceptionWorking', { detail: JSON.stringify({ isInterceptionWorking: true }) }));
            }

            return packedNode;
        }
        catch (exception) {
            if (typeof (exception) == "string" && exception.includes("counter")) {
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
wsHook.after = function (messageEvent, url) {
    var promise = async function (messageEvent) {

        if (WAPassthrough) return messageEvent;

        try {
            var originalData = messageEvent.data;

            if (!(originalData instanceof ArrayBuffer || originalData instanceof Uint8Array)) return messageEvent;

            var decryptedFrames = await MultiDevice.decryptNoisePacket(originalData, isIncoming = true);
            if (decryptedFrames == null) return messageEvent;

            var didBlockNode = false;
            for (var i = 0; i < decryptedFrames.length; i++) {
                var decryptedFrameInfo = decryptedFrames[i];
                var decryptedFrame = decryptedFrameInfo.frame;
                var decryptedFrameOriginal = decryptedFrameInfo.frameUncompressed;
                var counter = decryptedFrameInfo.counter;

                var realNode = await nodeReaderWriter.decodeStanza(decryptedFrameOriginal, gzipInflate);

                if (WAdebugMode || WAPassthroughWithDebug) {
                    printNode(realNode, isIncoming = true, decryptedFrame.byteLength);

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

                if (!isAllowed) {
                    didBlockNode = true;
                }

                decryptedFrames[i] = { node: manipulatedNode, counter: counter, decryptedFrame: decryptedFrame };
            }

            var packet = await MultiDevice.encryptAndPackNodesForSending(decryptedFrames, true);
            if (didBlockNode) messageEvent.data = packet;

            // TODO: compare the original `data` with `packet`

            return messageEvent;
        }
        catch (exception) {
            if (exception.message && exception.message.includes("stream end")) return messageEvent;
            if (typeof (exception) == "string" && exception.includes("counter")) {
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



function onDeletionMessageBlocked(message, remoteJid, messageId, deletedMessageId) {
    // In case the message already appears on screen, mark it in red
    var messageNode = document.querySelector("[data-id*='" + deletedMessageId + "']");
    if (messageNode) {
        messageNode.setAttribute("deleted-message", "true");     // mark the message in red
    }

    document.dispatchEvent(new CustomEvent("pseudoMsgs", {
        detail: deletedMessageId
    }));

    // Now, save the deleted message in the DB after a short wait
    var waitTime = window.WhatsAppAPI != undefined ? 100 : 5000;
    setTimeout(async function () {
        var chat = await getChatByJID(remoteJid);
        if (chat) {
            if (chat.loadEarlierMsgs)
                await chat.loadEarlierMsgs();
            else
                await WhatsAppAPI.LoadEarlierMessages.loadEarlierMsgs(chat);

            var msgs = chat.msgs.getModelsArray();

            for (let i = 0; i < msgs.length; i++) {
                if (msgs[i].id.id == deletedMessageId) {
                    saveDeletedMessage(msgs[i], message.protocolMessage.key, messageId);
                    break;
                }
            }
        }
    }, waitTime);
}

async function decryptE2EMessagesFromNode(node) {
    // decrypt the signal message
    try {
        return MultiDevice.decryptE2EMessagesFromMessageNode(node);
    }
    catch (exception) {
        console.error("Could not decrypt E2E message with type " + node.attrs["type"] + " due to exception:");
        console.error(exception);
        debugger;
    }
}

async function interceptViewOnceMessages(e2eMessage, messageId) {
    if (WAdebugMode) {
        console.log("WhatsIncognito: Checking for view-once message. messageId:", messageId);
        console.log("WhatsIncognito: e2eMessage:", e2eMessage);
        console.log("WhatsIncognito: e2eMessage.viewOnceMessageV2:", e2eMessage.viewOnceMessageV2);
        console.log("WhatsIncognito: e2eMessage.viewOnceMessageV2Extension:", e2eMessage.viewOnceMessageV2Extension);
    }

    // Check if this is a view-once message
    const hasViewOnceV2 = e2eMessage.viewOnceMessageV2 !== null && e2eMessage.viewOnceMessageV2 !== undefined;
    const hasViewOnceV2Extension = e2eMessage.viewOnceMessageV2Extension !== null && e2eMessage.viewOnceMessageV2Extension !== undefined;

    if (WAdebugMode) {
        console.log("WhatsIncognito: hasViewOnceV2:", hasViewOnceV2);
        console.log("WhatsIncognito: hasViewOnceV2Extension:", hasViewOnceV2Extension);
    }

    if (hasViewOnceV2 || hasViewOnceV2Extension) {
        if (WAdebugMode) {
            console.log("WhatsIncognito: Detected view-once message");
        }

        var retrievedMsg = {};
        var type = "";
        var caption = null;

        if (hasViewOnceV2) {
            if (WAdebugMode) {
                console.log("WhatsIncognito: Processing viewOnceMessageV2");
                console.log("WhatsIncognito: viewOnceMessageV2.message:", e2eMessage.viewOnceMessageV2.message);
            }

            if (e2eMessage.viewOnceMessageV2.message.imageMessage !== null && e2eMessage.viewOnceMessageV2.message.imageMessage !== undefined) {
                retrievedMsg = e2eMessage.viewOnceMessageV2.message.imageMessage;
                type = "image";
                caption = retrievedMsg.caption;
                if (WAdebugMode) {
                    console.log("WhatsIncognito: Detected image message in viewOnceMessageV2");
                }
            }
            else if (e2eMessage.viewOnceMessageV2.message.videoMessage !== null && e2eMessage.viewOnceMessageV2.message.videoMessage !== undefined) {
                retrievedMsg = e2eMessage.viewOnceMessageV2.message.videoMessage;
                type = "video";
                caption = retrievedMsg.caption;
                if (WAdebugMode) {
                    console.log("WhatsIncognito: Detected video message in viewOnceMessageV2");
                }
            }
            else if (e2eMessage.viewOnceMessageV2.message.documentMessage !== null && e2eMessage.viewOnceMessageV2.message.documentMessage !== undefined) {
                retrievedMsg = e2eMessage.viewOnceMessageV2.message.documentMessage;
                type = "document";
                caption = retrievedMsg.caption;
                if (WAdebugMode) {
                    console.log("WhatsIncognito: Detected document message in viewOnceMessageV2");
                }
            }
            else {
                if (WAdebugMode) {
                    console.log("WhatsIncognito: Unknown viewOnceMessageV2 type:", e2eMessage.viewOnceMessageV2.message);
                }
                throw new Error("Unknown viewOnceMessageV2 type");
            }
        }
        else if (hasViewOnceV2Extension) {
            if (WAdebugMode) {
                console.log("WhatsIncognito: Processing viewOnceMessageV2Extension");
                console.log("WhatsIncognito: viewOnceMessageV2Extension.message:", e2eMessage.viewOnceMessageV2Extension.message);
            }

            if (e2eMessage.viewOnceMessageV2Extension.message?.audioMessage !== null && e2eMessage.viewOnceMessageV2Extension.message?.audioMessage !== undefined) {
                retrievedMsg = e2eMessage.viewOnceMessageV2Extension.message.audioMessage;
                type = "audio";
                if (WAdebugMode) {
                    console.log("WhatsIncognito: Detected audio message in viewOnceMessageV2Extension");
                }
            }
            else if (e2eMessage.viewOnceMessageV2Extension.message?.imageMessage !== null && e2eMessage.viewOnceMessageV2Extension.message?.imageMessage !== undefined) {
                retrievedMsg = e2eMessage.viewOnceMessageV2Extension.message.imageMessage;
                type = "image";
                caption = retrievedMsg.caption;
                if (WAdebugMode) {
                    console.log("WhatsIncognito: Detected image message in viewOnceMessageV2Extension");
                }
            }
            else if (e2eMessage.viewOnceMessageV2Extension.message?.videoMessage !== null && e2eMessage.viewOnceMessageV2Extension.message?.videoMessage !== undefined) {
                retrievedMsg = e2eMessage.viewOnceMessageV2Extension.message.videoMessage;
                type = "video";
                caption = retrievedMsg.caption;
                if (WAdebugMode) {
                    console.log("WhatsIncognito: Detected video message in viewOnceMessageV2Extension");
                }
            }
            else {
                if (WAdebugMode) {
                    console.log("WhatsIncognito: Unknown viewOnceMessageV2Extension type:", e2eMessage.viewOnceMessageV2Extension?.message);
                }
                throw new Error("Unknown viewOnceMessageV2 or viewOnceMessageV2Extension type");
            }
        }

        if (WAdebugMode) {
            console.log("WhatsIncognito: Processing view-once message of type:", type);
            console.log("WhatsIncognito: Retrieved message:", retrievedMsg);
        }

        // Make sure we have a valid message
        if (!retrievedMsg || Object.keys(retrievedMsg).length === 0) {
            if (WAdebugMode) {
                console.log("WhatsIncognito: No valid message retrieved, skipping");
            }
            return;
        }

        // Check that we have the required properties
        if (!retrievedMsg.mediaKey || !retrievedMsg.fileEncSha256 || !retrievedMsg.fileSha256 || !retrievedMsg.directPath || !retrievedMsg.mimetype) {
            if (WAdebugMode) {
                console.log("WhatsIncognito: Missing required properties in retrieved message:", retrievedMsg);
            }
            return;
        }

        const mediaKeyEncoded = btoa(String.fromCharCode.apply(null, retrievedMsg.mediaKey));
        const encodedencFileHash = btoa(String.fromCharCode.apply(null, retrievedMsg.fileEncSha256));
        const encodedfileSha256 = btoa(String.fromCharCode.apply(null, retrievedMsg.fileSha256));

        if (window.WhatsAppAPI !== undefined) {
            try {
                const decryptedData = await WhatsAppAPI.downloadManager.downloadAndMaybeDecrypt({
                    directPath: retrievedMsg.directPath,
                    encFilehash: encodedencFileHash, filehash: encodedfileSha256, mediaKey: mediaKeyEncoded,
                    type: type, signal: (new AbortController).signal
                });

                body = arrayBufferToBase64(decryptedData);
                dataURI = "data:" + retrievedMsg.mimetype + ";base64," + body;

                // Get sender information
                const senderInfo = await getSenderInfo(messageId);

                // store in indexedDB called "viewOnce" with messageID and dataURI 
                var viewOnceDBOpenRequest = indexedDB.open("viewOnce", 3); // Updated version
                viewOnceDBOpenRequest.onupgradeneeded = function (event) {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('msgs')) {
                        var store = db.createObjectStore('msgs', { keyPath: 'id' });
                        if (WAdebugMode) {
                            console.log('WhatsIncognito: ViewOnce messages database generated');
                        }
                        store.createIndex("id_index", "id");
                        store.createIndex("timestamp_index", "timestamp");
                    }
                };
                viewOnceDBOpenRequest.onerror = function (e) {
                    console.error("WhatsIncognito: Error opening viewOnce database");
                    console.error("Error", viewOnceDBOpenRequest);
                    console.error(e);
                };
                viewOnceDBOpenRequest.onsuccess = () => {
                    var viewOnceDB = viewOnceDBOpenRequest.result;
                    var viewOnceTransaction = viewOnceDB.transaction('msgs', "readwrite");
                    var viewOnceRequest = viewOnceTransaction.objectStore("msgs").add({
                        id: messageId,
                        dataURI: dataURI,
                        caption: caption,
                        type: type,
                        mimetype: retrievedMsg.mimetype,
                        timestamp: Date.now(),
                        senderInfo: senderInfo
                    });
                    viewOnceRequest.onerror = (e) => {
                        if (viewOnceRequest.error.name == "ConstraintError") {
                            if (WAdebugMode) {
                                console.log("WhatsIncognito: Not saving viewOnce message because the message ID already exists");
                            }
                        }
                        else {
                            console.warn("WhatsIncognito: Unexpected error saving viewOnce message", e);
                        }
                    };
                    viewOnceRequest.onsuccess = () => {
                        if (WAdebugMode) {
                            console.log("WhatsIncognito: Successfully saved viewOnce message with ID:", messageId);
                        }
                        // Dispatch event to notify UI
                        document.dispatchEvent(new CustomEvent("onViewOnceMessageSaved", { detail: { messageId: messageId } }));
                    };
                };
            } catch (error) {
                console.error("WhatsIncognito: Error decrypting viewOnce message:", error);
            }
        }
        else {
            // retry in 5 seconds
            // don't know why it's 5 seconds, but that's what is done for decrypting deleted messages 
            setTimeout(function () {
                interceptViewOnceMessages(e2eMessage, messageId)
            }, 5000);
        }
    }
    else {
        if (WAdebugMode) {
            console.log("WhatsIncognito: Not a view-once message or missing viewOnceMessageV2/viewOnceMessageV2Extension");
        }
    }
}

// Helper function to get sender information
async function getSenderInfo(messageId) {
    try {
        // This is a placeholder - in a real implementation, you would extract
        // sender information from the message context
        return {
            name: "Unknown Sender",
            jid: "unknown@s.whatsapp.net",
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error("Error getting sender info:", error);
        return {
            name: "Unknown Sender",
            jid: "unknown@s.whatsapp.net",
            timestamp: new Date().toISOString()
        };
    }
}

function printNode(node, isIncoming = false, decryptedFrameLength) {
    var objectToPrint = xmlDebugging ? nodeToElement(node) : node;
    if (isIncoming) {
        console.log("[In] Received binary (" + decryptedFrameLength + " bytes, decrypted)): ");
    }
    else {
        console.log("[Out] Sending binary (" + decryptedFrameLength + " bytes, decrypted): ");
    }

    console.log(node);

    if (xmlDebugging) {
        console.dirxml(objectToPrint);
        objectToPrint.remove();
    }
    else {
        console.log(objectToPrint);
    }
}



//
// Miscellaneous 
//

function exposeWhatsAppAPI() {
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

    if (window.WhatsAppAPI.Seen == undefined) {
        console.error("WhatsAppWebIncognito: Can't find the WhatsApp API. Stuff might not work.");
    }
}

function initialize() {
    if (WALogs)
        hookLogs();
    initializeDeletedMessagesDB();

    // Load exclusions
    var storedExclusions = localStorage.getItem("WAIncognito_TypingExclusions");
    if (storedExclusions) {
        try {
            typingNotificationExclusions = new Set(JSON.parse(storedExclusions));
            console.log("WAIncognito: Loaded " + typingNotificationExclusions.size + " typing exclusions.");
        } catch (e) {
            console.error("WAIncognito: Error loading typing exclusions", e);
        }
    }

    // Start the stay online functionality
    startStayOnline();
}

function hookLogs() {
    // we don't want extension-related errors to be silently sent out

    var originalSendLogs = window.SEND_LOGS;
    var originalOnUnhandledRejection = window.onunhandledrejection;
    var originalLog = window.__LOG__; // TODO: Find log function for 2.3000 ( d("WALogger").LOG,  d("WALogger").ERROR ?)

    Object.defineProperty(window, 'onunhandledrejection', {
        set: function (value) { originalOnUnhandledRejection = value; },
        get: function () { return hookedPromiseError; }
    });
    Object.defineProperty(window, '__LOG__', {
        set: function (value) { originalLog = value; },
        get: function () { return hookedLog; }
    });

    function hookedPromiseError(event) {
        debugger;
        console.error("Unhandled promise rejection:");
        console.error(errorObject);
        return originalOnUnhandledRejection.call(event);
    }

    function hookedLog(errorLevel) {
        return function (strings, values) {
            var message = "[WhatsApp][" + errorLevel + "] -- " + makeLogMessage(arguments);

            if (errorLevel <= 2 && WAdebugMode) {
                console.log(message);
            }
            else if (errorLevel > 2 && WAdebugMode) {
                console.error(message);
            }
            else if (errorLevel > 2) {
                console.info(message);
            }

            if (originalLog) {
                var originalLogFn = originalLog(errorLevel);
                return originalLogFn.apply(null, arguments);
            }

        };
    }
}

function initializeDeletedMessagesDB() {
    var deletedDBOpenRequest = indexedDB.open("deletedMsgs", 2);

    deletedDBOpenRequest.onupgradeneeded = function (event) {
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

        switch (event.oldVersion) {
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
    deletedDBOpenRequest.onerror = function (e) {
        console.error("WhatsIncognito: Error opening database");
        console.error("Error", deletedDBOpenRequest);
        console.error(e);
    };
    deletedDBOpenRequest.onsuccess = () => {
        window.deletedMessagesDB = deletedDBOpenRequest.result;
    }
}

async function saveDeletedMessage(retrievedMsg, deletedMessageKey, revokeMessageID) {
    // Determine author data
    let author = deletedMessageKey.participant.split("@")[0].split(":")[0]

    let body = "";
    let isMedia = false;

    // Stickers & Documents are not considered media for some reason, so we have to check if it has a mediaKey and also set isMedia == true
    if (retrievedMsg.isMedia || retrievedMsg.mediaKey) {
        isMedia = true;

        // get extended media key              
        try {
            const decryptedData = await WhatsAppAPI.downloadManager.downloadAndMaybeDecrypt({
                directPath: retrievedMsg.directPath,
                encFilehash: retrievedMsg.encFilehash, filehash: retrievedMsg.filehash, mediaKey: retrievedMsg.mediaKey,
                type: retrievedMsg.type, signal: (new AbortController).signal
            });

            body = arrayBufferToBase64(decryptedData);

        }
        catch (e) { console.error(e); }
    }
    else {
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

    if ("id" in deletedMsgContents) {
        const transcation = window.deletedMessagesDB.transaction('msgs', "readwrite");
        let request = transcation.objectStore("msgs").add(deletedMsgContents);
        request.onerror = (e) => {
            if (request.error.name == "ConstraintError") {
                // ConstraintError occurs when an object with the same id already exists
                // This will happen when we get the revoke message again from the server
                console.log("WhatsIncognito: Not saving message becuase the message ID already exists");
            }
            else {
                console.log("WhatsIncognito: Unexpected error saving deleted message");
            }
        };
        request.onsuccess = (e) => {
            console.log("WhatsIncognito: Saved deleted message with ID " + deletedMsgContents.id + " from " + deletedMsgContents.from + " successfully.");
        }
    }
    else {
        console.log("WhatsIncognito: Deleted message contents not found");
    }
}

async function checkNodeEncoderSanity(originalFrame, isIncoming = false) {
    var flags = new Uint8Array(originalFrame)[0];
    var decryptedFrameOpened = originalFrame.slice(1);
    if (flags & 2) {
        // zlib compressed. decompress
        decryptedFrameOpened = toArrayBuffer(pako.inflate(new Uint8Array(decryptedFrameOpened)));
    }

    var realNode = await nodeReaderWriter.decodeStanza(originalFrame, gzipInflate);

    // sanity check that our node parsing is deterministic
    var encodedNodeData = await nodeReaderWriter.encodeStanza(realNode, isIncoming);
    var looksGood = isEqualArray(new Uint8Array(decryptedFrameOpened), encodedNodeData.slice(1));
    if (!looksGood && !isIncoming) {
        debugger;
    }
    if (!looksGood && isIncoming) {
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

            if (typingNotificationExclusions.has(jidString)) {
                if (WAdebugMode) console.log("Skipping typing notification for excluded JID: " + jidString);
                return;
            }

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

                    if (typingNotificationExclusions.has(jidString)) {
                        if (WAdebugMode) console.log("Skipping typing notification for excluded JID: " + jidString);
                        break;
                    }

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

        // Try to get display name using WPP library first (highest priority)
        if (typeof getDisplayNameFromWPP !== 'undefined') {
            try {
                const wppName = await getDisplayNameFromWPP(jidString);
                if (wppName && wppName.trim() !== '') {
                    if (WAdebugMode) {
                        console.log("[Typing Notification] Using WPP display name: " + wppName);
                    }
                    return wppName;
                }
            } catch (wppError) {
                if (WAdebugMode) {
                    console.log("[Typing Notification] Error using WPP library:", wppError);
                }
            }
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

                    // Try ContactStore if available
                    if (!contact && WhatsAppAPI.Store.ContactStore && WhatsAppAPI.Store.ContactStore.get) {
                        contact = WhatsAppAPI.Store.ContactStore.get(lidNumber);
                    }

                    if (contact) {
                        if (WAdebugMode) {
                            console.log("[Typing Notification] Found contact by LID:", contact);
                        }

                        // Try multiple name properties in order of preference
                        var nameProperties = ['displayName', 'name', 'formattedName', 'pushname', 'shortName'];
                        for (var i = 0; i < nameProperties.length; i++) {
                            var prop = nameProperties[i];
                            if (contact[prop] && contact[prop].trim() !== '') {
                                if (WAdebugMode) {
                                    console.log("[Typing Notification] Using LID contact " + prop + ": " + contact[prop]);
                                }
                                return contact[prop];
                            }
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

                    // Try multiple name properties in order of preference
                    var nameProperties = ['displayName', 'name', 'formattedName', 'pushname', 'shortName'];
                    for (var i = 0; i < nameProperties.length; i++) {
                        var prop = nameProperties[i];
                        if (chat.contact[prop] && chat.contact[prop].trim() !== '') {
                            if (WAdebugMode) {
                                console.log("[Typing Notification] Using " + prop + ": " + chat.contact[prop]);
                            }
                            return chat.contact[prop];
                        }
                    }
                }

                // Try to get name from chat itself
                var chatNameProperties = ['name', 'formattedTitle', 'title'];
                for (var i = 0; i < chatNameProperties.length; i++) {
                    var prop = chatNameProperties[i];
                    if (chat[prop] && chat[prop].trim() !== '') {
                        if (WAdebugMode) {
                            console.log("[Typing Notification] Using chat " + prop + ": " + chat[prop]);
                        }
                        return chat[prop];
                    }
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
                                var nameProperties = ['displayName', 'name', 'formattedName', 'pushname', 'shortName'];
                                for (var i = 0; i < nameProperties.length; i++) {
                                    var prop = nameProperties[i];
                                    if (chatData.contact[prop] && chatData.contact[prop].trim() !== '') {
                                        if (WAdebugMode) {
                                            console.log("[Typing Notification] Using GUI " + prop + ": " + chatData.contact[prop]);
                                        }
                                        return chatData.contact[prop];
                                    }
                                }
                            }

                            var chatNameProperties = ['name', 'formattedTitle', 'title'];
                            for (var i = 0; i < chatNameProperties.length; i++) {
                                var prop = chatNameProperties[i];
                                if (chatData[prop] && chatData[prop].trim() !== '') {
                                    if (WAdebugMode) {
                                        console.log("[Typing Notification] Using GUI chat " + prop + ": " + chatData[prop]);
                                    }
                                    return chatData[prop];
                                }
                            }
                        }
                    }
                }
            } catch (guiError) {
                if (WAdebugMode) {
                    console.log("[Typing Notification] Error getting name from GUI:", guiError);
                }
            }

            // Try to get from Contact store directly
            try {
                if (WhatsAppAPI.Store && WhatsAppAPI.Store.Contact) {
                    var contactJid = jidString.split('@')[0];
                    if (contactJid.includes(':')) {
                        contactJid = contactJid.split(':')[0];
                    }

                    var contact = WhatsAppAPI.Store.Contact.get(contactJid);
                    if (contact) {
                        if (WAdebugMode) {
                            console.log("[Typing Notification] Found contact directly:", contact);
                        }

                        var nameProperties = ['displayName', 'name', 'formattedName', 'pushname', 'shortName'];
                        for (var i = 0; i < nameProperties.length; i++) {
                            var prop = nameProperties[i];
                            if (contact[prop] && contact[prop].trim() !== '') {
                                if (WAdebugMode) {
                                    console.log("[Typing Notification] Using direct contact " + prop + ": " + contact[prop]);
                                }
                                return contact[prop];
                            }
                        }
                    }
                }
            } catch (contactError) {
                if (WAdebugMode) {
                    console.log("[Typing Notification] Error getting contact directly:", contactError);
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

        // Store typing log
        storeTypingLog(displayName, jid);

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
            setTimeout(function () {
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
        Notification.requestPermission().then(function (permission) {
            if (permission === 'granted') {
                createSystemNotification(displayName);
            }
        }).catch(function (error) {
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

// Function to store typing logs
function storeTypingLog(displayName, jid) {
    try {
        // Get additional information
        var currentPageTitle = document.title || "WhatsApp Web";
        var currentUrl = window.location.href || "https://web.whatsapp.com";

        // Create log entry
        var logEntry = {
            id: generateLogId(),
            userName: displayName,
            jid: jid,
            action: "Typing",
            dateTime: new Date().toISOString(),
            timestamp: Date.now(),
            onWhatsappTab: isWindowVisible(),
            pageTitle: currentPageTitle,
            pageUrl: currentUrl,
            userAgent: navigator.userAgent,
            language: navigator.language || "unknown"
        };

        // Log for debugging
        if (WAdebugMode) {
            console.log("[Typing Notification] Storing log entry:", logEntry);
        }

        // Send message to background script to store the log
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            try {
                if (WAdebugMode) {
                    console.log("[Typing Notification] Sending log to background:", logEntry);
                }

                // Try to get the extension ID dynamically first, fallback to hardcoded if needed
                var extensionId = chrome.runtime.id || "jcklcfpggniemgobbcfjdnlbkegeehgg";

                // Test if background script is available
                chrome.runtime.sendMessage(extensionId, {
                    name: "ping"
                }, function (response) {
                    if (chrome.runtime.lastError) {
                        if (WAdebugMode) {
                            console.log("[Typing Notification] Background script not available, using localStorage");
                        }
                        // Fallback to localStorage if background script is not available
                        fallbackToLocalStorage(logEntry);
                    } else {
                        // Background script is available, send the actual log
                        chrome.runtime.sendMessage(extensionId, {
                            name: "storeTypingLog",
                            logEntry: logEntry
                        }, function (response) {
                            if (chrome.runtime.lastError) {
                                if (WAdebugMode) {
                                    console.log("[Typing Notification] Error sending log to background:", chrome.runtime.lastError);
                                }
                                // Fallback to localStorage if messaging fails
                                fallbackToLocalStorage(logEntry);
                            } else if (WAdebugMode) {
                                console.log("[Typing Notification] Successfully sent log to background");
                            }
                        });
                    }
                });
            } catch (sendMessageError) {
                if (WAdebugMode) {
                    console.log("[Typing Notification] Error sending message to background:", sendMessageError);
                }
                // Fallback to localStorage if messaging fails
                fallbackToLocalStorage(logEntry);
            }
        } else {
            if (WAdebugMode) {
                console.log("[Typing Notification] chrome.runtime not available, using localStorage");
            }
            // Fallback to localStorage if chrome.runtime is not available
            fallbackToLocalStorage(logEntry);
        }
    } catch (error) {
        if (WAdebugMode) {
            console.log("[Typing Notification] Error in storeTypingLog:", error);
        }
    }
}

// Fallback function to store logs in localStorage
function fallbackToLocalStorage(logEntry) {
    try {
        var existingLogs = [];
        try {
            var storedLogs = localStorage.getItem('whatsappActivityLogs');
            if (storedLogs) {
                existingLogs = JSON.parse(storedLogs);
            }
        } catch (parseError) {
            if (WAdebugMode) {
                console.log("[Typing Notification] Error parsing existing logs:", parseError);
            }
            existingLogs = [];
        }

        // Add new log entry
        existingLogs.push(logEntry);

        // Keep only the last 1000 entries to prevent storage overflow
        if (existingLogs.length > 1000) {
            existingLogs = existingLogs.slice(-1000);
        }

        // Save back to localStorage
        try {
            localStorage.setItem('whatsappActivityLogs', JSON.stringify(existingLogs));
        } catch (storageError) {
            if (WAdebugMode) {
                console.log("[Typing Notification] Error storing logs in localStorage:", storageError);
            }
        }
    } catch (error) {
        if (WAdebugMode) {
            console.log("[Typing Notification] Error in fallbackToLocalStorage:", error);
        }
    }
}

// Function to generate a unique log ID
function generateLogId() {
    return 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function isWindowVisible() {
    try {
        // Check if document is visible
        if (typeof document.hidden !== 'undefined') {
            return !document.hidden;
        } else if (typeof document.msHidden !== 'undefined') {
            return !document.msHidden;
        } else if (typeof document.webkitHidden !== 'undefined') {
            return !document.webkitHidden;
        }

        // Fallback: check if window is focused
        return document.hasFocus();
    } catch (error) {
        if (WAdebugMode) {
            console.log("[Typing Notification] Error checking window visibility:", error);
        }
        return true; // Assume visible if we can't determine
    }
}

// Function to retrieve typing logs
function getTypingLogs(callback) {
    try {
        // Send message to background script to retrieve logs
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            try {
                // Try to get the extension ID dynamically first, fallback to hardcoded if needed
                var extensionId = chrome.runtime.id || "jcklcfpggniemgobbcfjdnlbkegeehgg";

                chrome.runtime.sendMessage(extensionId, {
                    name: "getTypingLogs"
                }, function (response) {
                    if (chrome.runtime.lastError) {
                        if (WAdebugMode) {
                            console.log("[Typing Notification] Error getting logs from background:", chrome.runtime.lastError);
                        }
                        // Fallback to localStorage if messaging fails
                        fallbackGetTypingLogs(callback);
                    } else {
                        if (callback && typeof callback === 'function') {
                            callback(response.logs || []);
                        }
                    }
                });
            } catch (sendMessageError) {
                if (WAdebugMode) {
                    console.log("[Typing Notification] Error sending message to background:", sendMessageError);
                }
                // Fallback to localStorage if messaging fails
                fallbackGetTypingLogs(callback);
            }
        } else {
            // Fallback to localStorage if chrome.runtime is not available
            fallbackGetTypingLogs(callback);
        }
    } catch (error) {
        if (WAdebugMode) {
            console.log("[Typing Notification] Error retrieving logs:", error);
        }
        if (callback && typeof callback === 'function') {
            callback([]);
        }
    }
}

// Fallback function to get logs from localStorage
function fallbackGetTypingLogs(callback) {
    try {
        var storedLogs = localStorage.getItem('whatsappActivityLogs');
        if (storedLogs) {
            var parsedLogs = JSON.parse(storedLogs);
            if (callback && typeof callback === 'function') {
                callback(parsedLogs);
            }
            return;
        }
        if (callback && typeof callback === 'function') {
            callback([]);
        }
    } catch (error) {
        if (WAdebugMode) {
            console.log("[Typing Notification] Error retrieving logs from localStorage:", error);
        }
        if (callback && typeof callback === 'function') {
            callback([]);
        }
    }
}

// Function to retrieve typing logs with filtering and pagination
function getTypingLogsWithFilters(options, callback) {
    try {
        // Send message to background script to retrieve filtered logs
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            try {
                // Try to get the extension ID dynamically first, fallback to hardcoded if needed
                var extensionId = chrome.runtime.id || "jcklcfpggniemgobbcfjdnlbkegeehgg";

                chrome.runtime.sendMessage(extensionId, {
                    name: "getTypingLogsWithFilters",
                    options: options
                }, function (response) {
                    if (chrome.runtime.lastError) {
                        if (WAdebugMode) {
                            console.log("[Typing Notification] Error getting filtered logs from background:", chrome.runtime.lastError);
                        }
                        // Fallback to client-side filtering if messaging fails
                        fallbackGetTypingLogsWithFilters(options, callback);
                    } else {
                        if (callback && typeof callback === 'function') {
                            callback(response.logs || []);
                        }
                    }
                });
            } catch (sendMessageError) {
                if (WAdebugMode) {
                    console.log("[Typing Notification] Error sending message to background:", sendMessageError);
                }
                // Fallback to client-side filtering if messaging fails
                fallbackGetTypingLogsWithFilters(options, callback);
            }
        } else {
            // Fallback to client-side filtering if chrome.runtime is not available
            fallbackGetTypingLogsWithFilters(options, callback);
        }
    } catch (error) {
        if (WAdebugMode) {
            console.log("[Typing Notification] Error retrieving filtered logs:", error);
        }
        if (callback && typeof callback === 'function') {
            callback([]);
        }
    }
}

// Fallback function for client-side filtering
function fallbackGetTypingLogsWithFilters(options, callback) {
    try {
        fallbackGetTypingLogs(function (allLogs) {
            try {
                // Apply filters if provided
                if (options) {
                    // Filter by user name
                    if (options.userName) {
                        allLogs = allLogs.filter(log =>
                            log.userName && log.userName.toLowerCase().includes(options.userName.toLowerCase())
                        );
                    }

                    // Filter by date range
                    if (options.startDate) {
                        var startDate = new Date(options.startDate).getTime();
                        allLogs = allLogs.filter(log => log.timestamp >= startDate);
                    }

                    if (options.endDate) {
                        var endDate = new Date(options.endDate).getTime();
                        allLogs = allLogs.filter(log => log.timestamp <= endDate);
                    }

                    // Filter by tab visibility
                    if (options.onWhatsappTab !== undefined) {
                        allLogs = allLogs.filter(log => log.onWhatsappTab === options.onWhatsappTab);
                    }
                }

                // Sort by timestamp (newest first)
                allLogs.sort((a, b) => b.timestamp - a.timestamp);

                // Apply pagination if provided
                if (options && options.page !== undefined && options.pageSize !== undefined) {
                    var startIndex = (options.page - 1) * options.pageSize;
                    var endIndex = startIndex + options.pageSize;
                    allLogs = allLogs.slice(startIndex, endIndex);
                }

                if (callback && typeof callback === 'function') {
                    callback(allLogs);
                }
            } catch (filterError) {
                if (WAdebugMode) {
                    console.log("[Typing Notification] Error filtering logs:", filterError);
                }
                if (callback && typeof callback === 'function') {
                    callback([]);
                }
            }
        });
    } catch (error) {
        if (WAdebugMode) {
            console.log("[Typing Notification] Error in fallbackGetTypingLogsWithFilters:", error);
        }
        if (callback && typeof callback === 'function') {
            callback([]);
        }
    }
}

// Function to get typing log statistics
function getTypingLogStats(callback) {
    try {
        // Send message to background script to retrieve stats
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            try {
                // Try to get the extension ID dynamically first, fallback to hardcoded if needed
                var extensionId = chrome.runtime.id || "jcklcfpggniemgobbcfjdnlbkegeehgg";

                chrome.runtime.sendMessage(extensionId, {
                    name: "getTypingLogStats"
                }, function (response) {
                    if (chrome.runtime.lastError) {
                        if (WAdebugMode) {
                            console.log("[Typing Notification] Error getting stats from background:", chrome.runtime.lastError);
                        }
                        // Fallback to client-side stats calculation if messaging fails
                        fallbackGetTypingLogStats(callback);
                    } else {
                        if (callback && typeof callback === 'function') {
                            callback(response.stats || {
                                totalLogs: 0,
                                uniqueUsers: 0,
                                onTabCount: 0,
                                offTabCount: 0,
                                mostActiveUser: null,
                                mostActiveUserCount: 0
                            });
                        }
                    }
                });
            } catch (sendMessageError) {
                if (WAdebugMode) {
                    console.log("[Typing Notification] Error sending message to background:", sendMessageError);
                }
                // Fallback to client-side stats calculation if messaging fails
                fallbackGetTypingLogStats(callback);
            }
        } else {
            // Fallback to client-side stats calculation if chrome.runtime is not available
            fallbackGetTypingLogStats(callback);
        }
    } catch (error) {
        if (WAdebugMode) {
            console.log("[Typing Notification] Error retrieving log stats:", error);
        }
        if (callback && typeof callback === 'function') {
            callback({
                totalLogs: 0,
                uniqueUsers: 0,
                onTabCount: 0,
                offTabCount: 0,
                mostActiveUser: null,
                mostActiveUserCount: 0
            });
        }
    }
}

// Fallback function for client-side stats calculation
function fallbackGetTypingLogStats(callback) {
    try {
        fallbackGetTypingLogs(function (allLogs) {
            try {
                if (allLogs.length === 0) {
                    var emptyStats = {
                        totalLogs: 0,
                        uniqueUsers: 0,
                        onTabCount: 0,
                        offTabCount: 0,
                        mostActiveUser: null,
                        mostActiveUserCount: 0
                    };
                    if (callback && typeof callback === 'function') {
                        callback(emptyStats);
                    }
                    return;
                }

                // Count statistics
                var userCounts = {};
                var onTabCount = 0;
                var offTabCount = 0;

                allLogs.forEach(log => {
                    // Count user occurrences
                    if (log.userName) {
                        userCounts[log.userName] = (userCounts[log.userName] || 0) + 1;
                    }

                    // Count tab visibility
                    if (log.onWhatsappTab) {
                        onTabCount++;
                    } else {
                        offTabCount++;
                    }
                });

                // Find most active user
                var mostActiveUser = null;
                var mostActiveUserCount = 0;

                for (var user in userCounts) {
                    if (userCounts[user] > mostActiveUserCount) {
                        mostActiveUser = user;
                        mostActiveUserCount = userCounts[user];
                    }
                }

                var stats = {
                    totalLogs: allLogs.length,
                    uniqueUsers: Object.keys(userCounts).length,
                    onTabCount: onTabCount,
                    offTabCount: offTabCount,
                    mostActiveUser: mostActiveUser,
                    mostActiveUserCount: mostActiveUserCount
                };

                if (callback && typeof callback === 'function') {
                    callback(stats);
                }
            } catch (statsError) {
                if (WAdebugMode) {
                    console.log("[Typing Notification] Error calculating log stats:", statsError);
                }
                if (callback && typeof callback === 'function') {
                    callback({
                        totalLogs: 0,
                        uniqueUsers: 0,
                        onTabCount: 0,
                        offTabCount: 0,
                        mostActiveUser: null,
                        mostActiveUserCount: 0
                    });
                }
            }
        });
    } catch (error) {
        if (WAdebugMode) {
            console.log("[Typing Notification] Error in fallbackGetTypingLogStats:", error);
        }
        if (callback && typeof callback === 'function') {
            callback({
                totalLogs: 0,
                uniqueUsers: 0,
                onTabCount: 0,
                offTabCount: 0,
                mostActiveUser: null,
                mostActiveUserCount: 0
            });
        }
    }
}

// Function to clear typing logs
function clearTypingLogs(callback) {
    try {
        // Send message to background script to clear logs
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            try {
                // Try to get the extension ID dynamically first, fallback to hardcoded if needed
                var extensionId = chrome.runtime.id || "jcklcfpggniemgobbcfjdnlbkegeehgg";

                chrome.runtime.sendMessage(extensionId, {
                    name: "clearTypingLogs"
                }, function (response) {
                    if (chrome.runtime.lastError) {
                        if (WAdebugMode) {
                            console.log("[Typing Notification] Error clearing logs in background:", chrome.runtime.lastError);
                        }
                        // Fallback to localStorage if messaging fails
                        fallbackClearTypingLogs(callback);
                    } else {
                        if (WAdebugMode) {
                            console.log("[Typing Notification] Typing logs cleared in background");
                        }
                        if (callback && typeof callback === 'function') {
                            callback();
                        }
                    }
                });
            } catch (sendMessageError) {
                if (WAdebugMode) {
                    console.log("[Typing Notification] Error sending message to background:", sendMessageError);
                }
                // Fallback to localStorage if messaging fails
                fallbackClearTypingLogs(callback);
            }
        } else {
            // Fallback to localStorage if chrome.runtime is not available
            fallbackClearTypingLogs(callback);
        }
    } catch (error) {
        if (WAdebugMode) {
            console.log("[Typing Notification] Error clearing logs:", error);
        }
        if (callback && typeof callback === 'function') {
            callback();
        }
    }
}

// Fallback function to clear logs from localStorage
function fallbackClearTypingLogs(callback) {
    try {
        localStorage.removeItem('whatsappActivityLogs');
        if (WAdebugMode) {
            console.log("[Typing Notification] Activity logs cleared from localStorage");
        }
        if (callback && typeof callback === 'function') {
            callback();
        }
    } catch (error) {
        if (WAdebugMode) {
            console.log("[Typing Notification] Error clearing logs from localStorage:", error);
        }
        if (callback && typeof callback === 'function') {
            callback();
        }
    }
}

// Function to export typing logs
function exportTypingLogs(format, callback) {
    try {
        // Send message to background script to export logs
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            try {
                // Try to get the extension ID dynamically first, fallback to hardcoded if needed
                var extensionId = chrome.runtime.id || "jcklcfpggniemgobbcfjdnlbkegeehgg";

                chrome.runtime.sendMessage(extensionId, {
                    name: "exportTypingLogs",
                    format: format
                }, function (response) {
                    if (chrome.runtime.lastError) {
                        if (WAdebugMode) {
                            console.log("[Typing Notification] Error exporting logs from background:", chrome.runtime.lastError);
                        }
                        // Fallback to client-side export if messaging fails
                        fallbackExportTypingLogs(format, callback);
                    } else {
                        if (callback && typeof callback === 'function') {
                            callback(response.data || null);
                        }
                    }
                });
            } catch (sendMessageError) {
                if (WAdebugMode) {
                    console.log("[Typing Notification] Error sending message to background:", sendMessageError);
                }
                // Fallback to client-side export if messaging fails
                fallbackExportTypingLogs(format, callback);
            }
        } else {
            // Fallback to client-side export if chrome.runtime is not available
            fallbackExportTypingLogs(format, callback);
        }
    } catch (error) {
        if (WAdebugMode) {
            console.log("[Typing Notification] Error exporting logs:", error);
        }
        if (callback && typeof callback === 'function') {
            callback(null);
        }
    }
}

// Fallback function for client-side export
function fallbackExportTypingLogs(format, callback) {
    try {
        fallbackGetTypingLogs(function (logs) {
            try {
                var exportedData = null;

                if (format === 'csv') {
                    // Convert to CSV format
                    var csvContent = "ID,User Name,JID,Action,Date Time,On WhatsApp Tab,Page Title,Page URL,Timestamp\n";
                    logs.forEach(log => {
                        csvContent += `"${log.id || ''}","${log.userName || ''}","${log.jid || ''}","${log.action || ''}","${log.dateTime || ''}","${log.onWhatsappTab || false}","${log.pageTitle || ''}","${log.pageUrl || ''}","${log.timestamp || ''}"\n`;
                    });
                    exportedData = csvContent;
                } else if (format === 'txt') {
                    // Convert to plain text format
                    var textContent = "WhatsApp Typing Logs\n\n";
                    logs.forEach(log => {
                        textContent += `User: ${log.userName || 'Unknown'}\n`;
                        textContent += `Action: ${log.action || 'Unknown'}\n`;
                        textContent += `Date/Time: ${log.dateTime || 'Unknown'}\n`;
                        textContent += `On WhatsApp Tab: ${log.onWhatsappTab ? 'Yes' : 'No'}\n`;
                        textContent += `Page: ${log.pageTitle || 'Unknown'}\n`;
                        textContent += `------------------------\n`;
                    });
                    exportedData = textContent;
                } else {
                    // Default to JSON
                    exportedData = JSON.stringify(logs, null, 2);
                }

                if (callback && typeof callback === 'function') {
                    callback(exportedData);
                }
            } catch (exportError) {
                if (WAdebugMode) {
                    console.log("[Typing Notification] Error exporting logs:", exportError);
                }
                if (callback && typeof callback === 'function') {
                    callback(null);
                }
            }
        });
    } catch (error) {
        if (WAdebugMode) {
            console.log("[Typing Notification] Error in fallbackExportTypingLogs:", error);
        }
        if (callback && typeof callback === 'function') {
            callback(null);
        }
    }
}

// Function to load all chats efficiently for autocomplete
function getAllChatsSimple() {
    try {
        var allChats = null;

        // Priority 1: Use WPP if available (User Priority)
        if (typeof window.WPP !== 'undefined' && window.WPP.chat && typeof window.WPP.chat.list === 'function') {
            try {
                allChats = window.WPP.chat.list();
                if (WAdebugMode) console.log("WAIncognito: Retrieved chats using WPP");
            } catch (e) {
                console.error("WAIncognito: Error retrieving chats from WPP", e);
            }
        }

        // Priority 2: Use WhatsAppAPI (Internal)
        if (!allChats && window.WhatsAppAPI) {
            if (WhatsAppAPI.ChatCollection && typeof WhatsAppAPI.ChatCollection.getAll === 'function') {
                allChats = WhatsAppAPI.ChatCollection.getAll();
            } else if (WhatsAppAPI.Store) {
                if (WhatsAppAPI.Store.Chat && WhatsAppAPI.Store.Chat.models) allChats = WhatsAppAPI.Store.Chat.models;
                else if (WhatsAppAPI.Store.Chats && WhatsAppAPI.Store.Chats.models) allChats = WhatsAppAPI.Store.Chats.models;
            }
        }

        if (!allChats) return [];

        if (typeof allChats.toArray === 'function') allChats = allChats.toArray();
        if (!Array.isArray(allChats) && typeof allChats === 'object') allChats = Object.values(allChats);
        if (!Array.isArray(allChats)) return [];

        return allChats.map(function (chat) {
            var jid = 'Unknown';
            // Handle WPP structure (often properties are directly on the object) or Store structure

            // Try to find JID
            if (chat.id) {
                if (typeof chat.id === 'object' && chat.id._serialized) jid = chat.id._serialized;
                else if (typeof chat.id === 'string') jid = chat.id;
            } else if (chat.jid) {
                if (typeof chat.jid === 'object' && chat.jid._serialized) jid = chat.jid._serialized;
                else if (typeof chat.jid === 'string') jid = chat.jid;
            }

            if (typeof jid === 'object') jid = jid.toString();

            var name = 'Unknown';
            if (chat.contact) {
                name = chat.contact.displayName || chat.contact.name || chat.contact.pushname || chat.contact.formattedName;
            }
            // WPP often has name directly
            if (!name || name === 'Unknown') name = chat.name || chat.formattedTitle || chat.title || chat.pushname;

            // Fallback for WPP contact details if separated
            if ((!name || name === 'Unknown') && chat.contact && typeof chat.contact.get === 'function') {
                // Some WPP versions have contact getters
            }

            return {
                jid: jid,
                name: name || jid
            };
        }).filter(function (chat) { return chat.jid !== 'Unknown' && chat.jid.includes('@'); });
    } catch (e) {
        console.error("Error in getAllChatsSimple", e);
        return [];
    }
}

// Function to load all chats and log their JIDs/LIDs and names
// Added limit parameter to prevent stack overflow
function loadAllChatsAndLog(limit) {
    try {
        // Set default limit if not provided
        var chatLimit = limit && typeof limit === 'number' ? limit : null;

        if (WAdebugMode) {
            console.log("[Chat Loader] Loading chats" + (chatLimit ? " (limit: " + chatLimit + ")" : ""));
        }

        // Check if WhatsApp API is available
        if (window.WhatsAppAPI) {
            // Try different approaches to get chats
            var allChats = null;

            // Method 1: Try ChatCollection
            if (WhatsAppAPI.ChatCollection && typeof WhatsAppAPI.ChatCollection.getAll === 'function') {
                try {
                    allChats = WhatsAppAPI.ChatCollection.getAll();
                } catch (e) {
                    if (WAdebugMode) {
                        console.log("[Chat Loader] ChatCollection.getAll failed:", e);
                    }
                }
            }

            // Method 2: Try Store if available
            if ((!allChats || !Array.isArray(allChats)) && WhatsAppAPI.Store) {
                if (WhatsAppAPI.Store.Chat && typeof WhatsAppAPI.Store.Chat.models === 'object') {
                    try {
                        allChats = WhatsAppAPI.Store.Chat.models;
                    } catch (e) {
                        if (WAdebugMode) {
                            console.log("[Chat Loader] Store.Chat.models failed:", e);
                        }
                    }
                } else if (WhatsAppAPI.Store.Chats && typeof WhatsAppAPI.Store.Chats.models === 'object') {
                    try {
                        allChats = WhatsAppAPI.Store.Chats.models;
                    } catch (e) {
                        if (WAdebugMode) {
                            console.log("[Chat Loader] Store.Chats.models failed:", e);
                        }
                    }
                }
            }

            // Convert to array if it's an object
            if (allChats && !Array.isArray(allChats) && typeof allChats === 'object') {
                // Try to convert to array
                if (allChats.toArray && typeof allChats.toArray === 'function') {
                    try {
                        allChats = allChats.toArray();
                    } catch (e) {
                        if (WAdebugMode) {
                            console.log("[Chat Loader] toArray failed:", e);
                        }
                        // Fallback to Object.values
                        allChats = Object.values(allChats);
                    }
                } else {
                    // Fallback to Object.values
                    allChats = Object.values(allChats);
                }
            }

            if (allChats && Array.isArray(allChats)) {
                if (WAdebugMode) {
                    console.log("[Chat Loader] Found " + allChats.length + " chats");
                }

                var chatData = [];

                // Determine how many chats to process
                var chatsToProcess = chatLimit ? Math.min(chatLimit, allChats.length) : allChats.length;

                // Process chats one by one with a small delay to prevent stack overflow
                var index = 0;

                function processNextChat() {
                    if (index >= chatsToProcess) {
                        // Finished processing
                        if (WAdebugMode) {
                            console.log("[Chat Loader] Finished loading chats. Total processed: " + chatData.length);
                            console.table(chatData); // Display as table for better visualization
                        }
                        return chatData;
                    }

                    var chat = allChats[index];
                    try {
                        if (!chat) {
                            index++;
                            setTimeout(processNextChat, 1); // Small delay
                            return;
                        }

                        var jid = 'Unknown JID';
                        var name = 'Unknown';

                        // Extract JID
                        if (chat.id) {
                            jid = typeof chat.id === 'object' ? chat.id._serialized || chat.id.toString() : chat.id;
                        } else if (chat.jid) {
                            jid = typeof chat.jid === 'object' ? chat.jid._serialized || chat.jid.toString() : chat.jid;
                        }

                        // Try to get the name from different sources
                        if (chat.contact) {
                            if (chat.contact.displayName && chat.contact.displayName.trim() !== '') {
                                name = chat.contact.displayName;
                            } else if (chat.contact.name && chat.contact.name.trim() !== '') {
                                name = chat.contact.name;
                            } else if (chat.contact.pushname && chat.contact.pushname.trim() !== '') {
                                name = chat.contact.pushname;
                            } else if (chat.contact.formattedName && chat.contact.formattedName.trim() !== '') {
                                name = chat.contact.formattedName;
                            }
                        }

                        if (name === 'Unknown' && chat.name && chat.name.trim() !== '') {
                            name = chat.name;
                        }

                        if (name === 'Unknown' && chat.formattedTitle && chat.formattedTitle.trim() !== '') {
                            name = chat.formattedTitle;
                        }

                        // Store chat data
                        chatData.push({
                            index: index + 1,
                            jid: jid,
                            name: name
                        });

                        // Log chat information
                        if (WAdebugMode) {
                            console.log("[Chat Loader] Chat " + (index + 1) + ": JID=" + jid + ", Name=" + name);
                        }
                    } catch (chatError) {
                        if (WAdebugMode) {
                            console.log("[Chat Loader] Error processing chat " + (index + 1) + ":", chatError);
                        }
                    }

                    index++;
                    setTimeout(processNextChat, 1); // Small delay to prevent stack overflow
                }

                // Start processing
                processNextChat();

                return chatData;
            } else {
                if (WAdebugMode) {
                    console.log("[Chat Loader] No chats found or invalid format");
                    console.log("[Chat Loader] Available WhatsAppAPI objects:", Object.keys(WhatsAppAPI));

                    // Try to explore Store if available
                    if (WhatsAppAPI.Store) {
                        console.log("[Chat Loader] Available Store objects:", Object.keys(WhatsAppAPI.Store));
                    }
                }
            }
        } else {
            if (WAdebugMode) {
                console.log("[Chat Loader] WhatsApp API not available");
            }
        }

        return [];
    } catch (error) {
        if (WAdebugMode) {
            console.log("[Chat Loader] Error loading chats:", error);
        }
        return [];
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
            setTimeout(function () {
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
    document.addEventListener('onOptionsUpdate', function (e) {
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

function sendPresenceUpdate() {
    try {
        // Make sure WhatsApp API is available
        if (window.WhatsAppAPI && window.WhatsAppAPI.sendPresenceStatusProtocol) {
            // Send available presence status
            window.WhatsAppAPI.sendPresenceStatusProtocol({ name: "", status: "available" });

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

// Test function to demonstrate UI functionality
window.testWhatsAppActivityUI = function () {
    console.log("Testing WhatsApp Activity Logs UI...");

    // Show the activity logs UI
    window.showWhatsAppActivityLogs();

    console.log("WhatsApp Activity Logs UI should now be visible.");
};

// Test function to load and display all chats
window.testLoadAllChats = function (limit) {
    console.log("Loading chats" + (limit ? " (limit: " + limit + ")" : ""));

    var chats = window.loadAllChatsAndLog(limit);

    if (chats && chats.length > 0) {
        console.log("Successfully loaded " + chats.length + " chats:");
        console.table(chats);
    } else {
        console.log("No chats loaded or error occurred.");
    }

    return chats;
};

// Log that interception.js has finished loading
console.log('[WAIncognito] interception.js loaded and functions exposed to window object');
