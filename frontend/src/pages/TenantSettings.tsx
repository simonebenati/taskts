import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, Card } from '../components/ui';
import { ArrowLeft, Building, Lock, Copy, Check, CreditCard, Info } from 'lucide-react';
import { type Tenant } from '../types';

export const TenantSettings = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [name, setName] = useState('');
    const [subscription, setSubscription] = useState('free');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [copiedTenantId, setCopiedTenantId] = useState(false);

    useEffect(() => {
        const fetchTenant = async () => {
            try {
                const res = await api.get<{ success: boolean; data: Tenant }>('/tenants/me');
                const tenantData = res.data.data;
                setTenant(tenantData);
                setName(tenantData.name);
                setSubscription(tenantData.subscription || 'free');
                setPaymentMethod(tenantData.paymentMethod || '');
            } catch (err) {
                console.error(err);
                setError('Failed to load tenant settings');
            }
        };

        if (user?.roleName === 'admin') {
            fetchTenant();
        }
    }, [user]);

    const handleUpdateTenant = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            await api.put('/tenants/me', { name, subscription, paymentMethod });
            setSuccess('Organization settings updated successfully');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to update settings');
        } finally {
            setLoading(false);
        }
    };

    const copyTenantId = () => {
        if (tenant?.id) {
            navigator.clipboard.writeText(tenant.id);
            setCopiedTenantId(true);
            setTimeout(() => setCopiedTenantId(false), 2000);
        }
    };

    if (user?.roleName !== 'admin') {
        return (
            <div className="min-h-screen app-bg flex items-center justify-center p-4">
                <Card className="p-8 text-center max-w-md bg-slate-900/50 backdrop-blur-xl border border-white/10">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-6 h-6 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-slate-400 mb-6">You need administrator privileges to view this page.</p>
                    <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen app-bg flex items-center justify-center p-4">
            <div className="w-full max-w-2xl space-y-8">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-slate-400 hover:text-white">
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to Dashboard
                    </Button>
                </div>

                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-white font-display">Organization Settings</h1>
                    <p className="mt-2 text-sm text-slate-400">Manage your organization's profile and settings</p>
                </div>

                {/* Tenant ID Section */}
                <Card className="p-6 bg-blue-500/5 backdrop-blur-xl border border-blue-500/20">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <Info className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-blue-300 mb-1">Tenant ID for Invitations</h3>
                            <p className="text-xs text-slate-400 mb-3">
                                Share this ID with users who want to join your organization. They'll need it during registration.
                            </p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-sm text-blue-300 font-mono">
                                    {tenant?.id || 'Loading...'}
                                </code>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={copyTenantId}
                                    className="flex-shrink-0"
                                >
                                    {copiedTenantId ? (
                                        <>
                                            <Check className="w-4 h-4 mr-1" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4 mr-1" />
                                            Copy
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="p-8 bg-slate-900/50 backdrop-blur-xl border border-white/10">
                    <form onSubmit={handleUpdateTenant} className="space-y-6">
                        {success && (
                            <div className="p-3 rounded-lg text-sm bg-green-500/10 text-green-400">
                                {success}
                            </div>
                        )}
                        {error && (
                            <div className="p-3 rounded-lg text-sm bg-red-500/10 text-red-400">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Organization Name</label>
                            <div className="relative">
                                <Building className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="pl-9"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Subscription Tier</label>
                            <select
                                value={subscription}
                                onChange={(e) => setSubscription(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            >
                                <option value="free">Free</option>
                                <option value="pro">Pro</option>
                                <option value="enterprise">Enterprise</option>
                            </select>
                            <p className="text-xs text-slate-500">Mockup only - no real billing integration</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Payment Method</label>
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                <Input
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="pl-9"
                                    placeholder="e.g., Visa ending in 1234"
                                />
                            </div>
                            <p className="text-xs text-slate-500">Mockup only - no real payment processing</p>
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
