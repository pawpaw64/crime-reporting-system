let allComplaints = [];
let filteredComplaints = [];

// Add CSS for notification panels and badges
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    /* Notification Panel Styling */
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

    .notification-panel.show {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
    }

    .notification-header {
        padding: 16px;
        border-bottom: 1px solid #f1f3f5;
        background: #f8f9fa;
        border-radius: 8px 8px 0 0;
    }

    .notification-header h4 {
        margin: 0;
        color: #2c3e50;
        font-size: 0.9rem;
        font-weight: 600;
    }

    .notification-content {
        max-height: 500px;
        overflow-y: auto;
        padding: 8px 0;
    }

    .notification-item {
        padding: 16px 20px;
        border-bottom: 1px solid #f8f9fa;
        transition: background-color 0.2s ease;
        cursor: pointer;
    }

    .notification-item:hover {
        background-color: #f8f9fa;
    }

    .notification-item:last-child {
        border-bottom: none;
    }

    .notification-item.unread {
        background-color: #e3f2fd;
        border-left: 3px solid #1976d2;
    }

    .notification-message {
        padding: 16px;
        text-align: center;
        color: #6c757d;
        font-size: 0.85rem;
    }

    .notification-text {
        font-size: 0.9rem;
        color: #4a5568;
        margin-bottom: 6px;
         line-height: 1.4;  
        word-wrap: break-word; 

    }

    .notification-time {
        font-size: 0.75rem;
        color: #9ca3af;
    }

    /* Enhanced notification badge */
    .notification-badge {
        position: absolute;
        top: -2px;
        right: -2px;
        background: #ff4757;
        color: white;
        border-radius: 50%;
        width: 18px;
        height: 18px;
        font-size: 0.7rem;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        z-index: 10;
        min-width: 18px;
    }

    /* Loading spinner for notifications */
    .filter-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        color: #6c757d;
    }

    .loading-spinner {
        width: 20px;
        height: 20px;
        border: 2px solid #e8ecf0;
        border-top: 2px solid #124E66;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 8px;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .notification-content {
       max-height: 500px;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 8px 0;
        
        &::-webkit-scrollbar {
            width: 8px;
        }
    }
    @media (max-width: 768px) {
    .notification-panel {
        width: 350px;
        right: -25px;
    }
}

@media (max-width: 480px) {
    .notification-panel {
        width: 280px;
        right: -40px;
    }
}

