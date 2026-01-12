// ============================================
// ADMIN AUTHENTICATION HANDLER
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    if (typeof window.isAdmin === 'undefined') return;
    
    const headerIcons = document.querySelector('.header-icons');
    if (!headerIcons) return;
    
    if (window.isAdmin && window.adminUsername) {
        setupAdminUI(headerIcons);
    } else {
        cleanupAdminUI();
    }
});

function setupAdminUI(headerIcons) {
    document.body.classList.add('admin-logged-in');
    
    // Hide regular icons
    headerIcons.querySelectorAll('.icon-items').forEach(icon => {
        icon.style.setProperty('display', 'none', 'important');
        icon.classList.add('admin-hidden');
    });
    
    // Create admin auth container if not exists
    let container = headerIcons.querySelector('.admin-auth-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'admin-auth-container';
        container.innerHTML = `
            <div class="admin-welcome" onclick="goToAdminDashboard()" style="cursor: pointer;" title="Go to Admin Dashboard">
                <div class="admin-avatar"><i class="fa-solid fa-user-tie"></i></div>
                <span class="admin-username">${window.adminUsername}</span>
            </div>
            <button class="admin-logout-button" onclick="logoutAdmin()">
                <i class="fas fa-sign-out-alt"></i> Logout
            </button>
        `;
        headerIcons.appendChild(container);
    }
    
    // Hide mobile nav items
    document.querySelectorAll('.nav-user-admin').forEach(item => {
        item.style.setProperty('display', 'none', 'important');
    });
}

function cleanupAdminUI() {
    document.body.classList.remove('admin-logged-in');
    document.querySelectorAll('.admin-hidden').forEach(icon => {
        icon.style.removeProperty('display');
        icon.classList.remove('admin-hidden');
    });
}

// Global functions
function goToAdminDashboard() {
    window.location.href = '/admin-dashboard';
}

function logoutAdmin() {
    const btn = document.querySelector('.admin-logout-button');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
        btn.disabled = true;
    }
    
    fetch('/admin-logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.ok) {
            localStorage.clear();
            sessionStorage.clear();
            if (window.history?.replaceState) {
                window.history.replaceState(null, null, '/adminLogin');
            }
            window.location.replace('/adminLogin');
        } else {
            throw new Error('Logout failed');
        }
    })
    .catch(error => {
        console.error('Admin logout error:', error);
        alert('Error logging out. Please try again.');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
            btn.disabled = false;
        }
    });
}
