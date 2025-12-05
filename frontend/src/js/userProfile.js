document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        // Toggle button active
        document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        // Toggle content section
        const tab = btn.getAttribute("data-tab");
        document.querySelectorAll(".tab-content").forEach((content) => {
            content.classList.remove("active");
        });
        document.getElementById(tab).classList.add("active");
    });
});

