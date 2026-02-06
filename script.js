
// Basic interactivity for the dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    lucide.createIcons();

    // Search bar shortcut
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            document.querySelector('.search-input')?.focus();
        }
    });

    // --- Carousel Logic ---
    const carouselContainer = document.querySelector('.news-carousel');
    if (carouselContainer) {
        initCarousel(carouselContainer);
    }

    // Console log for demo
    console.log('Premium Market Dashboard Initialized.');
});

function initCarousel(container) {
    // News items are now wrapped in anchor tags
    const newsLinks = container.querySelectorAll('.news-item-link');
    const dots = container.querySelectorAll('.dot');
    const prevBtn = container.querySelector('.nav-prev');
    const nextBtn = container.querySelector('.nav-next');
    let currentIndex = 0;

    if (!newsLinks.length) return;

    function showSlide(index) {
        // Wrap around
        if (index >= newsLinks.length) index = 0;
        if (index < 0) index = newsLinks.length - 1;

        currentIndex = index;

        // Update items - hide all, show current
        newsLinks.forEach((link, i) => {
            if (i === currentIndex) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Update dots
        dots.forEach(dot => dot.classList.remove('active'));
        if (dots[currentIndex]) {
            dots[currentIndex].classList.add('active');
        }
    }

    // Event Listeners - Stop propagation to prevent clicking the link
    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showSlide(currentIndex + 1);
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showSlide(currentIndex - 1);
        });
    }

    dots.forEach((dot, index) => {
        dot.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showSlide(index);
        });
    });

    // Initialize first slide
    showSlide(0);
}

// Initial Auth State Check (Preserved)
const urlParams = new URLSearchParams(window.location.search);
// Mock helper for DB (if existing in other files, otherwise this is just placeholder)
const DB = { getCurrentUser: () => localStorage.getItem('user') };
const user = DB.getCurrentUser();
const isLoggedIn = user || urlParams.get('logged_in') === 'true';

// Simple UI updates based on auth (if elements exist)
const loggedOutBanner = document.getElementById('loggedOutBanner');
const marketAuthPrompt = document.getElementById('marketAuthPrompt');
const portfolioBar = document.getElementById('portfolioBar');

if (isLoggedIn) {
    if (loggedOutBanner) loggedOutBanner.style.display = 'none';
    if (marketAuthPrompt) marketAuthPrompt.style.display = 'none';
    if (portfolioBar) portfolioBar.style.display = 'flex';
}
