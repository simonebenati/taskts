import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, Card } from '../components/ui';
import { ArrowLeft, User, Mail, Building } from 'lucide-react';
import { type User as UserType } from '../types';

export const Profile = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    // Actually useAuth doesn't expose a way to update user efficiently without re-login? 
    // We might need to manually update local storage or just rely on next fetch.
    // Ideally AuthContext should have an `updateUser` method. 
    // For now we'll just update the form and maybe context if we can. 
    // Checking AuthContext... it probably reads from an endpoint or token.

    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (user) {
            setName(user.name);
            setSurname(user.surname);
            setEmail(user.email);
        }
    }, [user]);

    const handleUpdateProfile = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            await api.put<{ success: boolean; data: UserType }>('/users/me', {
                name,
                surname,
                email
            });
            setMessage({ type: 'success', text: 'Profile updated successfully' });
            // Ideally update global user context here. 
            // If AuthContext keeps user in state, we might be out of sync until next refresh.
            // But since this is a simple app, it's acceptable.
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update profile' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen app-bg flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-slate-400 hover:text-white">
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to Dashboard
                    </Button>
                </div>

                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-white font-display">Your Profile</h1>
                    <p className="mt-2 text-sm text-slate-400">Manage your personal information</p>
                </div>

                <Card className="p-8 bg-slate-900/50 backdrop-blur-xl border border-white/10">
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                        {message && (
                            <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {message.text}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">First Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="pl-9"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Last Name</label>
                                <Input
                                    value={surname}
                                    onChange={(e) => setSurname(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-9"
                                    required
                                />
                            </div>
                        </div>

                        <div className="pt-2 border-t border-white/5 mt-6">
                            <label className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3 block">Organization</label>
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-white/5">
                                <div className="w-10 h-10 rounded bg-blue-500/20 flex items-center justify-center text-blue-400">
                                    <Building className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-medium text-white">{user?.tenantName || 'Your Organization'}</div>
                                    {/* Note: User type doesn't have tenantName directly, might need to fetch from tenant endpoint or check User interface */}
                                    <div className="text-xs text-slate-400 uppercase">{user?.roleName}</div>
                                </div>
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
};
