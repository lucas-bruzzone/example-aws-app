const API_URL = 'https://nfvbev7jgc.execute-api.us-east-1.amazonaws.com/devops/validate';

// DOM Elements
const authSection = document.getElementById('authSection');
const heroSection = document.getElementById('heroSection');
const resultsSection = document.getElementById('results');
const authStatus = document.getElementById('authStatus');
const apiResponse = document.getElementById('apiResponse');

// Form elements
const usernameInput = document.getElementById('email'); // ID mantido como 'email' por compatibilidade
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const testBtn = document.getElementById('testBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    
    // Verificar se há tokens salvos e se são válidos
    if (auth.isAuthenticated()) {
        if (!auth.isTokenValid()) {
            console.log('Token expirado, fazendo logout automático');
            auth.signOut();
            updateUI();
            showAuthStatus('Sessão expirada. Faça login novamente.', 'error');
        }
    }
});

// Login handler
loginBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!username || !password) {
        showAuthStatus('Por favor, preencha todos os campos.', 'error');
        return;
    }
    
    // Campo pode ser email ou username - sem validação específica
    
    loginBtn.disabled = true;
    loginBtn.textContent = 'Entrando...';
    
    try {
        const result = await auth.signIn(username, password);
        
        if (result.AuthenticationResult) {
            showAuthStatus('Login realizado com sucesso!', 'success');
            updateUI();
        } else if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
            const newPassword = prompt('Digite uma nova senha (mín. 8 chars, maiúscula, minúscula e número):');
            if (newPassword) {
                // Validação da nova senha
                const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
                if (!passwordRegex.test(newPassword)) {
                    showAuthStatus('A nova senha deve ter pelo menos 8 caracteres, incluindo maiúscula, minúscula e número.', 'error');
                    return;
                }
                
                const finalResult = await auth.respondToNewPasswordRequired(result.Session, newPassword);
                if (finalResult.AuthenticationResult) {
                    showAuthStatus('Senha alterada e login realizado!', 'success');
                    updateUI();
                } else {
                    showAuthStatus('Erro ao alterar senha.', 'error');
                }
            }
        } else {
            // Tratar diferentes tipos de erro
            const errorMessage = result.message || result.__type || 'Erro no login. Verifique suas credenciais.';
            showAuthStatus(`Erro: ${errorMessage}`, 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAuthStatus(`Erro: ${error.message}`, 'error');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Entrar';
    }
});

// Test API handler - VERSÃO CORRIGIDA
testBtn.addEventListener('click', async () => {
    if (!auth.isAuthenticated()) {
        showApiResponse('Erro: Usuário não autenticado. Faça login primeiro.');
        return;
    }

    // Verificar se o token ainda é válido
    if (!auth.isTokenValid()) {
        showApiResponse('Erro: Token expirado. Faça login novamente.');
        auth.signOut();
        updateUI();
        return;
    }

    testBtn.disabled = true;
    testBtn.textContent = 'Testando...';
    showApiResponse('Carregando...');
    
    try {
        // Usar o token da classe auth
        const token = auth.getToken();
        
        if (!token) {
            throw new Error('Token de acesso não encontrado');
        }
        
        console.log('Enviando requisição com token:', token.substring(0, 20) + '...');
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                message: 'Teste do site estático',
                timestamp: new Date().toISOString(),
                user: 'test'
            })
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            let errorText;
            try {
                const errorData = await response.json();
                errorText = errorData.message || errorData.error || JSON.stringify(errorData);
            } catch {
                errorText = await response.text();
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
        }
        
        const data = await response.json();
        showApiResponse(JSON.stringify(data, null, 2));
        
    } catch (error) {
        console.error('API test error:', error);
        
        // Se for erro 401, pode ser token inválido
        if (error.message.includes('401')) {
            showApiResponse('Erro 401: Token inválido ou expirado. Tente fazer login novamente.');
            auth.signOut();
            updateUI();
        } else {
            showApiResponse(`Erro: ${error.message}`);
        }
    } finally {
        testBtn.disabled = false;
        testBtn.textContent = 'Testar API';
    }
});

// Logout handler
logoutBtn.addEventListener('click', () => {
    auth.signOut();
    clearForm();
    clearApiResponse();
    updateUI();
    showAuthStatus('Logout realizado com sucesso.', 'success');
});

// Enter key support
usernameInput.addEventListener('keypress', (e) => {
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
    } else {
        clearApiResponse();
    }
}

function showAuthStatus(message, type) {
    authStatus.textContent = message;
    authStatus.className = type;
    
    // Auto-clear success messages
    if (type === 'success') {
        setTimeout(() => {
            clearAuthStatus();
        }, 3000);
    }
}

function clearAuthStatus() {
    authStatus.textContent = '';
    authStatus.className = '';
}

function showApiResponse(response) {
    apiResponse.textContent = response;
    resultsSection.classList.add('show');
}

function clearApiResponse() {
    apiResponse.textContent = '';
    resultsSection.classList.remove('show');
}

function clearForm() {
    usernameInput.value = '';
    passwordInput.value = '';
}