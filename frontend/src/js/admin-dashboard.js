// for the location: it is default to Dhaka and won't be changed unless the main admin changes the location
let allowChange = false; // you can set this to true if logic allows
const select = document.getElementById("district");
if (select) {
    select.addEventListener("change", function () {
        if (!allowChange) {
            // Force back to "Dhaka"
            select.value = "dhaka";
        }
    });
}

// for side panel
const buttons = document.querySelectorAll('.btn-organize');
const sections = document.querySelectorAll('.panel-section');

buttons.forEach(button => {
    button.addEventListener('click', () => {
        // Update active button
        buttons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Get target section
        const target = button.getAttribute('data-section');

        // Show target section, hide others
        sections.forEach(section => {
            section.style.display = section.id === target ? 'block' : 'none';
        });
    });
});

// Scroll indicator for sidebar navigation
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    // Create scroll indicator
    const scrollIndicator = document.createElement('div');
    scrollIndicator.className = 'scroll-indicator';
    scrollIndicator.innerHTML = '<i class="fas fa-chevron-down"></i>';
    navLinks.appendChild(scrollIndicator);

    // Function to check if scrolled to bottom
    function updateScrollIndicator() {
        const isScrollable = navLinks.scrollHeight > navLinks.clientHeight;
        const isAtBottom = navLinks.scrollHeight - navLinks.scrollTop - navLinks.clientHeight < 5;
        
        if (isScrollable && !isAtBottom) {
            scrollIndicator.classList.add('visible');
        } else {
            scrollIndicator.classList.remove('visible');
        }
    }

    // Check on scroll
    navLinks.addEventListener('scroll', updateScrollIndicator);

    // Check on load and resize
    updateScrollIndicator();
    window.addEventListener('resize', updateScrollIndicator);
});



