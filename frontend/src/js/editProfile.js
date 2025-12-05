// This should be added to Scripts/editProfile.js

// Define our functions first so they're available immediately
function openEditForm() {
    console.log("Opening edit form");
    // Fetch user data when the edit form is opened
    fetchUserData();
    const modal = document.getElementById("editProfileModal");
    if (modal) {
        modal.style.display = "flex";
    } else {
        console.error("Modal not found!");
    }
}

function closeEditForm() {
    console.log("Closing edit form");
    const modal = document.getElementById("editProfileModal");
    if (modal) {
        modal.style.display = "none";
    } else {
        console.error("Modal element not found");
    }
}

function fetchUserData() {
    console.log("Fetching user data");
    fetch('/get-user-data')
        .then(response => {
            console.log("User data status:", response.status);
            return response.json();
        })
        .then(data => {
            console.log("User data response:", data);
            
            if (data.success) {
                const user = data.user;
                
                // Populate form fields with user data - using correct case for fullName
                document.getElementById('editFullName').value = user.fullName || "";
                document.getElementById('editEmail').value = user.email || "";
                document.getElementById('editPhone').value = user.phone || "";
                document.getElementById('editLocation').value = user.location || "";
                
                // Format date if exists
                if (user.dob) {
                    try {
                        const dobDate = new Date(user.dob);
                        const formattedDob = dobDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
                        document.getElementById('editDOB').value = formattedDob;
                    } catch (e) {
                        console.error("Error formatting date:", e);
                        document.getElementById('editDOB').value = user.dob;
                    }
                }
            } else {
                alert("Error: " + data.message);
            }
        })
        .catch(error => {
            console.error("Error fetching user data:", error);
            alert("Error fetching user data: " + error.message);
        });
}

function getLocation() {
    const locationInput = document.getElementById("editLocation");

    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(success, error);

    function success(position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        const apiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=2caa6cd327404e8a8881300f50f2d21c`;

        fetch(apiUrl)
            .then((response) => response.json())
            .then((data) => {
                if (data.results.length > 0) {
                    const formatted = data.results[0].formatted;
                    locationInput.value = formatted;
                } else {
                    alert("No address found for your location.");
                }
            })
            .catch((error) => {
                console.error("Geolocation error:", error);
                alert("Failed to fetch location data.");
            });
    }

    function error() {
        alert("Unable to retrieve your location.");
    }
}

// Make functions globally available
window.openEditForm = openEditForm;
window.closeEditForm = closeEditForm;
window.getLocation = getLocation;

// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function() {
    console.log("EditProfile.js loaded and DOM is ready");
    
    // Add event listener to the edit profile button
    const editBtn = document.getElementById("editProfileBtn");
    if (editBtn) {
        console.log("Edit button found");
        editBtn.addEventListener("click", function() {
            console.log("Edit button clicked via event listener");
            openEditForm();
        });
    } else {
        console.error("Edit button not found! Trying to find by class instead.");
        // Fallback - try to find by class
        const editBtnByClass = document.querySelector(".edit-btn");
        if (editBtnByClass) {
            console.log("Edit button found by class");
            editBtnByClass.addEventListener("click", function() {
                console.log("Edit button clicked via class selector");
                openEditForm();
            });
        }
    }
    
    // Add event listener for cancel button
    const cancelBtn = document.getElementById("cancelEditBtn");
    if (cancelBtn) {
        console.log("Cancel button found");
        cancelBtn.addEventListener("click", function() {
            console.log("Cancel button clicked");
            closeEditForm();
        });
    } else {
        console.error("Cancel button not found!");
    }
    
    // Add event listener for the form submission
    const editProfileForm = document.getElementById("editProfileForm");
    if (editProfileForm) {
        console.log("Profile form found");
        editProfileForm.addEventListener("submit", function(e) {
            e.preventDefault();
            console.log("Form submitted");
            
            // Get form values
            const fullName = document.getElementById("editFullName").value;
            const email = document.getElementById("editEmail").value;
            const phone = document.getElementById("editPhone").value;
            const location = document.getElementById("editLocation").value;
            const dob = document.getElementById("editDOB").value;
            
            console.log("Form data being submitted:", {
                fullName, email, phone, location, dob
            });
            
            // Use fetch API instead of XMLHttpRequest for better error handling
            fetch('/update-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fullName: fullName,
                    // email is removed from here since it's readonly
                    phone: phone,
                    location: location,
                    dob: dob
                })
            })
            .then(response => {
                console.log("Response status:", response.status);
                return response.json();
            })
            .then(data => {
                console.log("Response data:", data);
                if (data.success) {
                    // Close modal and refresh page to show updated info
                    alert("Profile updated successfully!");
                    closeEditForm();
                    window.location.reload();
                } else {
                    alert("Error: " + data.message);
                }
            })
            .catch(error => {
                console.error("Fetch error:", error);
                alert("Error updating profile: " + error.message);
            });
        });
    } else {
        console.error("Profile form not found!");
    }
});