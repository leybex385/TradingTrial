// Basic interactivity for the dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Search bar shortcut
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            document.querySelector('.search-input').focus();
        }
    });

    // Simple carousel dot logic
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            dots.forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            // In a real app, this would change the image/content
        });
    });

    // Console log for demo
    console.log('Premium Market Dashboard Initialized.');
});
