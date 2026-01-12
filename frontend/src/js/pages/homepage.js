// ============================================
// HOMEPAGE SLIDER
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const items = document.querySelectorAll('.slider .list .item');
    const navDots = document.querySelectorAll('.slider-nav button');
    const next = document.querySelector('#next');
    const previous = document.querySelector('#previous');
    
    if (!next || !previous || items.length === 0) return;
    
    let itemActive = 0;
    const countItem = items.length;
    
    // Auto-slide interval
    let interval = setInterval(() => next.click(), 5000);
    
    function activateSlide(index) {
        // Remove active from current
        document.querySelector('.slider .list .item.active')?.classList.remove('active');
        document.querySelector('.slider-nav button.active')?.classList.remove('active');
        
        // Add active to new
        items[index]?.classList.add('active');
        navDots[index]?.classList.add('active');
        
        // Reset interval
        clearInterval(interval);
        interval = setInterval(() => next.click(), 5000);
    }
    
    next.addEventListener('click', () => {
        itemActive = (itemActive + 1) % countItem;
        activateSlide(itemActive);
    });
    
    previous.addEventListener('click', () => {
        itemActive = (itemActive - 1 + countItem) % countItem;
        activateSlide(itemActive);
    });
    
    // Dot navigation
    navDots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            itemActive = index;
            activateSlide(itemActive);
        });
    });
});
