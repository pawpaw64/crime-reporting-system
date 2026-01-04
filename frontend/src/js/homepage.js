// Hero Slider
let items = document.querySelectorAll('.slider .list .item');
let navDots = document.querySelectorAll('.slider-nav button');
let next = document.querySelector('#next');
let previous = document.querySelector('#previous');

let countItem = items.length;
let itemActive = 0;
let intervalRefreshing = null;

// Only initialize slider if elements exist
if (next && previous && countItem > 0) {
    // Auto-slide interval (5 seconds for better UX)
    intervalRefreshing = setInterval(() => {
        if (next) next.click();
    }, 5000);

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
} else {
    console.log('Slider elements not found on this page - skipping slider initialization');
}

function sliderTurnedOn() {
    // Only run if slider elements exist
    if (!items || items.length === 0) return;
    
    // Remove active class from current slide
    let removeActiveSlider = document.querySelector('.slider .list .item.active');
    let removeActiveNav = document.querySelector('.slider-nav button.active');

    if (removeActiveSlider) removeActiveSlider.classList.remove('active');
    if (removeActiveNav) removeActiveNav.classList.remove('active');

    // Add active class to new slide
    if (items[itemActive]) items[itemActive].classList.add('active');
    if (navDots[itemActive]) navDots[itemActive].classList.add('active');

    // Reset auto-slide interval
    if (intervalRefreshing) clearInterval(intervalRefreshing);
    if (next) {
        intervalRefreshing = setInterval(() => {
            if (next) next.click();
        }, 5000);
    }
}

// Dot navigation click handlers
navDots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        itemActive = index;
        sliderTurnedOn();
    });
});