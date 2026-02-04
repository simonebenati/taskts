import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken } from '../api/client';

interface User {
    id: string;
    email: string;
    name: string;
    surname: string;
    tenantId: string;
    roleName: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => Promise<void>;
    createTenant: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Initialize auth state
    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (token && storedUser) {
                setAuthToken(token);
                setUser(JSON.parse(storedUser));
                try {
                    // Optionally verify token with /auth/me or similar, 
                    // but /users/me is good.
                    // However to keep it simple and fast, we rely on stored user 
                    // and let the 401 interceptor handle invalid tokens.
                } catch (error) {
                    console.error("Auth Init Error", error);
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (email: string, password: string) => {
        const { data } = await api.post('/auth/login', { email, password });
        setAuthToken(data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
    };

    const register = async (formData: any) => {
        const { data } = await api.post('/auth/register', formData);
        // Auto login after register
        setAuthToken(data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
    };

    const createTenant = async (formData: any) => {
        const { data } = await api.post('/tenants', formData);
        setAuthToken(data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
    };

    const logout = async () => {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
                await api.post('/auth/logout', { refreshToken });
            }
        } catch (e) {
            console.error("Logout failed", e);
        } finally {
            setAuthToken(null);
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            setUser(null);
            window.location.href = '/login';
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, createTenant }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
