// Modal Component
class Modal {
    constructor(modalId) {
        this.modal = document.getElementById(modalId);
        this.overlay = this.modal;
        this.closeBtn = this.modal.querySelector('.modal-close');
        this.init();
    }

    init() {
        // Close on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // Close on button click
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.close());
        }

        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) {
                this.close();
            }
        });
    }

    open() {
        this.modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Focus first input
        const firstInput = this.modal.querySelector('input');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }

    close() {
        this.modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    isOpen() {
        return !this.modal.classList.contains('hidden');
    }
}

// Login Form Component
class LoginForm {
    constructor(formId, modalInstance) {
        this.form = document.getElementById(formId);
        this.modal = modalInstance;
        this.statusEl = document.getElementById('authStatus');
        this.submitBtn = this.form.querySelector('#submitLogin');
        this.init();
    }

    init() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Enter key navigation
        const emailInput = this.form.querySelector('#email');
        const passwordInput = this.form.querySelector('#password');
        
        if (emailInput && passwordInput) {
            emailInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') passwordInput.focus();
            });
            
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.form.requestSubmit();
            });
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const email = this.form.querySelector('#email').value.trim();
        const password = this.form.querySelector('#password').value.trim();

        if (!email || !password) {
            this.showStatus('Preencha todos os campos.', 'error');
            return;
        }

        this.setLoading(true);
        
        try {
            const result = await auth.signIn(email, password);
            
            if (result.AuthenticationResult) {
                this.showStatus('Login realizado com sucesso!', 'success');
                this.modal.close();
                this.clearForm();
                
                // Update UI and redirect
                window.updateAuthUI();
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 500);
                
            } else if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
                const newPassword = prompt('Digite uma nova senha (mín. 8 chars, maiúscula, minúscula e número):');
                if (newPassword) {
                    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
                    if (!passwordRegex.test(newPassword)) {
                        this.showStatus('A nova senha deve ter pelo menos 8 caracteres, incluindo maiúscula, minúscula e número.', 'error');
                        return;
                    }
                    
                    const finalResult = await auth.respondToNewPasswordRequired(result.Session, newPassword);
                    if (finalResult.AuthenticationResult) {
                        this.showStatus('Senha alterada e login realizado!', 'success');
                        this.modal.close();
                        window.updateAuthUI();
                        setTimeout(() => {
                            window.location.href = 'dashboard.html';
                        }, 500);
                    }
                }
            } else {
                const errorMessage = result.message || result.__type || 'Erro no login. Verifique suas credenciais.';
                this.showStatus(errorMessage, 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showStatus(`Erro: ${error.message}`, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        this.submitBtn.disabled = loading;
        this.submitBtn.textContent = loading ? 'Entrando...' : 'Entrar';
    }

    showStatus(message, type) {
        if (!this.statusEl) return;
        
        this.statusEl.textContent = message;
        this.statusEl.className = `auth-status ${type}`;
        
        if (type === 'success') {
            setTimeout(() => this.clearStatus(), 3000);
        }
    }

    clearStatus() {
        if (this.statusEl) {
            this.statusEl.textContent = '';
            this.statusEl.className = 'auth-status';
        }
    }

    clearForm() {
        this.form.reset();
        this.clearStatus();
    }
}

// User Menu Component
class UserMenu {
    constructor() {
        this.userMenu = document.getElementById('userMenu');
        this.userAvatar = document.getElementById('userAvatar');
        this.userInitial = document.getElementById('userInitial');
        this.dropdown = document.getElementById('userDropdown');
        this.init();
    }

    init() {
        // Direct binding for logout buttons
        this.bindLogoutButtons();

        // Handle dropdown visibility
        if (this.userMenu && this.dropdown) {
            let timeoutId;
            
            this.userMenu.addEventListener('mouseenter', () => {
                clearTimeout(timeoutId);
                this.dropdown.style.opacity = '1';
                this.dropdown.style.visibility = 'visible';
                this.dropdown.style.transform = 'translateY(0)';
            });
            
            this.userMenu.addEventListener('mouseleave', () => {
                timeoutId = setTimeout(() => {
                    this.dropdown.style.opacity = '0';
                    this.dropdown.style.visibility = 'hidden';
                    this.dropdown.style.transform = 'translateY(-10px)';
                }, 100);
            });
        }
    }

    bindLogoutButtons() {
        // Try to bind immediately
        const logoutBtns = document.querySelectorAll('#logoutBtn, .logout-btn');
        console.log('Found logout buttons:', logoutBtns.length);
        
        logoutBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Logout button clicked');
                this.handleLogout();
            });
        });

        // Retry after delay if no buttons found
        if (logoutBtns.length === 0) {
            setTimeout(() => this.bindLogoutButtons(), 1000);
        }
    }

    updateUser(username) {
        if (this.userInitial && username) {
            this.userInitial.textContent = username.charAt(0).toUpperCase();
        }
    }

    handleLogout() {
        console.log('Logout initiated');
        auth.signOut();
        
        // Update UI
        if (window.updateAuthUI) {
            window.updateAuthUI();
        }
        
        // Show success message
        if (window.toast) {
            window.toast.show('Logout realizado com sucesso', 'success');
        }
        
        // Redirect after delay
        setTimeout(() => {
            window.location.href = '/';
        }, 500);
    }
}

