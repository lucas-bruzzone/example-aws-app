// Configurações do Cognito
const COGNITO_CONFIG = {
    region: 'us-east-1',
    userPoolId: 'us-east-1_EkIZzPSf0',
    clientId: '45c9vf0elept4c6l50cv7eo67q',
    domain: 'example-cloud-api-devops-auth'
};

class CognitoAuth {
    constructor() {
        this.accessToken = localStorage.getItem('accessToken');
        this.idToken = localStorage.getItem('idToken');
        this.refreshToken = localStorage.getItem('refreshToken');
        this.currentUsername = null;
        this.pendingConfirmationUsername = null;
        
        console.log('🚀 Auth constructor - tokens:', {
            hasAccessToken: !!this.accessToken,
            hasIdToken: !!this.idToken,
            hasRefreshToken: !!this.refreshToken
        });
    }

    // Hosted UI Login (Cognito + Google)
    signInWithHostedUI() {
        const redirectUri = window.location.origin + '/callback.html';
        const url = `https://${COGNITO_CONFIG.domain}.auth.${COGNITO_CONFIG.region}.amazoncognito.com/oauth2/authorize?` +
            `client_id=${COGNITO_CONFIG.clientId}&` +
            `response_type=code&` +
            `scope=email+openid+profile&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}`;
        
        window.location.href = url;
    }

