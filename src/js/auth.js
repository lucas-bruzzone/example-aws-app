// Configurações do Cognito
const COGNITO_CONFIG = {
    region: 'us-east-1',
    userPoolId: 'us-east-1_RLUfH7O3W',
    clientId: '6jd9ubub29r6acikgeccl3o9nl'
};

class CognitoAuth {
    constructor() {
        this.accessToken = localStorage.getItem('accessToken');
        this.currentUsername = null;
    }

    async signUp(email, password) {
        const url = `https://cognito-idp.${COGNITO_CONFIG.region}.amazonaws.com/`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-amz-json-1.1',
                'X-Amz-Target': 'AWSCognitoIdentityProviderService.SignUp'
            },
            body: JSON.stringify({
                ClientId: COGNITO_CONFIG.clientId,
                Username: email,
                Password: password,
                UserAttributes: [
                    {
                        Name: 'email',
                        Value: email
                    }
                ]
            })
        });

        return await response.json();
    }

    async signIn(email, password) {
        const url = `https://cognito-idp.${COGNITO_CONFIG.region}.amazonaws.com/`;
        this.currentUsername = email;
        
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
                    USERNAME: email,
                    PASSWORD: password
                }
            })
        });

        const data = await response.json();
        
        if (data.AuthenticationResult) {
            this.accessToken = data.AuthenticationResult.AccessToken;
            localStorage.setItem('accessToken', this.accessToken);
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
            localStorage.setItem('accessToken', this.accessToken);
        }
        
        return data;
    }

    signOut() {
        this.accessToken = null;
        this.currentUsername = null;
        localStorage.removeItem('accessToken');
    }

    isAuthenticated() {
        return !!this.accessToken;
    }

    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
        };
    }
}

// Instância global
const auth = new CognitoAuth();