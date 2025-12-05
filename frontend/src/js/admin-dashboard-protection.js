// Admin Dashboard Protection Script
(function() {
    'use strict';
    
    // Prevent caching of this page
    if (window.history && window.history.replaceState) {
        window.history.replaceState(null, null, window.location.href);
    }
    
    // Disable back button functionality for protected pages
    window.addEventListener('pageshow', function(event) {
        if (event.persisted) {
            // Page was loaded from cache, force reload
            window.location.reload();
        }
    });
    
    // Prevent going back to this page after logout
    window.addEventListener('popstate', function(event) {
        // Check if user is still authenticated by making a quick API call
        fetch('/check-admin-auth', {
            method: 'GET',
            credentials: 'same-origin'
        })
        .then(response => {
            if (!response.ok) {
                // Not authenticated, redirect to login
                window.location.replace('/adminLogin');
            }
        })
        .catch(() => {
            // Error checking auth, redirect to login for safety
            window.location.replace('/adminLogin');
        });
    });
    
    // Page visibility change detection (for tab switching)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            // Page became visible, verify authentication
            fetch('/check-admin-auth', {
                method: 'GET',
                credentials: 'same-origin'
            })
            .then(response => {
                if (!response.ok) {
                    window.location.replace('/adminLogin');
                }
            })
            .catch(() => {
                window.location.replace('/adminLogin');
            });
        }
    });
    
    // Prevent context menu and keyboard shortcuts that might bypass security
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });
    
    document.addEventListener('keydown', function(e) {
        // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
        if (e.keyCode === 123 || 
            (e.ctrlKey && e.shiftKey && e.keyCode === 73) ||
            (e.ctrlKey && e.shiftKey && e.keyCode === 74) ||
            (e.ctrlKey && e.keyCode === 85)) {
            e.preventDefault();
        }
    });
    
})();