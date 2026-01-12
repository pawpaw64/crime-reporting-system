// ============================================
// HEADER & NAVIGATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initMobileMenu();
    initSmoothScroll();
    initScrollSpy();
});

// Mobile menu toggle
function initMobileMenu() {
    const openBtn = document.getElementById('menu-open-btn');
    const closeBtn = document.getElementById('menu-close-btn');
    
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            document.body.classList.toggle('appear-side-bar');
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => openBtn?.click());
    }
}

// Smooth scroll for anchor links
function initSmoothScroll() {
    const navLinks = document.querySelectorAll('.navigation-link[href^="#"], .footer-nav-links[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (!href.startsWith('#')) return;
            
            e.preventDefault();
            const target = document.querySelector(href);
            if (!target) return;
            
            const headerHeight = document.querySelector('header')?.offsetHeight || 0;
            const offset = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
            
            window.scrollTo({ top: offset, behavior: 'smooth' });
            history.pushState(null, null, href);
            
            // Close mobile menu
            document.body.classList.remove('appear-side-bar');
            
            // Update active state
            updateActiveNav(href);
        });
    });
}

// Scroll spy for navigation
function initScrollSpy() {
    const sections = document.querySelectorAll('section[id]');
    if (!sections.length) return;
    
    const onScroll = () => {
        const scrollPos = window.scrollY + 100;
        
        sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            
            if (scrollPos >= top && scrollPos < top + height) {
                updateActiveNav(`#${section.id}`);
            }
        });
    };
    
    window.addEventListener('scroll', onScroll);
    onScroll();
}

function updateActiveNav(targetId) {
    document.querySelectorAll('.navigation-item').forEach(item => {
        item.classList.remove('navigation-active');
        const link = item.querySelector('.navigation-link');
        if (link) link.classList.remove('navigation-link-active');
    });
    
    const activeItem = document.querySelector(`.navigation-item a[href="${targetId}"]`)?.closest('.navigation-item');
    if (activeItem) {
        activeItem.classList.add('navigation-active');
        const link = activeItem.querySelector('.navigation-link');
        if (link) link.classList.add('navigation-link-active');
    }
}

// Handle initial hash in URL
if (window.location.hash) {
    setTimeout(() => {
        const target = document.querySelector(window.location.hash);
        if (target) {
            const headerHeight = document.querySelector('header')?.offsetHeight || 0;
            window.scrollTo({
                top: target.offsetTop - headerHeight - 20,
                behavior: 'smooth'
            });
        }
    }, 100);
}
