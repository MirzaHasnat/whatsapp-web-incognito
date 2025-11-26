// WPP Library Verification Script
// This script provides functions to verify WPP library integration

(function() {
    'use strict';
    
    // Test function to verify WPP integration
    window.testWPPIntegration = async function() {
        console.log('[WPP Verification] Starting WPP integration test...');
        
        // Check if WPP is available
        if (typeof WPP === 'undefined') {
            console.warn('[WPP Verification] WPP library is not available');
            return false;
        }
        
        console.log('[WPP Verification] WPP library is available');
        
        // Check if our utility functions are available
        if (typeof getDisplayNameFromWPP === 'undefined') {
            console.warn('[WPP Verification] WPP utility functions are not available');
            return false;
        }
        
        console.log('[WPP Verification] WPP utility functions are available');
        
        // Test with a sample function
        try {
            // This would normally be called with an actual JID
            console.log('[WPP Verification] Utility functions loaded successfully');
            return true;
        } catch (error) {
            console.error('[WPP Verification] Error testing WPP integration:', error);
            return false;
        }
    };
    
    // Auto-run verification when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(window.testWPPIntegration, 2000); // Wait a bit for everything to load
        });
    } else {
        setTimeout(window.testWPPIntegration, 2000);
    }
    
})();