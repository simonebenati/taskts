import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card, cn } from '../components/ui';
import { ArrowLeft, UserPlus, Check, X, Ban, UserCheck, Copy, Info, Plus, Trash2, Mail, RefreshCw } from 'lucide-react';
import { type User, type Role, type Group, type Invite } from '../types';

export const UserManagement = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();

    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'active' | 'pending'>('all');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [copiedTenantId, setCopiedTenantId] = useState(false);
    const [invites, setInvites] = useState<Invite[]>([]);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('member');
    const [inviteType, setInviteType] = useState<'member' | 'guest'>('member');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersRes, rolesRes, groupsRes, invitesRes] = await Promise.all([
                api.get<{ success: boolean; data: User[] }>('/users/all'),
                api.get<{ success: boolean; data: Role[] }>('/roles'),
                api.get<{ success: boolean; data: Group[] }>('/groups'),
                api.get<{ success: boolean; data: Invite[] }>('/invites')
            ]);
            setUsers(usersRes.data.data.map((u: any) => ({
                ...u,
                groupId: u.group?.id || null,
                roleName: u.role?.name || u.roleName
            })));
            setRoles(rolesRes.data.data);
            setGroups(groupsRes.data.data);
            setInvites(invitesRes.data.data || []);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const approveUser = async (userId: string) => {
        try {
            await api.put(`/users/${userId}/approve`);
            await fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to approve user');
        }
    };

    const blockUser = async (userId: string) => {
        if (!confirm('Are you sure you want to block this user?')) return;
        try {
            await api.put(`/users/${userId}/block`);
            await fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to block user');
        }
    };

    const unblockUser = async (userId: string) => {
        try {
            await api.put(`/users/${userId}/unblock`);
            await fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to unblock user');
        }
    };

    const deleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
        try {
            await api.delete(`/users/${userId}`);
            await fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to delete user');
        }
    };

    const changeUserRole = async (userId: string, roleName: string) => {
        try {
            const response = await api.put<{ success: boolean; data: User }>(`/users/${userId}/role`, { roleName });
            const updatedUser = response.data.data;
            // Update local state with API response to avoid race condition
            setUsers(prevUsers => prevUsers.map(u =>
                u.id === userId ? {
                    ...u,
                    roleName: updatedUser.role?.name || updatedUser.roleName,
                    role: updatedUser.role
                } : u
            ));
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to change role');
        }
    };

    const assignUserToGroup = async (userId: string, groupId: string | null) => {
        try {
            const response = await api.put<{ success: boolean; data: User }>(`/users/${userId}/group`, { groupId });
            const updatedUser = response.data.data;
            // Update local state with API response to avoid race condition
            setUsers(prevUsers => prevUsers.map(u =>
                u.id === userId ? {
                    ...u,
                    groupId: updatedUser.group?.id || null,
                    group: updatedUser.group
                } : u
            ));
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to assign group');
        }
    };

    const createRole = async () => {
        if (!newRoleName.trim()) return;
        try {
            await api.post('/roles', { name: newRoleName.trim() });
            setNewRoleName('');
            setShowCreateRoleModal(false);
            await fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to create role');
        }
    };

    const deleteRole = async (roleId: string, roleName: string) => {
        if (['admin', 'member'].includes(roleName)) {
            alert('Cannot delete built-in roles');
            return;
        }
        if (!confirm(`Delete role "${roleName}"?`)) return;
        try {
            await api.delete(`/roles/${roleId}`);
            await fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to delete role');
        }
    };

    const copyTenantId = () => {
        if (currentUser?.tenantId) {
            navigator.clipboard.writeText(currentUser.tenantId);
            setCopiedTenantId(true);
            setTimeout(() => setCopiedTenantId(false), 2000);
        }
    };

    const sendInvite = async () => {
        if (!inviteEmail.trim()) return;
        try {
            await api.post('/invites', {
                email: inviteEmail,
                role: inviteRole,
                type: inviteType
            });
            setInviteEmail('');
            setInviteRole('member');
            setInviteType('member');
            setShowInviteModal(false);
            await fetchData();
            alert('Invitation sent successfully!');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to send invite');
        }
    };

    const resendInvite = async (inviteId: string) => {
        try {
            await api.post(`/invites/${inviteId}/resend`);
            await fetchData();
            alert('Invite resent successfully!');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to resend invite');
        }
    };

    const revokeInvite = async (inviteId: string) => {
        if (!confirm('Are you sure you want to revoke this invite?')) return;
        try {
            await api.delete(`/invites/${inviteId}`);
            await fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to revoke invite');
        }
    };

    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 8;

    const getRoleLevel = (roleName: string): number => {
        const roles: Record<string, number> = {
            'admin': 3,
            'member': 2,
            'viewer': 1,
            'guest': 1
        };
        return roles[roleName] || 0;
    };

    const currentUserLevel = getRoleLevel(currentUser?.roleName || '');

    const filteredUsers = users.filter(u => {
        if (filter === 'active') return u.isActive === true;
        if (filter === 'pending') return u.isActive === false;
        return true;
    });

    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    const startIndex = (currentPage - 1) * usersPerPage;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    const pendingUsers = users.filter(u => u.isActive === false);

    if (currentUser?.roleName !== 'admin') {
        return (
            <div className="min-h-screen app-bg flex items-center justify-center p-4">
                <Card className="p-8 text-center max-w-md dark:bg-slate-900/50 bg-white backdrop-blur-xl border dark:border-white/10 border-slate-200 shadow-xl">
                    <h2 className="text-xl font-bold dark:text-white text-slate-900 mb-2">Access Denied</h2>
                    <p className="dark:text-slate-400 text-slate-600 mb-6">Only administrators can manage users.</p>
                    <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen app-bg flex flex-col">
            <main className="w-full px-4 md:px-8 py-8 flex-1">
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="dark:text-slate-400 text-slate-500 dark:hover:text-white hover:text-slate-900">
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                Back
                            </Button>
                            <h1 className="text-2xl font-bold dark:text-white text-slate-900">User Management</h1>
                        </div>
                        <Button onClick={() => setShowInviteModal(true)}>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Invite User
                        </Button>
                    </div>

                    {error && (
                        <div className="p-4 rounded-lg bg-red-500/10 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Pending Approvals */}
                    {pendingUsers.length > 0 && (
                        <Card className="p-6 dark:bg-yellow-500/5 bg-yellow-50/50 backdrop-blur-xl border dark:border-yellow-500/20 border-yellow-200">
                            <h2 className="text-lg font-semibold dark:text-yellow-300 text-yellow-700 mb-4">Pending Approvals ({pendingUsers.length})</h2>
                            <div className="space-y-3">
                                {pendingUsers.map(user => (
                                    <div key={user.id} className="flex items-center justify-between p-4 dark:bg-slate-900/50 bg-white rounded-lg border dark:border-white/10 border-yellow-100 shadow-sm">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium dark:text-white text-slate-900">{user.name} {user.surname}</p>
                                                {user.id === currentUser?.id && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold">YOU</span>}
                                            </div>
                                            <p className="text-sm dark:text-slate-400 text-slate-500">{user.email}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={() => approveUser(user.id)}>
                                                <Check className="w-4 h-4 mr-1" />
                                                Approve
                                            </Button>
                                            <Button size="sm" variant="secondary" onClick={() => deleteUser(user.id)}>
                                                <X className="w-4 h-4 mr-1" />
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Filters */}
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant={filter === 'all' ? 'primary' : 'secondary'}
                            onClick={() => setFilter('all')}
                        >
                            All Users ({users.length})
                        </Button>
                        <Button
                            size="sm"
                            variant={filter === 'active' ? 'primary' : 'secondary'}
                            onClick={() => setFilter('active')}
                        >
                            Active ({users.filter(u => u.isActive).length})
                        </Button>
                        <Button
                            size="sm"
                            variant={filter === 'pending' ? 'primary' : 'secondary'}
                            onClick={() => setFilter('pending')}
                        >
                            Pending ({pendingUsers.length})
                        </Button>
                    </div>

                    {/* Users List */}
                    <Card className="p-6 dark:bg-slate-900/50 bg-white backdrop-blur-xl border dark:border-white/10 border-slate-200 shadow-sm">
                        <div className="space-y-4">
                            {loading ? (
                                <p className="text-slate-400 text-center py-8">Loading...</p>
                            ) : paginatedUsers.length === 0 ? (
                                <p className="text-slate-400 text-center py-8">No users found</p>
                            ) : (
                                paginatedUsers.map(user => {
                                    const userLevel = getRoleLevel(user.roleName);
                                    const isProtected = userLevel >= currentUserLevel && user.id !== currentUser?.id;
                                    const isSelf = user.id === currentUser?.id;

                                    return (
                                        <div key={user.id} className="p-4 dark:bg-slate-800/50 bg-slate-50/50 rounded-lg border dark:border-white/10 border-slate-200/60 transition-all hover:dark:bg-slate-800/70 hover:bg-slate-100/50">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <p className="font-medium dark:text-white text-slate-900 truncate">{user.name} {user.surname}</p>
                                                        {isSelf && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold">YOU</span>}
                                                        {user.isActive ? (
                                                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                                                                Active
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                                                                Pending
                                                            </span>
                                                        )}
                                                        {user.group && (
                                                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/20">
                                                                {user.group.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm dark:text-slate-400 text-slate-500 mb-3 truncate">{user.email}</p>
                                                    <div className="flex flex-wrap gap-4 text-sm">
                                                        <div>
                                                            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">Role</label>
                                                            <select
                                                                value={user.roleName}
                                                                onChange={(e) => changeUserRole(user.id, e.target.value)}
                                                                disabled={isProtected || isSelf}
                                                                className="px-2 py-1 dark:bg-slate-700/50 bg-white border dark:border-white/10 border-slate-200 rounded dark:text-white text-slate-900 text-xs outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {roles.map(role => (
                                                                    <option key={role.id} value={role.name}>{role.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">Group</label>
                                                            <select
                                                                value={user.groupId || ''}
                                                                onChange={(e) => assignUserToGroup(user.id, e.target.value || null)}
                                                                disabled={isProtected || isSelf}
                                                                className="px-2 py-1 dark:bg-slate-700/50 bg-white border dark:border-white/10 border-slate-200 rounded dark:text-white text-slate-900 text-xs outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                <option value="">No Group</option>
                                                                {groups.map(group => (
                                                                    <option key={group.id} value={group.id}>{group.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                                                    {user.isActive ? (
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            onClick={() => blockUser(user.id)}
                                                            disabled={isProtected || isSelf}
                                                            className="h-8"
                                                        >
                                                            <Ban className="w-3.5 h-3.5 mr-1" />
                                                            Block
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => unblockUser(user.id)}
                                                            disabled={isProtected || isSelf}
                                                            className="h-8"
                                                        >
                                                            <UserCheck className="w-3.5 h-3.5 mr-1" />
                                                            Activate
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => deleteUser(user.id)}
                                                        disabled={isProtected || isSelf}
                                                        className="h-8 text-red-400 hover:text-red-300"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-4 pt-4 border-t border-white/5">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="text-slate-400"
                                    >
                                        Previous
                                    </Button>
                                    <div className="flex items-center gap-2">
                                        {[...Array(totalPages)].map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setCurrentPage(i + 1)}
                                                className={cn(
                                                    "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                                                    currentPage === i + 1
                                                        ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                                                        : "text-slate-500 hover:text-white hover:bg-white/5"
                                                )}
                                            >
                                                {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="text-slate-400"
                                    >
                                        Next
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Pending Invites Section */}
                    {invites.length > 0 && (
                        <Card className="p-6 dark:bg-slate-900/50 bg-white backdrop-blur-xl border dark:border-white/10 border-slate-200 shadow-sm mb-8">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <Mail className="w-5 h-5 text-indigo-400" />
                                    <h2 className="text-lg font-semibold dark:text-white text-slate-900">Pending Invites</h2>
                                </div>
                                <Button variant="ghost" size="sm" onClick={fetchData} className="dark:text-slate-400 text-slate-500">
                                    <RefreshCw className="w-4 h-4 mr-1" />
                                    Refresh
                                </Button>
                            </div>
                            <div className="space-y-3">
                                {invites.map(invite => (
                                    <div key={invite.id} className="p-4 dark:bg-slate-800/50 bg-slate-50/50 rounded-xl border dark:border-white/5 border-slate-200 flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full dark:bg-slate-700/50 bg-slate-200 flex items-center justify-center dark:text-slate-400 text-slate-500">
                                                <Mail className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium dark:text-white text-slate-900">{invite.email}</p>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${invite.type === 'guest' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'}`}>
                                                        {invite.type.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <p className="text-xs text-slate-500">Role: <span className="dark:text-slate-300 text-slate-700 capitalize">{invite.role}</span></p>
                                                    <p className="text-xs text-slate-500">Expires: <span className="dark:text-slate-300 text-slate-700">{new Date(invite.expiresAt).toLocaleDateString()}</span></p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="sm" variant="secondary" onClick={() => resendInvite(invite.id)} title="Resend Invite">
                                                <RefreshCw className="w-4 h-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => revokeInvite(invite.id)} title="Revoke Invite">
                                                <Trash2 className="w-4 h-4 text-red-400" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Roles Section */}
                    <Card className="p-6 dark:bg-slate-900/50 bg-white backdrop-blur-xl border dark:border-white/10 border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold dark:text-white text-slate-900">Custom Roles</h2>
                            <Button size="sm" onClick={() => setShowCreateRoleModal(true)}>
                                <Plus className="w-4 h-4 mr-1" />
                                Create Role
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {roles.map(role => (
                                <div key={role.id} className="p-3 dark:bg-slate-800/50 bg-slate-50/50 rounded-lg border dark:border-white/10 border-slate-200 shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="font-medium dark:text-white text-slate-900">{role.name}</p>
                                        <p className="text-xs text-slate-400">{users.filter(u => u.roleName === role.name).length} users</p>
                                    </div>
                                    {!['admin', 'member'].includes(role.name) && (
                                        <Button size="sm" variant="ghost" onClick={() => deleteRole(role.id, role.name)}>
                                            <Trash2 className="w-4 h-4 text-red-400" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </main>

            {/* Invite User Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <Card className="max-w-md w-full p-6 bg-slate-900 border border-white/10">
                        <h2 className="text-xl font-bold text-white mb-4">Invite User to Organization</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Email Address</label>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="user@example.com"
                                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Assign Role</label>
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                >
                                    {roles.map(r => (
                                        <option key={r.id} value={r.name}>{r.name.charAt(0).toUpperCase() + r.name.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Invite Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setInviteType('member')}
                                        className={`px-3 py-2 text-sm rounded-lg border transition-all ${inviteType === 'member' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-slate-800 border-white/10 text-slate-400 hover:border-white/20'}`}
                                    >
                                        Team Member
                                    </button>
                                    <button
                                        onClick={() => setInviteType('guest')}
                                        className={`px-3 py-2 text-sm rounded-lg border transition-all ${inviteType === 'guest' ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-slate-800 border-white/10 text-slate-400 hover:border-white/20'}`}
                                    >
                                        Guest (30d)
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2">
                                    {inviteType === 'member' ? 'Team members have permanent access according to their role.' : 'Guests have full access for 30 days, then their access is revoked.'}
                                </p>
                            </div>

                            <div className="pt-2">
                                <Button className="w-full shadow-lg shadow-indigo-500/20" onClick={sendInvite}>
                                    <Mail className="w-4 h-4 mr-2" />
                                    Send Invitation
                                </Button>
                                <Button variant="ghost" className="w-full mt-2 text-slate-400" onClick={() => setShowInviteModal(false)}>
                                    Cancel
                                </Button>
                            </div>

                            <div className="p-3 bg-slate-800/50 rounded-lg border border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <Info className="w-3.5 h-3.5 text-blue-400" />
                                    <p className="text-[10px] font-medium text-slate-300">Legacy Joining Method</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 text-[10px] text-indigo-300 font-mono truncate">{currentUser?.tenantId}</code>
                                    <button onClick={copyTenantId} className="text-slate-500 hover:text-white transition-colors">
                                        {copiedTenantId ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Create Role Modal */}
            {showCreateRoleModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <Card className="max-w-md w-full p-6 bg-slate-900 border border-white/10">
                        <h2 className="text-xl font-bold text-white mb-4">Create Custom Role</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-300 mb-2 block">Role Name</label>
                                <input
                                    type="text"
                                    value={newRoleName}
                                    onChange={(e) => setNewRoleName(e.target.value)}
                                    placeholder="e.g., Manager, Developer"
                                    className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <Button variant="secondary" className="flex-1" onClick={() => {
                                setShowCreateRoleModal(false);
                                setNewRoleName('');
                            }}>
                                Cancel
                            </Button>
                            <Button className="flex-1" onClick={createRole} disabled={!newRoleName.trim()}>
                                Create Role
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};
