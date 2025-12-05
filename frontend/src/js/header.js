// toggle mobile menubar for header
const openButton = document.getElementById("menu-open-btn");
const closeButton = document.getElementById("menu-close-btn");

openButton.addEventListener("click", () => {
    document.body.classList.toggle("appear-side-bar");
});
closeButton.addEventListener("click", () => {
    openButton.click();
});
