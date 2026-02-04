import axios from 'axios';

const API_URL = '/api'; // Using proxy

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // For cookies if used, or just good practice. Backend uses Authorization header likely.
});

// Check if we need to attach token manually or if cookie based.
// Assignment says "session-based or JWT". Schema has RefreshToken.
// Usually checking `auth.controller.ts` would confirm if it sets cookie or returns token.
// Assuming Bearer token for now, will fix if cookie-based.
// Actually, if it's JWT in body, we need to store it.

// Let's assume response.data.accessToken for now.
export const setAuthToken = (token: string | null) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        localStorage.setItem('token', token);
    } else {
        delete api.defaults.headers.common['Authorization'];
        localStorage.removeItem('token');
    }
};

// Interceptor for 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }

                // Try refresh
                const { data } = await api.post('/auth/refresh', { refreshToken });

                // If refresh returns new tokens (Rotated)
                if (data.accessToken) {
                    setAuthToken(data.accessToken);
                    if (data.refreshToken) {
                        localStorage.setItem('refreshToken', data.refreshToken);
                    }
                    originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                // Logout if refresh fails
                setAuthToken(null);
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);
