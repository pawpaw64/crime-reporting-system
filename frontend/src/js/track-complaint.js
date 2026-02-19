// Track Complaint JavaScript

// Get tracking token from URL
const urlParams = new URLSearchParams(window.location.search);
const trackingToken = urlParams.get('token');

// DOM Elements
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const complaintDetails = document.getElementById('complaint-details');

// Status mapping
const statusOrder = ['pending', 'verifying', 'investigating', 'resolved'];

// Format date
function formatDate(dateString) {
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Update status timeline
function updateStatusTimeline(currentStatus) {
    const statusItems = document.querySelectorAll('.status-item');
    const currentIndex = statusOrder.indexOf(currentStatus);

    statusItems.forEach((item, index) => {
        const itemStatus = item.getAttribute('data-status');
        const itemIndex = statusOrder.indexOf(itemStatus);

        if (itemIndex < currentIndex) {
            item.classList.add('completed');
            item.classList.remove('active');
        } else if (itemIndex === currentIndex) {
            item.classList.add('active');
            item.classList.remove('completed');
        } else {
            item.classList.remove('active', 'completed');
        }
    });
}

// Display complaint details
function displayComplaintDetails(data) {
    const complaint = data.complaint;

    // Update basic information
    document.getElementById('complaint-id').textContent = `#${complaint.id}`;
    document.getElementById('complaint-date').textContent = formatDate(complaint.submittedDate);
    document.getElementById('complaint-type').textContent = complaint.type || 'N/A';
    document.getElementById('complaint-category').textContent = complaint.category || 'N/A';
    
    // Location
    const locationText = complaint.location.address || 
                        (complaint.location.name ? `${complaint.location.name}, ${complaint.location.district}` : 'N/A');
    document.getElementById('complaint-location').textContent = locationText;
    
    // Description
    document.getElementById('complaint-description').textContent = complaint.description || 'No description provided.';

    // Update status timeline
    updateStatusTimeline(complaint.status);

    // Display recent updates if available
    if (complaint.recentUpdates && complaint.recentUpdates.length > 0) {
        const updatesSection = document.getElementById('updates-section');
        const updatesList = document.getElementById('updates-list');
        updatesSection.style.display = 'block';

        updatesList.innerHTML = complaint.recentUpdates.map(update => `
            <div class="update-item">
                <div class="update-header">
                    <span class="update-type ${update.type}">
                        <i class="fas fa-${update.type === 'admin' ? 'user-shield' : 'user'}"></i>
                        ${update.type === 'admin' ? 'Authority' : 'User'}
                    </span>
                    <span class="update-date">${formatDate(update.timestamp)}</span>
                </div>
                <div class="update-message">${update.message}</div>
            </div>
        `).join('');
    }

    // Display evidence if available
    if (complaint.evidence && complaint.evidence.length > 0) {
        const evidenceSection = document.getElementById('evidence-section');
        const evidenceList = document.getElementById('evidence-list');
        evidenceSection.style.display = 'block';

        evidenceList.innerHTML = complaint.evidence.map(evidence => {
            let icon = 'fa-file';
            if (evidence.type === 'image') icon = 'fa-image';
            else if (evidence.type === 'video') icon = 'fa-video';
            else if (evidence.type === 'audio') icon = 'fa-music';

            return `
                <div class="evidence-item">
                    <div class="evidence-icon">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="evidence-type">${evidence.type}</div>
                </div>
            `;
        }).join('');
    }

    // Show complaint details
    loadingState.style.display = 'none';
    complaintDetails.style.display = 'block';
}

// Show error
function showError(message) {
    loadingState.style.display = 'none';
    errorMessage.textContent = message;
    errorState.style.display = 'block';
}

// Fetch complaint details
async function fetchComplaintDetails() {
    if (!trackingToken) {
        showError('No tracking token provided. Please check your QR code or tracking link.');
        return;
    }

    try {
        // Determine API base URL
        const apiBaseUrl = typeof Config !== 'undefined' ? Config.API_BASE_URL : 'http://localhost:3000/api';
        const response = await fetch(`${apiBaseUrl}/track/${trackingToken}`);
        const data = await response.json();

        if (data.success) {
            displayComplaintDetails(data);
        } else {
            showError(data.message || 'Complaint not found. Please check your tracking token.');
        }
    } catch (error) {
        console.error('Error fetching complaint details:', error);
        showError('Unable to load complaint details. Please check your internet connection and try again.');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchComplaintDetails();
});

// Optional: Auto-refresh every 30 seconds to get latest updates
setInterval(() => {
    if (trackingToken && complaintDetails.style.display === 'block') {
        fetchComplaintDetails();
    }
}, 30000);
