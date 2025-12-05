document.addEventListener('DOMContentLoaded', function() {
    console.log("Admin Auth handler loaded");
    console.log("Is admin authenticated:", window.isAdmin);
    console.log("Admin username:", window.adminUsername);
    
    // Check if admin authentication variables are defined
    if (typeof window.isAdmin === 'undefined' || typeof window.adminUsername === 'undefined') {
        console.log("Admin authentication variables not found");
        return;
    }
    
    // Check if admin is authenticated
    if (window.isAdmin && window.adminUsername) {
        console.log("Admin is authenticated, updating UI");
        
        // Add admin-logged-in class to body for CSS targeting
        document.body.classList.add('admin-logged-in');
        
        // Get the header icons container
        const headerIcons = document.querySelector('.header-icons');
        if (!headerIcons) {
            console.error("Header icons container not found");
            return;
        }
        
        // Force hide ALL the regular user/admin icons with !important style
        const userAdminIcons = headerIcons.querySelectorAll('.icon-items');
        userAdminIcons.forEach(icon => {
            icon.style.setProperty('display', 'none', 'important');
            icon.style.visibility = 'hidden';
            icon.classList.add('admin-hidden');
        });
        
        // Check if admin auth container already exists to prevent duplicates
        let adminAuthContainer = headerIcons.querySelector('.admin-auth-container');
        if (!adminAuthContainer) {
            // Create admin auth container only if it doesn't exist
            adminAuthContainer = document.createElement('div');
            adminAuthContainer.className = 'admin-auth-container';
            
            // Add admin welcome display WITH the dashboard link (clicking username)
            adminAuthContainer.innerHTML = `
                <div class="admin-welcome" onclick="goToAdminDashboard()" style="cursor: pointer;" title="Click to go to Admin Dashboard">
                    <div class="admin-avatar">
                        <i class="fa-solid fa-user-tie"></i>
                    </div>
                    <span class="admin-username">${window.adminUsername}</span>
                </div>
                <button class="admin-logout-button" onclick="logoutAdmin()">
                    <i class="fas fa-sign-out-alt"></i>
                    Logout
                </button>
            `;
            
            // Add to header
            headerIcons.appendChild(adminAuthContainer);
        }
        
        // Handle mobile navigation - hide existing user/admin nav items
        const mobileNavItems = document.querySelectorAll('.nav-user-admin');
        mobileNavItems.forEach(item => {
            item.style.setProperty('display', 'none', 'important');
            item.style.visibility = 'hidden';
        });
        
        // Clean up navigation menu - remove any extra items that shouldn't be there
        const navigationMenu = document.querySelector('.navigation-menu');
        if (navigationMenu) {
            // Remove any list items that aren't proper navigation items (but preserve existing ones)
            const allNavItems = navigationMenu.querySelectorAll('li');
            allNavItems.forEach(item => {
                // Remove items that don't have navigation-item class AND aren't the original nav items
                if (!item.classList.contains('navigation-item') && !item.querySelector('.navigation-link')) {
                    item.remove();
                }
            });
        }
        
    } else {
        console.log("Admin is not authenticated");
        // Remove admin-logged-in class if it exists
        document.body.classList.remove('admin-logged-in');
        
        // Show back the regular icons if admin is not authenticated
        const hiddenIcons = document.querySelectorAll('.admin-hidden');
        hiddenIcons.forEach(icon => {
            icon.style.removeProperty('display');
            icon.style.removeProperty('visibility');
            icon.classList.remove('admin-hidden');
        });
    }
});

// Function to navigate to admin dashboard
function goToAdminDashboard() {
    window.location.href = '/admin-dashboard';
}

// Enhanced admin logout function with better security
function logoutAdmin() {
    // Show loading state
    const logoutBtn = document.querySelector('.admin-logout-button');
    if (logoutBtn) {
        logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
        logoutBtn.disabled = true;
    }
    
    fetch('/admin-logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        console.log("Admin logout response:", response);
        if (response.ok) {
            // Clear any local storage or session storage
            localStorage.clear();
            sessionStorage.clear();
            
            // Clear browser history to prevent back button access
            if (window.history && window.history.replaceState) {
                window.history.replaceState(null, null, '/adminLogin');
            }
            
            // Force redirect and reload to clear cache
            window.location.replace('/adminLogin');
        } else {
            throw new Error('Logout failed');
        }
    })
    .catch(error => {
        console.error('Admin logout error:', error);
        alert('Error logging out. Please try again.');
        
        // Reset button state
        if (logoutBtn) {
            logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
            logoutBtn.disabled = false;
        }
    });
}