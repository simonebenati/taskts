import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Card, cn } from '../components/ui';

export const Register = () => {
    const { register, createTenant } = useAuth();
    const navigate = useNavigate();
    const [mode, setMode] = useState<'join' | 'create'>('join');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Join State
    const [joinData, setJoinData] = useState({
        email: '', name: '', surname: '', password: '', tenantId: ''
    });

    // Create State
    const [createData, setCreateData] = useState({
        tenantName: '', adminEmail: '', adminName: '', adminSurname: '', adminPassword: ''
    });

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register(joinData);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to join');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await createTenant(createData);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create organization');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-center min-h-[80vh] py-10">
            <Card className="w-full max-w-lg">
                <div className="flex mb-6 border-b border-border">
                    <button
                        className={cn("flex-1 pb-3 text-sm font-medium transition-colors font-display tracking-wide", mode === 'join' ? "text-accent-primary border-b-2 border-accent-primary" : "text-muted hover:text-text-primary")}
                        onClick={() => { setMode('join'); setError(''); }}
                    >
                        Join Team
                    </button>
                    <button
                        className={cn("flex-1 pb-3 text-sm font-medium transition-colors font-display tracking-wide", mode === 'create' ? "text-accent-primary border-b-2 border-accent-primary" : "text-muted hover:text-text-primary")}
                        onClick={() => { setMode('create'); setError(''); }}
                    >
                        Create Organization
                    </button>
                </div>

                <h2 className="text-2xl mb-6 text-center font-display font-bold text-gradient">
                    {mode === 'join' ? 'Join an existing team' : 'Setup your workspace'}
                </h2>

                {error && <div className="p-3 mb-4 text-sm text-red-200 bg-red-900/50 rounded">{error}</div>}

                {mode === 'join' ? (
                    <form onSubmit={handleJoin} className="flex flex-col gap-4">
                        <Input label="Organization ID (Tenant ID)" required value={joinData.tenantId} onChange={(e) => setJoinData({ ...joinData, tenantId: e.target.value })} placeholder="Ask your admin for this UUID" />
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Name" required value={joinData.name} onChange={(e) => setJoinData({ ...joinData, name: e.target.value })} />
                            <Input label="Surname" required value={joinData.surname} onChange={(e) => setJoinData({ ...joinData, surname: e.target.value })} />
                        </div>
                        <Input label="Email" type="email" required value={joinData.email} onChange={(e) => setJoinData({ ...joinData, email: e.target.value })} />
                        <Input label="Password" type="password" required value={joinData.password} onChange={(e) => setJoinData({ ...joinData, password: e.target.value })} />

                        <Button type="submit" isLoading={loading} className="mt-2">Join Team</Button>
                    </form>
                ) : (
                    <form onSubmit={handleCreate} className="flex flex-col gap-4">
                        <Input label="Organization Name" required value={createData.tenantName} onChange={(e) => setCreateData({ ...createData, tenantName: e.target.value })} />
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Admin Name" required value={createData.adminName} onChange={(e) => setCreateData({ ...createData, adminName: e.target.value })} />
                            <Input label="Admin Surname" required value={createData.adminSurname} onChange={(e) => setCreateData({ ...createData, adminSurname: e.target.value })} />
                        </div>
                        <Input label="Admin Email" type="email" required value={createData.adminEmail} onChange={(e) => setCreateData({ ...createData, adminEmail: e.target.value })} />
                        <Input label="Admin Password" type="password" required value={createData.adminPassword} onChange={(e) => setCreateData({ ...createData, adminPassword: e.target.value })} />

                        <Button type="submit" isLoading={loading} className="mt-2">Create & Login</Button>
                    </form>
                )}

                <div className="mt-4 text-center text-sm text-slate-400">
                    Already have an account? <Link to="/login" className="text-blue-400 hover:text-blue-300">Sign In</Link>
                </div>
            </Card>
        </div>
    );
};
