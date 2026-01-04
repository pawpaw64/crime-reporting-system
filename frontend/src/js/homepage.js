// Hero Slider
let items = document.querySelectorAll('.slider .list .item');
let navDots = document.querySelectorAll('.slider-nav button');
let next = document.querySelector('#next');
let previous = document.querySelector('#previous');

// Check if slider elements exist on this page
if (!next || !previous || items.length === 0) {
    console.log('Slider elements not found on this page');
} else {
    let countItem = items.length;
    let itemActive = 0;

    // Auto-slide interval (5 seconds for better UX)
    let intervalRefreshing = setInterval(() => {
        next.click();
    }, 5000);

    next.onclick = function() {
        itemActive = itemActive + 1;
        if (itemActive >= countItem) {
            itemActive = 0;
        }
        sliderTurnedOn();
    };
    next.onclick = function() {
        itemActive = itemActive + 1;
        if (itemActive >= countItem) {
            itemActive = 0;
        }
        sliderTurnedOn();
    };

    previous.onclick = function() {
        itemActive = itemActive - 1;
        if (itemActive < 0) {
            itemActive = countItem - 1;
        }
        sliderTurnedOn();
    };

    function sliderTurnedOn() {
        // Remove active class from current slide
        let removeActiveSlider = document.querySelector('.slider .list .item.active');
        let removeActiveNav = document.querySelector('.slider-nav button.active');

        if (removeActiveSlider) removeActiveSlider.classList.remove('active');
        if (removeActiveNav) removeActiveNav.classList.remove('active');

        // Add active class to new slide
        items[itemActive].classList.add('active');
        navDots[itemActive].classList.add('active');

        // Reset auto-slide interval
        clearInterval(intervalRefreshing);
        intervalRefreshing = setInterval(() => {
            next.click();
        }, 5000);
    }

    // Dot navigation click handlers
    navDots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            itemActive = index;
            sliderTurnedOn();
        });
    });
}