﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿// This is the background page.
// it keeps track of prefrences/settings in localStorage

if (typeof chrome !== "undefined") {
  var browser = chrome;
}

// Log when background script loads
console.log("[Background] WhatsApp Incognito background script loaded");

// Function to get activity logs from storage
function getTypingLogsFromStorage(callback) {
    chrome.storage.local.get(['whatsappActivityLogs'], function(result) {
        var storedLogs = result.whatsappActivityLogs || [];
        callback(storedLogs);
    });
}

// Function to store an activity log
function storeTypingLogInStorage(logEntry, callback) {
    getTypingLogsFromStorage(function(existingLogs) {
        // Add new log entry
        existingLogs.push(logEntry);
        
        // Keep only the last 1000 entries to prevent storage overflow
        if (existingLogs.length > 1000) {
            existingLogs = existingLogs.slice(-1000);
        }
        
        // Save back to extension storage
        chrome.storage.local.set({whatsappActivityLogs: existingLogs}, function() {
            if (callback && typeof callback === 'function') {
                callback();
            }
        });
    });
}

// Function to clear activity logs
function clearTypingLogsInStorage(callback) {
    chrome.storage.local.remove('whatsappActivityLogs', function() {
        if (callback && typeof callback === 'function') {
            callback();
        }
    });
}

// Function to get filtered activity logs
function getFilteredTypingLogs(options, callback) {
    getTypingLogsFromStorage(function(allLogs) {
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
            
            callback(allLogs);
        } catch (error) {
            console.log("Error filtering logs:", error);
            callback([]);
        }
    });
}

// Function to get activity log statistics
function getTypingLogStats(callback) {
    getTypingLogsFromStorage(function(allLogs) {
        try {
            if (allLogs.length === 0) {
                callback({
                    totalLogs: 0,
                    uniqueUsers: 0,
                    onTabCount: 0,
                    offTabCount: 0,
                    mostActiveUser: null,
                    mostActiveUserCount: 0
                });
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
            
            callback({
                totalLogs: allLogs.length,
                uniqueUsers: Object.keys(userCounts).length,
                onTabCount: onTabCount,
                offTabCount: offTabCount,
                mostActiveUser: mostActiveUser,
                mostActiveUserCount: mostActiveUserCount
            });
        } catch (error) {
            console.log("Error calculating log stats:", error);
            callback({
                totalLogs: 0,
                uniqueUsers: 0,
                onTabCount: 0,
                offTabCount: 0,
                mostActiveUser: null,
                mostActiveUserCount: 0
            });
        }
    });
}

// Function to export activity logs
function exportTypingLogs(format, callback) {
    getTypingLogsFromStorage(function(logs) {
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
            
            callback(exportedData);
        } catch (error) {
            console.log("Error exporting logs:", error);
            callback(null);
        }
    });
}

