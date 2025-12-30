// src/js/navigation-fix.js
document.addEventListener('DOMContentLoaded', function() {
    // Get all navigation links
    const navLinks = document.querySelectorAll('.navigation-link[href^="#"]');
    const footerNavLinks = document.querySelectorAll('.footer-nav-links[href^="#"]');
    
    // Combine all navigation links
    const allLinks = [...navLinks, ...footerNavLinks];
    
    // Smooth scroll function
    function smoothScrollToSection(targetId) {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            // Remove active classes from all navigation items
            document.querySelectorAll('.navigation-item').forEach(item => {
                item.classList.remove('navigation-active');
                const link = item.querySelector('.navigation-link');
                if (link) link.classList.remove('navigation-link-active');
            });
            
            // Add active class to clicked item
            const clickedItem = document.querySelector(`.navigation-item a[href="${targetId}"]`)?.closest('.navigation-item');
            if (clickedItem) {
                clickedItem.classList.add('navigation-active');
                const clickedLink = clickedItem.querySelector('.navigation-link');
                if (clickedLink) clickedLink.classList.add('navigation-link-active');
            }
            
            // Calculate offset for header height
            const headerHeight = document.querySelector('header').offsetHeight;
            const elementPosition = targetElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerHeight - 20;
            
            // Smooth scroll to section
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
            
            // Update URL hash without triggering another scroll
            history.pushState(null, null, targetId);
            
            // Close mobile menu if open
            const body = document.querySelector('body');
            if (body.classList.contains('appear-side-bar')) {
                body.classList.remove('appear-side-bar');
            }
        }
    }
    
    // Add click event listeners to all anchor links
    allLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Only handle internal anchor links
            if (href.startsWith('#')) {
                e.preventDefault();
                smoothScrollToSection(href);
            }
            // External links will follow their normal behavior
        });
    });
    
    // Update active navigation based on scroll position
    function updateActiveNavOnScroll() {
        const sections = document.querySelectorAll('section[id], #how-it-works');
        const scrollPosition = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = `#${section.id}`;
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                // Remove active classes from all
                document.querySelectorAll('.navigation-item').forEach(item => {
                    item.classList.remove('navigation-active');
                    const link = item.querySelector('.navigation-link');
                    if (link) link.classList.remove('navigation-link-active');
                });
                
                // Add active class to current section
                const activeNavItem = document.querySelector(`.navigation-item a[href="${sectionId}"]`)?.closest('.navigation-item');
                if (activeNavItem) {
                    activeNavItem.classList.add('navigation-active');
                    const activeLink = activeNavItem.querySelector('.navigation-link');
                    if (activeLink) activeLink.classList.add('navigation-link-active');
                }
            }
        });
    }
    
    // Listen for scroll events
    window.addEventListener('scroll', updateActiveNavOnScroll);
    
    // Initial call to set active state
    updateActiveNavOnScroll();
    
    // Handle initial page load with hash in URL
    if (window.location.hash) {
        setTimeout(() => {
            smoothScrollToSection(window.location.hash);
        }, 100);
    }
});