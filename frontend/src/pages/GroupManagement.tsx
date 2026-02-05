import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, Card, Modal } from '../components/ui';
import { ArrowLeft, Users, Plus, Trash2, Edit, AlertTriangle } from 'lucide-react';
import { type Group, type User } from '../types';

export const GroupManagement = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();

    const [groups, setGroups] = useState<Group[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [groupsRes, usersRes] = await Promise.all([
                api.get<{ success: boolean; data: Group[] }>('/groups'),
                api.get<{ success: boolean; data: User[] }>('/users/all')
            ]);
            setGroups(groupsRes.data.data);
            setUsers(usersRes.data.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load groups');
        } finally {
            setLoading(false);
        }
    };

    const createGroup = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/groups', { name: groupName, description: groupDescription });
            setShowCreateModal(false);
            setGroupName('');
            setGroupDescription('');
            await fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to create group');
        }
    };

    const updateGroup = async (e: FormEvent) => {
        e.preventDefault();
        if (!editingGroup) return;
        try {
            await api.put(`/groups/${editingGroup.id}`, { name: groupName, description: groupDescription });
            setEditingGroup(null);
            setGroupName('');
            setGroupDescription('');
            await fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to update group');
        }
    };

    const deleteGroup = async () => {
        if (!groupToDelete) return;
        try {
            await api.delete(`/groups/${groupToDelete.id}`);
            setGroupToDelete(null);
            await fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to delete group. Make sure no users are assigned to it.');
        }
    };

    const openEditModal = (group: Group) => {
        setEditingGroup(group);
        setGroupName(group.name);
        setGroupDescription(group.description || '');
    };

    const closeModal = () => {
        setShowCreateModal(false);
        setEditingGroup(null);
        setGroupName('');
        setGroupDescription('');
    };

    const getUsersInGroup = (groupId: string) => {
        return users.filter(u => u.groupId === groupId);
    };

    if (currentUser?.roleName !== 'admin') {
        return (
            <div className="min-h-screen app-bg flex items-center justify-center p-4">
                <Card className="p-8 text-center max-w-md bg-slate-900/50 backdrop-blur-xl border border-white/10">
                    <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-slate-400 mb-6">Only administrators can manage groups.</p>
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
                            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-slate-400 hover:text-white">
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                Back
                            </Button>
                            <h1 className="text-2xl font-bold text-white">Group Management</h1>
                        </div>
                        <Button onClick={() => setShowCreateModal(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Group
                        </Button>
                    </div>

                    {error && (
                        <div className="p-4 rounded-lg bg-red-500/10 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <Card className="p-8 bg-slate-900/50 backdrop-blur-xl border border-white/10">
                            <p className="text-slate-400 text-center">Loading groups...</p>
                        </Card>
                    ) : groups.length === 0 ? (
                        <Card className="p-8 bg-slate-900/50 backdrop-blur-xl border border-white/10 text-center">
                            <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-white mb-2">No Groups Yet</h3>
                            <p className="text-slate-400 mb-4">Create groups to organize your team members</p>
                            <Button onClick={() => setShowCreateModal(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create First Group
                            </Button>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {groups.map(group => {
                                const groupUsers = getUsersInGroup(group.id);
                                return (
                                    <Card key={group.id} className="p-6 bg-slate-900/50 backdrop-blur-xl border border-white/10">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold text-white mb-1">{group.name}</h3>
                                                {group.description && (
                                                    <p className="text-sm text-slate-400 mb-2">{group.description}</p>
                                                )}
                                                <p className="text-xs text-slate-500">{group.memberCount || 0} members</p>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button size="sm" variant="ghost" onClick={() => openEditModal(group)}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => setGroupToDelete(group)}>
                                                    <Trash2 className="w-4 h-4 dark:text-red-400 text-red-500" />
                                                </Button>
                                            </div>
                                        </div>
                                        {groupUsers.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-medium text-slate-400">Members:</p>
                                                <div className="space-y-1">
                                                    {groupUsers.slice(0, 3).map(user => (
                                                        <div key={user.id} className="text-sm text-slate-300 flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs text-white font-semibold">
                                                                {user.name[0]}{user.surname[0]}
                                                            </div>
                                                            {user.name} {user.surname}
                                                        </div>
                                                    ))}
                                                    {groupUsers.length > 3 && (
                                                        <p className="text-xs text-slate-500">+{groupUsers.length - 3} more</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* Create/Edit Group Modal */}
            <Modal
                isOpen={showCreateModal || !!editingGroup}
                onClose={closeModal}
                title={editingGroup ? 'Edit Group' : 'Create New Group'}
            >
                <form onSubmit={editingGroup ? updateGroup : createGroup} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium dark:text-slate-300 text-slate-700 mb-2 block">Group Name</label>
                        <Input
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="e.g., Engineering, Marketing"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium dark:text-slate-300 text-slate-700 mb-2 block">Description</label>
                        <textarea
                            value={groupDescription}
                            onChange={(e) => setGroupDescription(e.target.value)}
                            placeholder="Brief description of the group"
                            className="w-full px-3 py-2 dark:bg-slate-800/50 bg-white border dark:border-white/10 border-slate-200 rounded-lg dark:text-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[80px] transition-all"
                            required
                        />
                    </div>
                    <div className="flex gap-2 mt-6">
                        <Button type="button" variant="ghost" className="flex-1" onClick={closeModal}>
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1">
                            {editingGroup ? 'Update Group' : 'Create Group'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Group Modal */}
            <Modal
                isOpen={!!groupToDelete}
                onClose={() => setGroupToDelete(null)}
                title="Delete Group"
                className="max-w-md border-red-500/20"
            >
                <div className="text-center p-2">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <h3 className="text-lg font-medium dark:text-white text-slate-900 mb-2">Delete Group?</h3>
                    <p className="dark:text-slate-400 text-slate-600 mb-6">
                        Are you sure you want to delete <span className="dark:text-white text-slate-900 font-bold">"{groupToDelete?.name}"</span>?
                        This action cannot be undone and will only work if no users are currently assigned to this group.
                    </p>
                    <div className="flex justify-center gap-3">
                        <input type="hidden" /> {/* Focus trap helper */}
                        <Button type="button" variant="ghost" onClick={() => setGroupToDelete(null)}>Cancel</Button>
                        <Button type="button" variant="danger" onClick={deleteGroup}>Yes, Delete Group</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
