// Configurações do Cognito
const COGNITO_CONFIG = {
    region: 'us-east-1',
    userPoolId: 'us-east-1_RLUfH7O3W',
    clientId: '6jd9ubub29r6acikgeccl3o9nl'
};

class CognitoAuth {
    constructor() {
        this.accessToken = localStorage.getItem('accessToken');
        this.idToken = localStorage.getItem('idToken');
        this.refreshToken = localStorage.getItem('refreshToken');
        this.currentUsername = null;
    }

    async signUp(username, password) {
        const url = `https://cognito-idp.${COGNITO_CONFIG.region}.amazonaws.com/`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-amz-json-1.1',
                'X-Amz-Target': 'AWSCognitoIdentityProviderService.SignUp'
            },
            body: JSON.stringify({
                ClientId: COGNITO_CONFIG.clientId,
                Username: username,
                Password: password,
                UserAttributes: [
                    {
                        Name: 'email',
                        Value: username // Se for email, será usado aqui
                    }
                ]
            })
        });

        return await response.json();
    }

    async signIn(username, password) {
        const url = `https://cognito-idp.${COGNITO_CONFIG.region}.amazonaws.com/`;
        this.currentUsername = username;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-amz-json-1.1',
                'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth'
            },
            body: JSON.stringify({
                ClientId: COGNITO_CONFIG.clientId,
                AuthFlow: 'USER_PASSWORD_AUTH',
                AuthParameters: {
                    USERNAME: username,
                    PASSWORD: password
                }
            })
        });

        const data = await response.json();
        
        if (data.AuthenticationResult) {
            this.accessToken = data.AuthenticationResult.AccessToken;
            this.idToken = data.AuthenticationResult.IdToken;
            this.refreshToken = data.AuthenticationResult.RefreshToken;
            
            // Salvar tokens no localStorage
            localStorage.setItem('accessToken', this.accessToken);
            localStorage.setItem('idToken', this.idToken);
            localStorage.setItem('refreshToken', this.refreshToken);
            
            console.log('Login successful, tokens saved');
        }
        
        return data;
    }

    async respondToNewPasswordRequired(session, newPassword) {
        const url = `https://cognito-idp.${COGNITO_CONFIG.region}.amazonaws.com/`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-amz-json-1.1',
                'X-Amz-Target': 'AWSCognitoIdentityProviderService.RespondToAuthChallenge'
            },
            body: JSON.stringify({
                ClientId: COGNITO_CONFIG.clientId,
                ChallengeName: 'NEW_PASSWORD_REQUIRED',
                Session: session,
                ChallengeResponses: {
                    USERNAME: this.currentUsername,
                    NEW_PASSWORD: newPassword
                }
            })
        });

        const data = await response.json();
        
        if (data.AuthenticationResult) {
            this.accessToken = data.AuthenticationResult.AccessToken;
            this.idToken = data.AuthenticationResult.IdToken;
            this.refreshToken = data.AuthenticationResult.RefreshToken;
            
            // Salvar tokens no localStorage
            localStorage.setItem('accessToken', this.accessToken);
            localStorage.setItem('idToken', this.idToken);
            localStorage.setItem('refreshToken', this.refreshToken);
        }
        
        return data;
    }

    signOut() {
        this.accessToken = null;
        this.idToken = null;
        this.refreshToken = null;
        this.currentUsername = null;
        
        // Limpar localStorage
        localStorage.removeItem('accessToken');
        localStorage.removeItem('idToken');
        localStorage.removeItem('refreshToken');
        
        console.log('User signed out, tokens cleared');
    }

    isAuthenticated() {
        return !!(this.accessToken || this.idToken);
    }

    // Método para obter o token (preferindo idToken para APIs)
    getToken() {
        return this.idToken || this.accessToken;
    }

    // Método para obter headers de autenticação
    getAuthHeaders() {
        const token = this.getToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    // Método para verificar se o token está válido (básico)
    isTokenValid() {
        const token = this.getToken();
        if (!token) return false;
        
        try {
            // Decodificar JWT para verificar expiração
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);
            return payload.exp > now;
        } catch (error) {
            console.error('Erro ao validar token:', error);
            return false;
        }
    }
}

// Instância global
const auth = new CognitoAuth();