    // Google SSO direto
    signInWithGoogle() {
        const redirectUri = window.location.origin + '/callback.html';
        const url = `https://${COGNITO_CONFIG.domain}.auth.${COGNITO_CONFIG.region}.amazoncognito.com/oauth2/authorize?` +
            `client_id=${COGNITO_CONFIG.clientId}&` +
            `response_type=code&` +
            `scope=email+openid+profile&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `identity_provider=Google`;
        
        window.location.href = url;
    }

    // Trocar código OAuth por tokens
    async exchangeCodeForTokens(code) {
        const redirectUri = window.location.origin + '/callback.html';
        
        try {
            const response = await fetch(`https://${COGNITO_CONFIG.domain}.auth.${COGNITO_CONFIG.region}.amazoncognito.com/oauth2/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: COGNITO_CONFIG.clientId,
                    code: code,
                    redirect_uri: redirectUri
                })
            });

            if (response.ok) {
                const data = await response.json();
                
                this.accessToken = data.access_token;
                this.idToken = data.id_token;
                this.refreshToken = data.refresh_token;
                
                // Salvar tokens
                localStorage.setItem('accessToken', this.accessToken);
                localStorage.setItem('idToken', this.idToken);
                localStorage.setItem('refreshToken', this.refreshToken);
                
                // Extrair username do token
                const payload = JSON.parse(atob(this.idToken.split('.')[1]));
                console.log('🎫 Token payload:', payload);
                this.currentUsername = payload['cognito:username'] || payload.email || 'User';
                console.log('👤 Username extracted:', this.currentUsername);
                
                return { success: true };
            } else {
                throw new Error(`Token exchange failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Token exchange error:', error);
            return { success: false, error: error.message };
        }
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
                        Value: username
                    }
                ]
            })
        });

        const data = await response.json();
        
        if (data.UserSub) {
            this.pendingConfirmationUsername = username;
        }
        
        return data;
    }

    async confirmSignUp(username, confirmationCode) {
        const url = `https://cognito-idp.${COGNITO_CONFIG.region}.amazonaws.com/`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-amz-json-1.1',
                'X-Amz-Target': 'AWSCognitoIdentityProviderService.ConfirmSignUp'
            },
            body: JSON.stringify({
                ClientId: COGNITO_CONFIG.clientId,
                Username: username,
                ConfirmationCode: confirmationCode
            })
        });

        return await response.json();
    }

    async resendConfirmationCode(username) {
        const url = `https://cognito-idp.${COGNITO_CONFIG.region}.amazonaws.com/`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-amz-json-1.1',
                'X-Amz-Target': 'AWSCognitoIdentityProviderService.ResendConfirmationCode'
            },
            body: JSON.stringify({
                ClientId: COGNITO_CONFIG.clientId,
                Username: username
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
            
            console.log('✅ Login successful, tokens saved');
            console.log('🎫 ID Token payload:', JSON.parse(atob(this.idToken.split('.')[1])));
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

    // Logout com Hosted UI
    signOut() {
        this.accessToken = null;
        this.idToken = null;
        this.refreshToken = null;
        this.currentUsername = null;
        this.pendingConfirmationUsername = null;
        
        // Limpar localStorage
        localStorage.removeItem('accessToken');
        localStorage.removeItem('idToken');
        localStorage.removeItem('refreshToken');
        
        console.log('🚪 User signed out, tokens cleared');
        
        // Logout do Hosted UI também
        const logoutUrl = `https://${COGNITO_CONFIG.domain}.auth.${COGNITO_CONFIG.region}.amazoncognito.com/logout?` +
            `client_id=${COGNITO_CONFIG.clientId}&` +
            `logout_uri=${encodeURIComponent(window.location.origin)}`;
        
        // Redirecionar para logout completo
        setTimeout(() => {
            window.location.href = logoutUrl;
        }, 100);
    }

    isAuthenticated() {
        const result = !!(this.accessToken || this.idToken);
        console.log('🔐 isAuthenticated:', result);
        return result;
    }

    // Método para obter o token (preferindo idToken para APIs)
    getToken() {
        const token = this.idToken || this.accessToken;
        console.log('🎫 getToken called, returning:', token ? 'token present' : 'no token');
        return token;
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
        if (!token) {
            console.log('❌ No token for validation');
            return false;
        }
        
        try {
            // Decodificar JWT para verificar expiração
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);
            const isValid = payload.exp > now;
            console.log('⏰ Token validation:', {
                exp: payload.exp,
                now: now,
                isValid: isValid
            });
            return isValid;
        } catch (error) {
            console.error('❌ Error validating token:', error);
            return false;
        }
    }

    // Método para obter dados do usuário do token
    getUserInfo() {
        console.log('📋 getUserInfo called');
        const token = this.getToken();
        if (!token) {
            console.log('❌ No token available for getUserInfo');
            return null;
        }
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log('🎫 Full token payload:', payload);
            console.log('🔍 Available fields in payload:');
            Object.keys(payload).forEach(key => {
                console.log(`  - ${key}:`, payload[key]);
            });
            
            const userInfo = {
                username: payload['cognito:username'] || payload.email || 'User',
                email: payload.email,
                name: payload.name,
                sub: payload.sub,
                // Log all possible name fields
                given_name: payload.given_name,
                family_name: payload.family_name,
                preferred_username: payload.preferred_username
            };
            
            console.log('👤 Extracted user info:', userInfo);
            
            // Determine what to use for initial - prioritize email over UUID username
            let initialSource = userInfo.name || userInfo.email || userInfo.username || 'U';
            console.log('🔤 Will use this for initial:', initialSource);
            console.log('🔤 First character will be:', initialSource.charAt(0).toUpperCase());
            
            return userInfo;
        } catch (error) {
            console.error('❌ Error extracting user data:', error);
            return null;
        }
    }

    // Validar senha
    validatePassword(password) {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        return regex.test(password);
    }

    // Refresh token automaticamente
    async refreshTokens() {
        if (!this.refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await fetch(`https://${COGNITO_CONFIG.domain}.auth.${COGNITO_CONFIG.region}.amazoncognito.com/oauth2/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    client_id: COGNITO_CONFIG.clientId,
                    refresh_token: this.refreshToken
                })
            });

            if (response.ok) {
                const data = await response.json();
                
                this.accessToken = data.access_token;
                this.idToken = data.id_token;
                
                localStorage.setItem('accessToken', this.accessToken);
                localStorage.setItem('idToken', this.idToken);
                
                return true;
            } else {
                throw new Error('Token refresh failed');
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            this.signOut();
            return false;
        }
    }
}

// Instância global
const auth = new CognitoAuth();