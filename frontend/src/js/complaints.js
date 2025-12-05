// Complaints Management Component
import { apiCall } from './api.js';

let allComplaints = [];
let filteredComplaints = [];

export function initMyComplaints() {
    // Add CSS for notification panels and badges
    const notificationStyles = document.createElement('style');
    notificationStyles.textContent = `
        /* Your existing CSS styles here */
        .notification-panel {
            position: absolute;
            top: 100%;
            right: 0;
            background: white;
            border: 1px solid #e8ecf0;
            border-radius: 8px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            width: 400px;
            height: 600px;
            z-index: 1000;
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.3s ease;
        }

        /* ... rest of your CSS styles ... */
    `;
    document.head.appendChild(notificationStyles);

    // Load complaints when the page loads
    document.addEventListener('DOMContentLoaded', function() {
        const complaintsTab = document.querySelector('[data-tab="complaints"]');
        if (complaintsTab) {
            complaintsTab.addEventListener('click', loadMyComplaints);
        }
        
        // Add filter event listeners
        const applyBtn = document.getElementById('applyFilters');
        const clearBtn = document.getElementById('clearFilters');
        
        if (applyBtn) applyBtn.addEventListener('click', applyFilters);
        if (clearBtn) clearBtn.addEventListener('click', clearFilters);
        
        // Load complaints immediately if we're on the complaints page
        if (window.location.pathname.includes('complaints') || 
            document.querySelector('.complaint-list')) {
            loadMyComplaints();
        }
    });
}

// Your existing functions (loadMyComplaints, applyFilters, deleteComplaint, etc.)
// will go here - they remain largely the same but use the apiCall function

// Example of modified function using apiCall:
function loadMyComplaints() {
    showLoadingState();
    
    apiCall('/user/complaints')
        .then(data => {
            if (data.success) {
                allComplaints = data.complaints;
                filteredComplaints = [...allComplaints];
                displayComplaints(filteredComplaints);
                updateNotificationCounts();
            } else {
                console.error('Error loading complaints:', data.message);
                showErrorState(data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showErrorState('Failed to load complaints. Please try again.');
        });
}

// ... rest of your functions remain similar but use apiCall instead of fetch directly