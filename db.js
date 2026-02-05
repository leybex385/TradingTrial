/**
 * User Database Utility (XAMPP/MySQL Backend Wrapper)
 * This connects to the PHP API for data persistence.
 */

const DB = {
    // Local Storage Keys for session management
    CURRENT_USER_KEY: 'avendus_current_user',
    API_URL: 'api.php',

    // Register a new user
    async register(mobile, password) {
        try {
            const response = await fetch(`${this.API_URL}?action=register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile, password })
            });
            const result = await response.json();
            if (result.success) {
                await this.login(mobile, password); // Auto login
            }
            return result;
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, message: 'Server connection failed!' };
        }
    },

    // Global Login
    async login(mobile, password) {
        // Mock User for GitHub Pages / Trial Mode
        const demoUser = {
            mobile: '918108038029',
            password: 'password123',
            user: {
                id: 1,
                mobile: '918108038029',
                username: 'Sharad Madhukar Mali',
                kyc: 'Approved',
                creditScore: 100,
                vip: 0,
                balance: 125000.50,
                invested: 46410128.48
            }
        };

        try {
            const response = await fetch(`${this.API_URL}?action=login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile, password })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(result.user));
                }
                return result;
            }
            throw new Error('Server not available');

        } catch (error) {
            console.warn('Backend server not found. Checking Demo Credentials...');

            // Bypass logic for GitHub Pages
            if (mobile === demoUser.mobile && password === demoUser.password) {
                localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(demoUser.user));
                return { success: true, user: demoUser.user, note: 'Logged in via Demo Mode' };
            }

            return { success: false, message: 'Server connection failed! Please use Demo Credentials for preview.' };
        }
    },

    // Reset Password
    async resetPassword(mobile, newPassword) {
        try {
            const response = await fetch(`${this.API_URL}?action=resetPassword`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile, newPassword })
            });
            return await response.json();
        } catch (error) {
            console.error('Reset error:', error);
            return { success: false, message: 'Server connection failed!' };
        }
    },

    // Get current logged-in user (Local session)
    getCurrentUser() {
        const userJson = localStorage.getItem(this.CURRENT_USER_KEY);
        return userJson ? JSON.parse(userJson) : null;
    },

    // Logout
    logout() {
        localStorage.removeItem(this.CURRENT_USER_KEY);
        window.location.href = 'login.html';
    }
};
