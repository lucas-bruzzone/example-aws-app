const API_URL = 'https://nfvbev7jgc.execute-api.us-east-1.amazonaws.com/devops/validate';

document.getElementById('testBtn').addEventListener('click', async () => {
    const resultsDiv = document.getElementById('results');
    const responseDiv = document.getElementById('apiResponse');
    
    try {
        resultsDiv.style.display = 'block';
        responseDiv.textContent = 'Carregando...';
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
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