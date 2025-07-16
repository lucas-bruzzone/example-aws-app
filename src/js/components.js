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
        const firstInput = this.modal.querySelector('input:not([type="hidden"])');
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

// Auth Form Component
class AuthForm {
    constructor(modalInstance) {
        this.modal = modalInstance;
        this.currentTab = 'login';
        this.statusEl = document.getElementById('authStatus');
        
        // Form elements
        this.loginForm = document.getElementById('loginForm');
        this.signupForm = document.getElementById('signupForm');
        this.confirmationForm = document.getElementById('confirmationForm');
        
        // Tab elements
        this.loginTabBtn = document.getElementById('loginTabBtn');
        this.signupTabBtn = document.getElementById('signupTabBtn');
        
        // Form divs
        this.loginFormDiv = document.getElementById('loginFormDiv');
        this.signupFormDiv = document.getElementById('signupFormDiv');
        this.confirmationDiv = document.getElementById('confirmationDiv');
        
        this.init();
    }

    init() {
        this.bindTabEvents();
        this.bindFormEvents();
        this.setupPasswordValidation();
    }

    bindTabEvents() {
        this.loginTabBtn.addEventListener('click', () => this.switchTab('login'));
        this.signupTabBtn.addEventListener('click', () => this.switchTab('signup'));
    }

