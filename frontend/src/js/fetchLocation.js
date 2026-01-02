function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(success, error);
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}

function success(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    // Optional: Replace this with your Google Maps Geocoding API key
    const apiKey = "AIzaSyCJMg7m2fwRuhDsH40nXyeG0BdfSPqzlyg";//tanzil er api key
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (data.results && data.results[0]) {
                document.getElementById("editLocation").value = data.results[0].formatted_address;
            } else {
                alert("Unable to retrieve location address.");
            }
        })
        .catch(() => {
            alert("Failed to connect to the location service.");
        });
}

function error() {
    alert("Unable to retrieve your location.");
}