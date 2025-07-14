const API_URL = 'https://nfvbev7jgc.execute-api.us-east-1.amazonaws.com/devops/validate';

document.getElementById('testBtn').addEventListener('click', async () => {
    const resultsDiv = document.getElementById('results');
    const responseDiv = document.getElementById('apiResponse');
    
    try {
        // Verificar se está autenticado
        if (!auth.isAuthenticated()) {
            responseDiv.textContent = 'Erro: Usuário não autenticado. Faça login primeiro.';
            resultsDiv.style.display = 'block';
            return;
        }

        resultsDiv.style.display = 'block';
        responseDiv.textContent = 'Carregando...';
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: auth.getAuthHeaders(),
            body: JSON.stringify({
                message: 'Teste do site estático',
                timestamp: new Date().toISOString()
            })
        });
        
        const data = await response.json();
        responseDiv.textContent = JSON.stringify(data, null, 2);
        
    } catch (error) {
        responseDiv.textContent = `Erro: ${error.message}`;
    }
});

// Login simples para teste
async function testLogin() {
    try {
        const result = await auth.signIn('test@email.com', 'YourPassword123!');
        console.log('Login resultado:', result);
    } catch (error) {
        console.error('Erro no login:', error);
    }
}