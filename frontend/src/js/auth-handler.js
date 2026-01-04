document.addEventListener('DOMContentLoaded', function() {
    console.log("Auth handler loaded");
    console.log("Is authenticated:", window.isAuthenticated);
    console.log("Current user:", window.currentUser);
    
    // Check if authentication variables are defined
    if (typeof window.isAuthenticated === 'undefined' || typeof window.currentUser === 'undefined') {
        console.log("Authentication variables not found");
        return;
    }
    
    // Check if user is authenticated
    if (window.isAuthenticated && window.currentUser) {
        console.log("User is authenticated, updating UI");
        
        // Get the header icons container
        const headerIcons = document.querySelector('.header-icons');
        if (!headerIcons) {
            console.error("Header icons container not found");
            return;
        }
        
        // Check if user auth container already exists to prevent duplicates
        const existingUserAuth = headerIcons.querySelector('.user-auth-container');
        if (existingUserAuth) {
            console.log("User auth container already exists, skipping creation");
            return;
        }
        
        // Hide the regular user/admin icons
        const userAdminIcons = headerIcons.querySelectorAll('.icon-items');
        userAdminIcons.forEach(icon => {
            icon.style.display = 'none';
        });
        
        // Create user welcome element
        const userAuthContainer = document.createElement('div');
        userAuthContainer.className = 'user-auth-container';
        
        // Add user welcome display with link to profile
        userAuthContainer.innerHTML = `
            <div class="user-welcome" onclick="goToProfile()" style="cursor: pointer;">
                <div class="user-avatar">
                    <img id="header-profile-pic" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; display: none;" alt="Profile">
                    <i class="fa-solid fa-user" id="header-profile-icon"></i>
                </div>
                <span class="username">${window.currentUser}</span>
            </div>
            <button class="logout-button" onclick="logoutUser()">
                <i class="fas fa-sign-out-alt"></i>
                Logout
            </button>
        `;
        
        // Add to header
        headerIcons.appendChild(userAuthContainer);
        
        // Fetch and display user profile picture
        fetch('/get-user-data', {
            credentials: 'same-origin'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success && data.user && data.user.face_image) {
                    const profilePic = document.getElementById('header-profile-pic');
                    const profileIcon = document.getElementById('header-profile-icon');
                    if (profilePic && profileIcon) {
                        profilePic.src = data.user.face_image;
                        profilePic.style.display = 'block';
                        profileIcon.style.display = 'none';
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching profile picture:', error);
                // Keep showing the default icon if fetch fails
            });
        
        // Also hide from mobile menu
        const mobileNavItems = document.querySelectorAll('.nav-user-admin');
        mobileNavItems.forEach(item => {
            item.style.display = 'none';
        });
    } else {
        console.log("User is not authenticated");
        
        // Ensure user/admin icons are visible for non-authenticated users
        const headerIcons = document.querySelector('.header-icons');
        if (headerIcons) {
            const userAdminIcons = headerIcons.querySelectorAll('.icon-items');
            userAdminIcons.forEach(icon => {
                icon.style.display = 'flex';
            });
            
            // Remove any existing user auth container
            const existingUserAuth = headerIcons.querySelector('.user-auth-container');
            if (existingUserAuth) {
                existingUserAuth.remove();
            }
        }
    }
});

// Function to navigate to profile page
function goToProfile() {
    window.location.href = '/profile';
}

// Logout function
function logoutUser() {
    console.log("Logout function called");
    
    if (!confirm('Are you sure you want to logout?')) {
        return;
    }
    
    fetch('/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log("Logout response:", response);
        if (response.ok) {
            // Clear authentication variables
            window.isAuthenticated = false;
            window.currentUser = null;
            
            // Clear any stored data
            localStorage.removeItem('profileImage');
            
            // Redirect to signup page
            window.location.href = '/signup';
        } else {
            throw new Error('Logout failed');
        }
    })
    .catch(error => {
        console.error('Logout error:', error);
        alert('Error logging out. Please try again.');
    });
}

// Function to clear authentication UI (useful for cleanup)
function clearAuthUI() {
    const headerIcons = document.querySelector('.header-icons');
    if (headerIcons) {
        // Remove user auth container
        const existingUserAuth = headerIcons.querySelector('.user-auth-container');
        if (existingUserAuth) {
            existingUserAuth.remove();
        }
        
        // Show user/admin icons
        const userAdminIcons = headerIcons.querySelectorAll('.icon-items');
        userAdminIcons.forEach(icon => {
            icon.style.display = 'flex';
        });
    }
    
    // Show mobile menu items
    const mobileNavItems = document.querySelectorAll('.nav-user-admin');
    mobileNavItems.forEach(item => {
        item.style.display = 'block';
    });
}