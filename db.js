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
        try {
            const response = await fetch(`${this.API_URL}?action=login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile, password })
            });
            const result = await response.json();

            if (result.success) {
                localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(result.user));
            }
            return result;
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Server connection failed!' };
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
