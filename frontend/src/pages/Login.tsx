import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '../components/ui';

export const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({ email: '', password: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(formData.email, formData.password);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-center min-h-[80vh]">
            <Card className="w-full max-w-md">
                <h2 className="text-3xl mb-6 text-center font-display font-bold text-gradient">Welcome Back</h2>
                {error && <div className="p-3 mb-4 text-sm text-red-200 bg-red-900/50 rounded">{error}</div>}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <Input
                        label="Email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    <Input
                        label="Password"
                        type="password"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <Button type="submit" isLoading={loading} className="mt-2">
                        Sign In
                    </Button>
                </form>
                <div className="mt-4 text-center text-sm text-slate-400">
                    Don't have an account? <Link to="/register" className="text-blue-400 hover:text-blue-300">Sign Up</Link>
                </div>
            </Card>
        </div>
    );
};