// Status Toast Component
class StatusToast {
    constructor() {
        this.container = this.createContainer();
        document.body.appendChild(this.container);
    }

    createContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;
        return container;
    }

    show(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        toast.style.cssText = `
            background: ${this.getBackgroundColor(type)};
            color: ${this.getTextColor(type)};
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            transform: translateX(100%);
            transition: transform 0.3s ease-in-out;
            max-width: 400px;
            font-weight: 500;
            border-left: 4px solid ${this.getBorderColor(type)};
        `;

        this.container.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 10);

        // Auto remove
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);

        return toast;
    }

    getBackgroundColor(type) {
        const colors = {
            success: '#d4edda',
            error: '#f8d7da',
            warning: '#fff3cd',
            info: '#d1ecf1'
        };
        return colors[type] || colors.info;
    }

    getTextColor(type) {
        const colors = {
            success: '#155724',
            error: '#721c24',
            warning: '#856404',
            info: '#0c5460'
        };
        return colors[type] || colors.info;
    }

    getBorderColor(type) {
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        return colors[type] || colors.info;
    }
}

// Route Protection
class RouteProtection {
    constructor() {
        this.protectedPages = ['dashboard.html', 'mapeamento.html'];
        this.init();
    }

    init() {
        this.checkCurrentRoute();
    }

    checkCurrentRoute() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        if (this.protectedPages.includes(currentPage)) {
            if (!auth.isAuthenticated() || !auth.isTokenValid()) {
                console.log('Acesso negado - redirecionando para home');
                window.location.href = '/';
                return false;
            }
        }
        return true;
    }

    protect(callback) {
        if (this.checkCurrentRoute()) {
            callback();
        }
    }
}

// Global instances
window.modal = null;
window.loginForm = null;
window.userMenu = null;
window.toast = null;
window.routeProtection = null;

// Initialize components when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Components initializing...');
    
    // Initialize components
    window.modal = new Modal('loginModal');
    window.loginForm = new LoginForm('loginForm', window.modal);
    window.userMenu = new UserMenu();
    window.toast = new StatusToast();
    window.routeProtection = new RouteProtection();
    
    // Also bind logout with event delegation as backup
    document.addEventListener('click', (e) => {
        const target = e.target;
        console.log('Click detected on:', target);
        
        if (target.id === 'logoutBtn' || 
            target.classList.contains('logout-btn') ||
            target.closest('#logoutBtn') ||
            target.closest('.logout-btn')) {
            
            console.log('Logout button detected, logging out...');
            e.preventDefault();
            
            auth.signOut();
            if (window.toast) {
                window.toast.show('Logout realizado com sucesso', 'success');
            }
            setTimeout(() => {
                window.location.href = '/';
            }, 500);
        }
    });
    
    console.log('Components initialized');
});