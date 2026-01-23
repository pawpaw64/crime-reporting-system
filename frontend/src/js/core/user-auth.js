// ============================================
// USER AUTHENTICATION HANDLER
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    checkUserAuth();
});

async function checkUserAuth() {
    try {
        const response = await fetch('/check-auth', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.authenticated && data.user) {
                window.isAuthenticated = true;
                window.currentUser = data.user.username || data.user;
                
                const headerIcons = document.querySelector('.header-icons');
                if (headerIcons) {
                    setupAuthenticatedUI(headerIcons);
                }
            } else {
                cleanupUserUI();
            }
        } else {
            cleanupUserUI();
        }
    } catch (error) {
        console.error('User auth check failed:', error);
        cleanupUserUI();
    }
}

function cleanupUserUI() {
    const headerIcons = document.querySelector('.header-icons');
    if (headerIcons) {
        setupUnauthenticatedUI(headerIcons);
    }
}

function setupAuthenticatedUI(headerIcons) {
    // Check for existing auth container
    if (headerIcons.querySelector('.user-auth-container')) return;
    
    // Hide regular icons
    headerIcons.querySelectorAll('.icon-items').forEach(icon => {
        icon.style.display = 'none';
    });
    
    // Create user auth container
    const userAuthContainer = document.createElement('div');
    userAuthContainer.className = 'user-auth-container';
    userAuthContainer.innerHTML = `
        <div class="user-welcome" onclick="goToProfile()" style="cursor: pointer;">
            <div class="user-avatar">
                <img id="header-profile-pic" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; display: none;" alt="Profile">
                <i class="fa-solid fa-user" id="header-profile-icon"></i>
            </div>
            <span class="username">${window.currentUser}</span>
        </div>
        <button class="logout-button" onclick="logoutUser()">
            <i class="fas fa-sign-out-alt"></i> Logout
        </button>
    `;
    headerIcons.appendChild(userAuthContainer);
    
    // Fetch profile picture
    fetch('/get-user-data', { credentials: 'same-origin' })
        .then(r => r.json())
        .then(data => {
            if (data.success && data.user?.face_image) {
                const pic = document.getElementById('header-profile-pic');
                const icon = document.getElementById('header-profile-icon');
                if (pic && icon) {
                    pic.src = data.user.face_image;
                    pic.style.display = 'block';
                    icon.style.display = 'none';
                }
            }
        })
        .catch(console.error);
    
    // Hide mobile nav items
    document.querySelectorAll('.nav-user-admin').forEach(item => {
        item.style.display = 'none';
    });
}

function setupUnauthenticatedUI(headerIcons) {
    headerIcons.querySelectorAll('.icon-items').forEach(icon => {
        icon.style.display = 'flex';
    });
    
    const existingAuth = headerIcons.querySelector('.user-auth-container');
    if (existingAuth) existingAuth.remove();
}

// Global functions
function goToProfile() {
    window.location.href = '/profile';
}

function logoutUser() {
    if (!confirm('Are you sure you want to logout?')) return;
    
    fetch('/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.ok) {
            window.isAuthenticated = false;
            window.currentUser = null;
            localStorage.removeItem('profileImage');
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