`;
document.head.appendChild(notificationStyles);

// Add this function to handle complaint deletion
function deleteComplaint(complaintId) {
    if (!confirm('Are you sure you want to delete this complaint? This action cannot be undone.')) {
        return;
    }

    // Disable the delete button to prevent multiple clicks
    const deleteBtn = document.querySelector(`#complaint-${complaintId} .delete-btn`);
    if (deleteBtn) {
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    }

    fetch(`/delete-complaint/${complaintId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show success message
                showNotification('Complaint deleted successfully', 'success');

                // Remove the complaint card from the DOM
                const complaintCard = document.getElementById(`complaint-${complaintId}`);
                if (complaintCard) {
                    complaintCard.style.transition = 'all 0.3s ease';
                    complaintCard.style.opacity = '0';
                    complaintCard.style.transform = 'translateX(-100%)';

                    setTimeout(() => {
                        complaintCard.remove();

                        // Update the complaints arrays
                        allComplaints = allComplaints.filter(c => c.complaint_id !== complaintId);
                        filteredComplaints = filteredComplaints.filter(c => c.complaint_id !== complaintId);

                        // If no complaints left, show the empty state
                        if (filteredComplaints.length === 0) {
                            displayComplaints([]);
                        }
                    }, 300);
                }
            } else {
                showNotification(data.message || 'Failed to delete complaint', 'error');

                // Re-enable the delete button
                if (deleteBtn) {
                    deleteBtn.disabled = false;
                    deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> <span>Delete</span>';
                }
            }
        })
        .catch(error => {
            console.error('Error deleting complaint:', error);
            showNotification('An error occurred while deleting the complaint', 'error');

            // Re-enable the delete button
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> <span>Delete</span>';
            }
        });
}

// Function to show notifications
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    // Add notification styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
    `;

    // Add to document
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Function to load and display user complaints
function loadMyComplaints() {
    showLoadingState();
    
    fetch('/my-complaints')
        .then(response => response.json())
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

function showLoadingState() {
    const complaintList = document.querySelector('.complaint-list');
    complaintList.innerHTML = `
        <div class="filter-loading">
            <div class="loading-spinner"></div>
            <p>Loading your complaints...</p>
        </div>
    `;
}

function showErrorState(message) {
    const complaintList = document.querySelector('.complaint-list');
    complaintList.innerHTML = `
        <div class="no-results">
            <div class="no-results-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>Error Loading Complaints</h3>
            <p>${message}</p>
            <button onclick="loadMyComplaints()" class="apply-filter-btn" style="margin-top: 16px;">
                <i class="fas fa-refresh"></i> Try Again
            </button>
        </div>
    `;
}

function displayComplaints(complaints) {
    const complaintList = document.querySelector('.complaint-list');
    
    if (complaints.length === 0) {
        complaintList.innerHTML = `
            <div class="no-complaints">
                <div class="no-complaints-icon">
                    <i class="fas fa-inbox"></i>
                </div>
                <h3>No Complaints Found</h3>
                <p>You haven't submitted any complaints yet or no complaints match your current filters.</p>
                <div style="display: flex; gap: 12px; justify-content: center; margin-top: 20px;">
                    <a href="/complain" class="submit-complaint-btn">
                        <i class="fas fa-plus"></i> Submit Your First Complaint
                    </a>
                    ${filteredComplaints.length !== allComplaints.length ? 
                        '<button onclick="clearFilters()" class="clear-filter-btn"><i class="fas fa-filter"></i> Clear Filters</button>' : ''
                    }
                </div>
            </div>
        `;
        return;
    }

    const complaintsHTML = complaints.map(complaint => {
        const statusColor = getStatusColor(complaint.status);
        const deleteButton = complaint.status.toLowerCase() === 'pending' ? 
            `<button class="delete-btn" onclick="deleteComplaint(${complaint.complaint_id})" title="Delete Complaint">
                <i class="fas fa-trash-alt"></i>
                <span>Delete</span>
            </button>` : '';
        
        const notificationCount = complaint.unread_notifications || 0;
        const notificationBadge = notificationCount > 0 ? 
            `<span class="notification-badge" id="badge-${complaint.complaint_id}">${notificationCount}</span>` : 
            `<span class="notification-badge" id="badge-${complaint.complaint_id}" style="display: none;">0</span>`;
        
        return `
            <div class="complaint-card" id="complaint-${complaint.complaint_id}">
                <div class="complaint-header">
                    <div class="complaint-title-section">
                        <h4 class="complaint-title">Complaint #${complaint.complaint_id}</h4>
                        <span class="complaint-type">${complaint.complaint_type}</span>
                    </div>
                    <div class="complaint-actions">
                        <span class="status-badge" style="background-color: ${statusColor}">
                            ${complaint.status.toUpperCase()}
                        </span>
                        
                        <div class="notification-icon" onclick="toggleNotifications(${complaint.complaint_id})" title="View Notifications">
                            <i class="fas fa-bell"></i>
                            ${notificationBadge}
                            <div class="notification-panel" id="notifications-${complaint.complaint_id}">
                                <div class="notification-header">
                                    <h4>Notifications</h4>
                                </div>
                                <div class="notification-content" id="notification-content-${complaint.complaint_id}">
                                    <div class="filter-loading">
                                        <div class="loading-spinner"></div>
                                        <p>Loading notifications...</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="chat-icon" onclick="openChat(${complaint.complaint_id})" title="Chat with Admin">
                            <i class="fas fa-comments"></i>
                        </div>
                        
                        ${deleteButton}
                    </div>
                </div>
                
                <div class="complaint-body">
                    <div class="complaint-description">
                        <p class="description-text">${complaint.description.substring(0, 150)}${complaint.description.length > 150 ? '...' : ''}</p>
                    </div>
                    
                    <div class="complaint-meta">
                        <div class="meta-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${complaint.location_address}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>${new Date(complaint.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            })}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-paperclip"></i>
                            <span>${complaint.evidence_count} Evidence File${complaint.evidence_count !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    complaintList.innerHTML = complaintsHTML;
}

// Filter Functions
function applyFilters() {
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const locationFilter = document.getElementById('locationFilter').value.toLowerCase();

    filteredComplaints = allComplaints.filter(complaint => {
        // Date filter
        const complaintDate = new Date(complaint.created_at);
        const fromDate = dateFrom ? new Date(dateFrom) : null;
        const toDate = dateTo ? new Date(dateTo) : null;
        
        if (fromDate && complaintDate < fromDate) return false;
        if (toDate && complaintDate > toDate) return false;
        
        // Status filter
        if (statusFilter && complaint.status !== statusFilter) return false;
        
        // Location filter
        if (locationFilter && !complaint.location_address.toLowerCase().includes(locationFilter)) return false;
        
        return true;
    });

    displayComplaints(filteredComplaints);
}

function clearFilters() {
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('locationFilter').value = '';
    
    filteredComplaints = [...allComplaints];
    displayComplaints(filteredComplaints);
}

// Notification Functions
function toggleNotifications(complaintId) {
    const panel = document.getElementById(`notifications-${complaintId}`);
    const isVisible = panel.classList.contains('show');
    
    // Close all other notification panels
    document.querySelectorAll('.notification-panel').forEach(p => p.classList.remove('show'));
    
    if (!isVisible) {
        panel.classList.add('show');
        loadNotifications(complaintId);
    }
}

function loadNotifications(complaintId) {
    const contentDiv = document.getElementById(`notification-content-${complaintId}`);
    
    fetch(`/complaint-notifications/${complaintId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayNotifications(contentDiv, data.notifications, complaintId);
                markNotificationsAsRead(complaintId);
            } else {
                contentDiv.innerHTML = '<p class="notification-message">Failed to load notifications</p>';
            }
        })
        .catch(error => {
            console.error('Error loading notifications:', error);
            contentDiv.innerHTML = '<p class="notification-message">Error loading notifications</p>';
        });
}

function displayNotifications(container, notifications, complaintId) {
    if (notifications.length === 0) {
        container.innerHTML = '<p class="notification-message" style="padding: 16px; text-align: center; color: #9ca3af;">No notifications yet</p>';
        return;
    }
    
    const notificationsHTML = notifications.map(notification => `
        <div class="notification-item ${!notification.is_read ? 'unread' : ''}">
            <div class="notification-text">${notification.message}</div>
            <div class="notification-time">${formatTimeAgo(notification.created_at)}</div>
        </div>
    `).join('');
    
    container.innerHTML = notificationsHTML;
}

function markNotificationsAsRead(complaintId) {
    fetch(`/mark-notifications-read/${complaintId}`, {
        method: 'POST',
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update the specific complaint's notification count
            const complaint = allComplaints.find(c => c.complaint_id === complaintId);
            if (complaint) {
                complaint.unread_notifications = 0;
            }
            
            // Hide the notification badge for this specific complaint
            const badge = document.getElementById(`badge-${complaintId}`);
            if (badge) {
                badge.style.display = 'none';
                badge.textContent = '0';
            }
        }
    })
    .catch(error => console.error('Error marking notifications as read:', error));
}

// Fixed updateNotificationCounts function
function updateNotificationCounts() {
    // Update notification badges based on actual unread counts
    allComplaints.forEach(complaint => {
        const badge = document.getElementById(`badge-${complaint.complaint_id}`);
        const notificationCount = complaint.unread_notifications || 0;
        
        if (badge) {
            if (notificationCount > 0) {
                badge.textContent = notificationCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    });
}

// Chat Functions
function openChat(complaintId) {
    const modal = document.getElementById('chatModal') || createChatModal();
    const messagesContainer = modal.querySelector('.chat-messages');
    const chatTitle = modal.querySelector('.chat-title');
    
    chatTitle.textContent = `Chat - Complaint #${complaintId}`;
    modal.setAttribute('data-complaint-id', complaintId);
    modal.classList.add('show');
    
    loadChatMessages(complaintId, messagesContainer);
}

function createChatModal() {
    const modal = document.createElement('div');
    modal.id = 'chatModal';
    modal.className = 'chat-modal';
    modal.innerHTML = `
        <div class="chat-container">
            <div class="chat-header">
                <h3 class="chat-title">Chat</h3>
                <button class="chat-close" onclick="closeChat()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="chat-messages" id="chatMessages"></div>
            <div class="chat-input-area">
                <div class="chat-input-container">
                    <textarea class="chat-input" id="chatInput" placeholder="Type your message..." rows="1"></textarea>
                    <button class="chat-send-btn" onclick="sendMessage()">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-resize textarea
    const textarea = modal.querySelector('.chat-input');
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 80) + 'px';
    });
    
    // Send message on Enter
    textarea.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    return modal;
}

function closeChat() {
    const modal = document.getElementById('chatModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function loadChatMessages(complaintId, container) {
    container.innerHTML = '<div class="filter-loading"><div class="loading-spinner"></div><p>Loading messages...</p></div>';
    
    fetch(`/complaint-chat/${complaintId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayChatMessages(container, data.messages);
            } else {
                container.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 20px;">Failed to load messages</p>';
            }
        })
        .catch(error => {
            console.error('Error loading chat messages:', error);
            container.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 20px;">Error loading messages</p>';
        });
}

function displayChatMessages(container, messages) {
    if (messages.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 20px;">No messages yet. Start the conversation!</p>';
        return;
    }
    
    const messagesHTML = messages.map(message => `
        <div class="chat-message ${message.sender_type}">
            <div class="message-bubble">
                ${message.message}
            </div>
            <div class="message-time">
                ${message.sender_type === 'admin' ? 'Admin' : 'You'} • ${formatTimeAgo(message.sent_at)}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = messagesHTML;
    container.scrollTop = container.scrollHeight;
}

function sendMessage() {
    const modal = document.getElementById('chatModal');
    const complaintId = modal.getAttribute('data-complaint-id');
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    const sendBtn = modal.querySelector('.chat-send-btn');
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<div class="loading-spinner"></div>';
    
    fetch('/send-chat-message', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            complaint_id: complaintId,
            message: message
        }),
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            input.value = '';
            input.style.height = 'auto';
            loadChatMessages(complaintId, modal.querySelector('.chat-messages'));
        } else {
            showNotification('Failed to send message: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error sending message:', error);
        showNotification('Error sending message. Please try again.', 'error');
    })
    .finally(() => {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
    });
}

// Helper Functions
function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return date.toLocaleDateString();
}

function getStatusColor(status) {
    switch (status.toLowerCase()) {
        case 'pending': return '#f39c12';
        case 'verifying': return '#3498db';
        case 'investigating': return '#e67e22';
        case 'resolved': return '#27ae60';
        case 'rejected': return '#e74c3c';
        default: return '#95a5a6';
    }
}

// Close notification panels when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.notification-icon')) {
        document.querySelectorAll('.notification-panel').forEach(panel => {
            panel.classList.remove('show');
        });
    }
});

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
});