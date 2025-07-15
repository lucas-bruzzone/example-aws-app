// Main Application Controller
class App {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Wait for DOM and components to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.onReady());
        } else {
            this.onReady();
        }
    }

    onReady() {
        this.bindEvents();
        this.updateAuthUI();
        this.checkTokenValidity();
    }

    bindEvents() {
        // Login button clicks
        const loginBtns = [
            document.getElementById('loginBtn'),
            document.getElementById('heroLoginBtn'),
            document.getElementById('projectLoginBtn'),
            document.getElementById('ctaLoginBtn')
        ].filter(btn => btn);

        loginBtns.forEach(btn => {
            btn.addEventListener('click', () => this.openLoginModal());
        });

        // Navigation active state
        this.updateActiveNavLink();
    }

    openLoginModal() {
        if (auth.isAuthenticated()) {
            // Already logged in, redirect to dashboard
            window.location.href = 'dashboard.html';
        } else {
            // Open login modal
            if (window.modal) {
                window.modal.open();
            }
        }
    }

    updateAuthUI() {
        const loginBtn = document.getElementById('loginBtn');
        const userMenu = document.getElementById('userMenu');
        
        if (auth.isAuthenticated() && auth.isTokenValid()) {
            // Show user menu, hide login button
            if (loginBtn) loginBtn.style.display = 'none';
            if (userMenu) {
                userMenu.classList.remove('hidden');
                userMenu.style.display = 'block';
                
                // Update user initial
                if (window.userMenu && auth.currentUsername) {
                    window.userMenu.updateUser(auth.currentUsername);
                }
            }
        } else {
            // Show login button, hide user menu
            if (loginBtn) {
                loginBtn.style.display = 'block';
                loginBtn.textContent = 'Login';
            }
            if (userMenu) {
                userMenu.classList.add('hidden');
                userMenu.style.display = 'none';
            }
        }
    }

    updateActiveNavLink() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            
            if (
                (currentPage === 'index.html' && href === '/') ||
                (currentPage === href) ||
                (currentPage === '' && href === '/')
            ) {
                link.classList.add('active');
            }
        });
    }

    checkTokenValidity() {
        if (auth.isAuthenticated() && !auth.isTokenValid()) {
            console.log('Token expired, logging out');
            auth.signOut();
            this.updateAuthUI();
            
            if (window.toast) {
                window.toast.show('Sessão expirada. Faça login novamente.', 'warning');
            }
        }
    }

    // Show status messages
    showStatus(message, type = 'info') {
        if (window.toast) {
            window.toast.show(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Demo interaction for project page
class ProjectDemo {
    constructor() {
        this.init();
    }

    init() {
        // Add subtle animations to demo elements
        const demoElements = document.querySelectorAll('.demo-content, .map-polygon, .control-btn');
        
        demoElements.forEach((element, index) => {
            element.style.animationDelay = `${index * 0.2}s`;
        });

        // Simulate map interaction
        const mapPolygon = document.querySelector('.map-polygon');
        if (mapPolygon) {
            setInterval(() => {
                mapPolygon.style.opacity = mapPolygon.style.opacity === '0.7' ? '1' : '0.7';
            }, 3000);
        }
    }
}

// Smooth scrolling for anchor links
class SmoothScroll {
    constructor() {
        this.init();
    }

    init() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }
}

// Performance monitoring
class PerformanceMonitor {
    constructor() {
        this.startTime = performance.now();
        this.init();
    }

    init() {
        window.addEventListener('load', () => {
            const loadTime = performance.now() - this.startTime;
            console.log(`Page loaded in ${Math.round(loadTime)}ms`);
            
            // Report critical performance metrics
            if ('performance' in window) {
                const navigation = performance.getEntriesByType('navigation')[0];
                if (navigation) {
                    console.log('Performance metrics:', {
                        domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.navigationStart),
                        loadComplete: Math.round(navigation.loadEventEnd - navigation.navigationStart),
                        domInteractive: Math.round(navigation.domInteractive - navigation.navigationStart)
                    });
                }
            }
        });
    }
}

// Error handling
class ErrorHandler {
    constructor() {
        this.init();
    }

    init() {
        window.addEventListener('error', (e) => {
            console.error('JavaScript Error:', e.error);
            this.reportError('JavaScript Error', e.error.message, e.filename, e.lineno);
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled Promise Rejection:', e.reason);
            this.reportError('Promise Rejection', e.reason.message || e.reason);
        });
    }

    reportError(type, message, file = '', line = '') {
        // In production, send to error tracking service
        const errorData = {
            type,
            message,
            file,
            line,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            url: window.location.href
        };
        
        console.log('Error report:', errorData);
        
        // Show user-friendly message
        if (window.toast) {
            window.toast.show('Ops! Algo deu errado. Recarregue a página.', 'error');
        }
    }
}

// Global app instance
window.app = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    
    // Initialize additional features
    new ProjectDemo();
    new SmoothScroll();
    new PerformanceMonitor();
    new ErrorHandler();
    
    console.log('App initialized successfully');
});

// Global function to update auth UI (called from components)
window.updateAuthUI = () => {
    if (window.app) {
        window.app.updateAuthUI();
    }
};

// Global function to show status messages
window.showStatus = (message, type) => {
    if (window.app) {
        window.app.showStatus(message, type);
    }
};

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Alt + L = Open login modal
    if (e.altKey && e.key === 'l') {
        e.preventDefault();
        if (window.app && !auth.isAuthenticated()) {
            window.app.openLoginModal();
        }
    }
    
    // Alt + H = Go to home
    if (e.altKey && e.key === 'h') {
        e.preventDefault();
        window.location.href = '/';
    }
    
    // Alt + D = Go to dashboard (if authenticated)
    if (e.altKey && e.key === 'd') {
        e.preventDefault();
        if (auth.isAuthenticated()) {
            window.location.href = 'dashboard.html';
        }
    }
});

// Service Worker registration (for future PWA features)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Uncomment when service worker is ready
        // navigator.serviceWorker.register('/sw.js')
        //     .then(registration => console.log('SW registered'))
        //     .catch(error => console.log('SW registration failed'));
    });
}