// TODO: We need to remove this bad code dupliation
browser.runtime.onMessage.addListener(function (messageEvent, sender, callback)
{
    // Log incoming messages for debugging
    if (typeof WAdebugMode !== 'undefined' && WAdebugMode) {
        console.log("[Background] Received message:", messageEvent);
    }
    
    if (messageEvent.name == "setOptions")
    {
        if (typeof WAdebugMode !== 'undefined' && WAdebugMode) {
            console.log("[Background] Processing setOptions");
        }
        if ("onlineUpdatesHook" in messageEvent)
		{
            chrome.storage.local.set({"onlineUpdatesHook": messageEvent.onlineUpdatesHook});
		}
        if ("typingUpdatesHook" in messageEvent)
		{
            chrome.storage.local.set({"typingUpdatesHook": messageEvent.typingUpdatesHook});
		}
		if ("readConfirmationsHook" in messageEvent)
		{
            chrome.storage.local.set({"readConfirmationsHook": messageEvent.readConfirmationsHook});
		}
		if ("safetyDelay" in messageEvent)
		{
            chrome.storage.local.set({"safetyDelay": messageEvent.safetyDelay});
        }
        if ("showReadWarning" in messageEvent)
        {
            chrome.storage.local.set({"showReadWarning": messageEvent.showReadWarning});
        }
        if ("saveDeletedMsgs" in messageEvent)
        {
            chrome.storage.local.set({"saveDeletedMsgs": messageEvent.saveDeletedMsgs});
        }
        if ("showDeviceTypes" in messageEvent)
        {
            chrome.storage.local.set({"showDeviceTypes": messageEvent.showDeviceTypes});
        }
        if ("autoReceiptOnReplay" in messageEvent)
        {
            chrome.storage.local.set({"autoReceiptOnReplay": messageEvent.autoReceiptOnReplay});
        }
        if ("allowStatusDownload" in messageEvent)
        {
            chrome.storage.local.set({"allowStatusDownload": messageEvent.allowStatusDownload});
        }
        if ("typingNotifications" in messageEvent)
        {
            chrome.storage.local.set({"typingNotifications": messageEvent.typingNotifications});
        }
        if ("stayOnline" in messageEvent)
        {
            chrome.storage.local.set({"stayOnline": messageEvent.stayOnline});
        }
    }
    else if (messageEvent.name == "getOptions")
    {
        if (typeof WAdebugMode !== 'undefined' && WAdebugMode) {
            console.log("[Background] Processing getOptions");
        }
        // these are the default values. we will update them according to the storage
		var onlineUpdatesHook = false;
        var typingUpdatesHook = false;
        var readConfirmationsHook = true;
        var showReadWarning = true;
		var safetyDelay = 0;
        var saveDeletedMsgs = false;
        var showDeviceTypes = true;
        var autoReceiptOnReplay = true;
        var allowStatusDownload = true;
        var typingNotifications = false;
        var stayOnline = false;

        chrome.storage.local.get(['onlineUpdatesHook',
                                'typingUpdatesHook',
                                'readConfirmationsHook', 
                                'showReadWarning', 
                                'safetyDelay', 
                                'saveDeletedMsgs', 
                                'showDeviceTypes',
                                'autoReceiptOnReplay',
                                'allowStatusDownload',
                                'typingNotifications',
                                'stayOnline']).then(function(storage)
        {
            if (storage["onlineUpdatesHook"] != undefined)
            {
                onlineUpdatesHook = storage["onlineUpdatesHook"];
            }
            if (storage["typingUpdatesHook"] != undefined)
            {
                typingUpdatesHook = storage["typingUpdatesHook"];
            }
            if (storage["readConfirmationsHook"] != undefined)
            {
                readConfirmationsHook = storage["readConfirmationsHook"];
            }
            if (storage["showReadWarning"] != undefined)
            {
                showReadWarning = storage["showReadWarning"];
            }
            if (storage["safetyDelay"] != undefined)
            {
                safetyDelay = storage["safetyDelay"];
            }
            if (storage["saveDeletedMsgs"] != undefined)
            {
                saveDeletedMsgs = storage["saveDeletedMsgs"];
            }
            if (storage["showDeviceTypes"] != undefined)
            {
                showDeviceTypes = storage["showDeviceTypes"];
            }
            if (storage["autoReceiptOnReplay"] != undefined)
            {
                autoReceiptOnReplay = storage["autoReceiptOnReplay"];
            }
            if (storage["allowStatusDownload"] != undefined)
            {
                allowStatusDownload = storage["allowStatusDownload"];
            }
            if (storage["typingNotifications"] != undefined)
            {
                typingNotifications = storage["typingNotifications"];
            }
            if (storage["stayOnline"] != undefined)
            {
                stayOnline = storage["stayOnline"];
            }
            callback(
            {
                onlineUpdatesHook: onlineUpdatesHook,
                typingUpdatesHook: typingUpdatesHook,
                readConfirmationsHook: readConfirmationsHook,
                showReadWarning: showReadWarning,
                safetyDelay: safetyDelay,
                saveDeletedMsgs: saveDeletedMsgs,
                showDeviceTypes: showDeviceTypes,
                autoReceiptOnReplay: autoReceiptOnReplay,
                allowStatusDownload: allowStatusDownload,
                typingNotifications: typingNotifications,
                stayOnline: stayOnline
            });
        });   
    }
    else if (messageEvent.name == "storeTypingLog")
    {
        if (typeof WAdebugMode !== 'undefined' && WAdebugMode) {
            console.log("[Background] Processing storeTypingLog");
        }
        storeTypingLogInStorage(messageEvent.logEntry, function() {
            callback({success: true});
        });
        return true; // Keep callback alive
    }
    else if (messageEvent.name == "getTypingLogs")
    {
        if (typeof WAdebugMode !== 'undefined' && WAdebugMode) {
            console.log("[Background] Processing getTypingLogs");
        }
        getTypingLogsFromStorage(function(logs) {
            callback({logs: logs});
        });
        return true; // Keep callback alive
    }
    else if (messageEvent.name == "getTypingLogsWithFilters")
    {
        if (typeof WAdebugMode !== 'undefined' && WAdebugMode) {
            console.log("[Background] Processing getTypingLogsWithFilters");
        }
        getFilteredTypingLogs(messageEvent.options, function(logs) {
            callback({logs: logs});
        });
        return true; // Keep callback alive
    }
    else if (messageEvent.name == "getTypingLogStats")
    {
        if (typeof WAdebugMode !== 'undefined' && WAdebugMode) {
            console.log("[Background] Processing getTypingLogStats");
        }
        getTypingLogStats(function(stats) {
            callback({stats: stats});
        });
        return true; // Keep callback alive
    }
    else if (messageEvent.name == "clearTypingLogs")
    {
        if (typeof WAdebugMode !== 'undefined' && WAdebugMode) {
            console.log("[Background] Processing clearTypingLogs");
        }
        clearTypingLogsInStorage(function() {
            callback({success: true});
        });
        return true; // Keep callback alive
    }
    else if (messageEvent.name == "exportTypingLogs")
    {
        if (typeof WAdebugMode !== 'undefined' && WAdebugMode) {
            console.log("[Background] Processing exportTypingLogs");
        }
        exportTypingLogs(messageEvent.format, function(data) {
            callback({data: data});
        });
        return true; // Keep callback alive
    }
    else if (messageEvent.name == "ping")
    {
        if (typeof WAdebugMode !== 'undefined' && WAdebugMode) {
            console.log("[Background] Processing ping");
        }
        callback({status: "ok"});
        return true; // Keep callback alive
    }
    else
    {
        if (typeof WAdebugMode !== 'undefined' && WAdebugMode) {
            console.log("[Background] Unknown message type:", messageEvent.name);
        }
    }
    
    return true;
});

browser.action.onClicked.addListener(function(activeTab)
{
    var newURL = "https://web.whatsapp.com";
    browser.tabs.create({ url: newURL });
});
