const API_URL = 'https://nfvbev7jgc.execute-api.us-east-1.amazonaws.com/devops/validate';

// DOM Elements
const authSection = document.getElementById('authSection');
const heroSection = document.getElementById('heroSection');
const resultsSection = document.getElementById('results');
const authStatus = document.getElementById('authStatus');
const apiResponse = document.getElementById('apiResponse');

// Form elements
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const testBtn = document.getElementById('testBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    updateUI();
});

// Login handler
loginBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!email || !password) {
        showAuthStatus('Por favor, preencha todos os campos.', 'error');
        return;
    }
    
    loginBtn.disabled = true;
    loginBtn.textContent = 'Entrando...';
    
    try {
        const result = await auth.signIn(email, password);
        
        if (result.AuthenticationResult) {
            showAuthStatus('Login realizado com sucesso!', 'success');
            updateUI();
        } else if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
            const newPassword = prompt('Digite uma nova senha (mín. 8 chars, maiúscula, minúscula e número):');
            if (newPassword) {
                const finalResult = await auth.respondToNewPasswordRequired(result.Session, newPassword);
                if (finalResult.AuthenticationResult) {
                    showAuthStatus('Senha alterada e login realizado!', 'success');
                    updateUI();
                } else {
                    showAuthStatus('Erro ao alterar senha.', 'error');
                }
            }
        } else {
            showAuthStatus('Erro no login. Verifique suas credenciais.', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAuthStatus(`Erro: ${error.message}`, 'error');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Entrar';
    }
});

// Test API handler
testBtn.addEventListener('click', async () => {
    if (!auth.isAuthenticated()) {
        showApiResponse('Erro: Usuário não autenticado. Faça login primeiro.');
        return;
    }

    testBtn.disabled = true;
    testBtn.textContent = 'Testando...';
    showApiResponse('Carregando...');
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Teste do site estático',
                timestamp: new Date().toISOString(),
                user: 'test'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        showApiResponse(JSON.stringify(data, null, 2));
        
    } catch (error) {
        console.error('API test error:', error);
        showApiResponse(`Erro: ${error.message}`);
    } finally {
        testBtn.disabled = false;
        testBtn.textContent = 'Testar API';
    }
});

// Logout handler
logoutBtn.addEventListener('click', () => {
    auth.signOut();
    clearForm();
    updateUI();
    showAuthStatus('Logout realizado com sucesso.', 'success');
});

// Enter key support
emailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') passwordInput.focus();
});

passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginBtn.click();
});

// Helper functions
function updateUI() {
    const isAuthenticated = auth.isAuthenticated();
    
    authSection.classList.toggle('hidden', isAuthenticated);
    heroSection.classList.toggle('hidden', !isAuthenticated);
    
    if (isAuthenticated) {
        clearAuthStatus();
    }
}

function showAuthStatus(message, type) {
    authStatus.textContent = message;
    authStatus.className = type;
}

function clearAuthStatus() {
    authStatus.textContent = '';
    authStatus.className = '';
}

function showApiResponse(response) {
    apiResponse.textContent = response;
    resultsSection.classList.add('show');
}

function clearForm() {
    emailInput.value = '';
    passwordInput.value = '';
}