    bindFormEvents() {
        // Login form
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        
        // Signup form
        this.signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        
        // Confirmation form
        this.confirmationForm.addEventListener('submit', (e) => this.handleConfirmation(e));
        
        // Resend code
        document.getElementById('resendCodeBtn').addEventListener('click', () => this.handleResendCode());
        
        // Enter key navigation
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        
        if (emailInput && passwordInput) {
            emailInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') passwordInput.focus();
            });
            
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.loginForm.requestSubmit();
            });
        }
    }

    setupPasswordValidation() {
        const signupPasswordInput = document.getElementById('signupPassword');
        const passwordHint = document.getElementById('passwordHint');

        if (signupPasswordInput && passwordHint) {
            signupPasswordInput.addEventListener('input', () => {
                const password = signupPasswordInput.value;
                const isValid = auth.validatePassword(password);
                
                passwordHint.classList.toggle('error', !isValid && password.length > 0);
                passwordHint.textContent = isValid || password.length === 0 
                    ? 'Mínimo 8 caracteres, maiúscula, minúscula e número'
                    : '❌ Senha não atende aos requisitos';
            });
        }
    }

    switchTab(tab) {
        this.currentTab = tab;

        // Update tabs
        this.loginTabBtn.classList.toggle('active', tab === 'login');
        this.signupTabBtn.classList.toggle('active', tab === 'signup');

        // Update forms
        this.loginFormDiv.classList.toggle('hidden', tab !== 'login');
        this.signupFormDiv.classList.toggle('hidden', tab !== 'signup');
        this.confirmationDiv.classList.add('hidden');

        // Update modal title
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) {
            modalTitle.textContent = tab === 'login' ? 'Acessar Sistema' : 'Criar Conta';
        }

        // Clear status
        this.clearStatus();
        
        // Focus first input
        setTimeout(() => {
            const activeForm = tab === 'login' ? this.loginFormDiv : this.signupFormDiv;
            const firstInput = activeForm.querySelector('input');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    showConfirmationForm() {
        // Hide tabs and forms
        document.querySelector('.modal-tabs').style.display = 'none';
        this.loginFormDiv.classList.add('hidden');
        this.signupFormDiv.classList.add('hidden');
        this.confirmationDiv.classList.remove('hidden');
        
        // Focus confirmation input
        setTimeout(() => {
            const confirmInput = document.getElementById('confirmCode');
            if (confirmInput) confirmInput.focus();
        }, 100);
    }

    resetToLogin() {
        // Show tabs again
        document.querySelector('.modal-tabs').style.display = 'flex';
        this.switchTab('login');
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        const submitBtn = document.getElementById('submitLogin');

        if (!email || !password) {
            this.showStatus('Preencha todos os campos.', 'error');
            return;
        }

        this.setLoading(submitBtn, true, 'Entrando...');
        
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
                    if (!auth.validatePassword(newPassword)) {
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
            this.setLoading(submitBtn, false, 'Entrar');
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const submitBtn = document.getElementById('submitSignup');
        
        if (!email || !password || !confirmPassword) {
            this.showStatus('Preencha todos os campos.', 'error');
            return;
        }

        if (!auth.validatePassword(password)) {
            this.showStatus('Senha não atende aos requisitos de segurança.', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showStatus('As senhas não coincidem.', 'error');
            return;
        }

        this.setLoading(submitBtn, true, 'Cadastrando...');
        
        try {
            const result = await auth.signUp(email, password);
            
            if (result.UserSub) {
                this.showStatus('Cadastro realizado! Verificando email...', 'success');
                setTimeout(() => this.showConfirmationForm(), 1500);
            } else if (result.__type) {
                let errorMessage = 'Erro no cadastro';
                switch (result.__type) {
                    case 'UsernameExistsException':
                        errorMessage = 'Este email já está cadastrado';
                        break;
                    case 'InvalidPasswordException':
                        errorMessage = 'Senha não atende aos requisitos';
                        break;
                    case 'InvalidParameterException':
                        errorMessage = 'Email inválido';
                        break;
                    default:
                        errorMessage = result.message || 'Erro no cadastro';
                }
                this.showStatus(errorMessage, 'error');
            } else {
                this.showStatus(result.message || 'Erro no cadastro', 'error');
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showStatus(`Erro: ${error.message}`, 'error');
        } finally {
            this.setLoading(submitBtn, false, 'Cadastrar');
        }
    }

    async handleConfirmation(e) {
        e.preventDefault();
        
        const code = document.getElementById('confirmCode').value.trim();
        const submitBtn = document.getElementById('submitConfirm');
        
        if (!code) {
            this.showStatus('Digite o código de confirmação.', 'error');
            return;
        }

        this.setLoading(submitBtn, true, 'Confirmando...');
        
        try {
            const result = await auth.confirmSignUp(auth.pendingConfirmationUsername, code);
            
            if (result.__type) {
                let errorMessage = 'Código inválido';
                switch (result.__type) {
                    case 'CodeMismatchException':
                        errorMessage = 'Código incorreto';
                        break;
                    case 'ExpiredCodeException':
                        errorMessage = 'Código expirado';
                        break;
                    case 'UserNotFoundException':
                        errorMessage = 'Usuário não encontrado';
                        break;
                    default:
                        errorMessage = result.message || 'Código inválido';
                }
                this.showStatus(errorMessage, 'error');
            } else {
                this.showStatus('Email confirmado! Você já pode fazer login.', 'success');
                setTimeout(() => this.resetToLogin(), 2000);
            }
        } catch (error) {
            console.error('Confirmation error:', error);
            this.showStatus(`Erro: ${error.message}`, 'error');
        } finally {
            this.setLoading(submitBtn, false, 'Confirmar');
        }
    }

    async handleResendCode() {
        const resendBtn = document.getElementById('resendCodeBtn');
        
        if (!auth.pendingConfirmationUsername) {
            this.showStatus('Erro: usuário não encontrado', 'error');
            return;
        }
        
        resendBtn.disabled = true;
        resendBtn.textContent = 'Enviando...';
        
        try {
            await auth.resendConfirmationCode(auth.pendingConfirmationUsername);
            this.showStatus('Código reenviado para seu email', 'success');
        } catch (error) {
            console.error('Resend error:', error);
            this.showStatus('Erro ao reenviar código', 'error');
        } finally {
            resendBtn.disabled = false;
            resendBtn.textContent = 'Reenviar';
        }
    }

    setLoading(button, loading, text) {
        button.disabled = loading;
        button.textContent = loading ? text : button.id.includes('Login') ? 'Entrar' : 
                             button.id.includes('Signup') ? 'Cadastrar' : 'Confirmar';
    }

    showStatus(message, type) {
        if (!this.statusEl) return;
        
        this.statusEl.textContent = message;
        this.statusEl.className = `auth-status ${type}`;
        this.statusEl.classList.remove('hidden');
        
        if (type === 'success') {
            setTimeout(() => this.clearStatus(), 3000);
        }
    }

    clearStatus() {
        if (this.statusEl) {
            this.statusEl.textContent = '';
            this.statusEl.className = 'auth-status hidden';
        }
    }

    clearForm() {
        this.loginForm.reset();
        this.signupForm.reset();
        this.confirmationForm.reset();
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
window.authForm = null;
window.userMenu = null;
window.toast = null;
window.routeProtection = null;

// Initialize components when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Components initializing...');
    
    // Initialize components
    window.modal = new Modal('loginModal');
    window.authForm = new AuthForm(window.modal);
    window.userMenu = new UserMenu();
    window.toast = new StatusToast();
    window.routeProtection = new RouteProtection();
    
    // Event delegation for logout as backup
    document.addEventListener('click', (e) => {
        const target = e.target;
        
        if (target.id === 'logoutBtn' || 
            target.classList.contains('logout-btn') ||
            target.closest('#logoutBtn') ||
            target.closest('.logout-btn')) {
            
            console.log('Logout button detected via delegation');
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