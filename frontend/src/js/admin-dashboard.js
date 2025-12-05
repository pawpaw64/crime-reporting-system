// for the location: it is default to Dhaka and won't be changed unless the main admin changes the location
let allowChange = false; // you can set this to true if logic allows
const select = document.getElementById("district");
select.addEventListener("change", function () {
    if (!allowChange) {
        // Force back to "Dhaka"
        select.value = "dhaka";
    }
});



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



