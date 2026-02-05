import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Button, Input, Card } from '../components/ui';
import { Plus, Layout, ArrowRight, Users2, Search } from 'lucide-react';
import { UserMenu } from '../components/UserMenu';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { type Group } from '../types';

interface Board {
    id: string;
    name: string;
    description: string;
    tenantId: string;
    ownerId: string;
    owner?: {
        id: string;
        name: string;
        groupId?: string | null;
        group?: Group | null;
    };
    _count?: {
        tasks: number;
    }
}

export const Dashboard = () => {
    const { user } = useAuth();
    const [boards, setBoards] = useState<Board[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newBoardName, setNewBoardName] = useState('');

    const fetchBoards = async () => {
        try {
            setError(null);
            const res = await api.get('/boards');
            const data = res.data;
            const boardsData = Array.isArray(data) ? data : data.data || [];
            setBoards(boardsData);
        } catch (error) {
            console.error("Failed to fetch boards", error);
            setError("Unable to load your boards. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBoards();
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            const res = await api.get('/groups');
            const data = res.data;
            const groupsData = Array.isArray(data) ? data : data.data || [];
            setGroups(groupsData);
        } catch (error) {
            console.error("Failed to fetch groups", error);
        }
    };

    const filteredBoards = selectedGroup
        ? boards.filter(board => board.owner?.groupId === selectedGroup)
        : boards;

    // SSE Subscription for real-time board updates
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const controller = new AbortController();
        const fetchData = async () => {
            await fetchEventSource('/api/rt/events', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                signal: controller.signal,
                onmessage(ev) {
                    try {
                        const data = JSON.parse(ev.data);
                        console.log('SSE Event received on Dashboard:', data);

                        // Skip heartbeat and connected events
                        if (data.type === 'connected' || data.type === 'heartbeat') return;

                        // Refresh board list on any board event
                        if (data.type === 'board_created' || data.type === 'board_updated' || data.type === 'board_deleted') {
                            console.log('Board event detected, refreshing board list...');
                            fetchBoards();
                        }
                    } catch (e) {
                        console.error("SSE Parse Error on Dashboard", e);
                    }
                },
                onerror(err) {
                    console.error("SSE Error on Dashboard", err);
                }
            });
        };

        fetchData();
        return () => controller.abort();
    }, []);

    const handleCreateBoard = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/boards', { name: newBoardName });
            setNewBoardName('');
            setIsCreating(false);
            fetchBoards();
        } catch (error) {
            console.error("Failed to create board", error);
        }
    };

    return (
        <div className="min-h-screen app-bg flex flex-col">
            {/* Header */}
            <header className="border-b dark:border-white/5 border-slate-200 dark:bg-slate-900/50 bg-white/80 backdrop-blur-md sticky top-0 z-30">
                <div className="w-full px-4 md:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Layout className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-bold text-2xl tracking-tight dark:text-white text-slate-900 font-display">TaskTS</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => window.dispatchEvent(new Event('open-search'))}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
                            title="Search (Cmd+K)"
                        >
                            <Search className="w-5 h-5" />
                        </button>
                        <UserMenu />
                    </div>
                </div>
            </header>

            <main className="w-full px-4 md:px-8 py-12 flex-1">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 animate-in">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold dark:text-white text-slate-900 mb-4 tracking-tight">
                            Welcome back, <span className="text-gradient">{user?.name}</span>
                        </h1>
                        <p className="text-lg dark:text-slate-400 text-slate-600 max-w-2xl font-light">
                            Manage your projects and tasks in a beautiful, collaborative environment.
                        </p>
                    </div>
                    {boards.length > 0 && (
                        <Button onClick={() => setIsCreating(true)} size="lg" className="shadow-xl shadow-indigo-500/20">
                            <Plus className="w-5 h-5 mr-2" />
                            Create New Board
                        </Button>
                    )}
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200">
                        {error}
                    </div>
                )}

                {/* Group Filter Chips */}
                {groups.length > 0 && boards.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-8 animate-in">
                        <Button
                            variant={!selectedGroup ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => setSelectedGroup(null)}
                            className="text-sm"
                        >
                            All Groups ({boards.length})
                        </Button>
                        {groups.map(group => {
                            const count = boards.filter(b => b.owner?.groupId === group.id).length;
                            return (
                                <Button
                                    key={group.id}
                                    variant={selectedGroup === group.id ? 'primary' : 'secondary'}
                                    size="sm"
                                    onClick={() => setSelectedGroup(group.id)}
                                    className="text-sm"
                                >
                                    <Users2 className="w-3 h-3 mr-1" />
                                    {group.name} ({count})
                                </Button>
                            );
                        })}
                    </div>
                )}

                {isCreating && (
                    <Card className="mb-12 border-indigo-500/50 animate-in ring-1 ring-indigo-500/20">
                        <form onSubmit={handleCreateBoard} className="flex flex-col md:flex-row gap-4 md:items-end">
                            <div className="flex-1">
                                <Input
                                    label="Board Name"
                                    value={newBoardName}
                                    onChange={(e) => setNewBoardName(e.target.value)}
                                    autoFocus
                                    placeholder="e.g. Product Roadmap, Marketing Campaign..."
                                    className="h-12 text-lg"
                                />
                            </div>
                            <div className="flex gap-3">
                                <Button type="submit" size="lg">Create Board</Button>
                                <Button type="button" variant="ghost" size="lg" onClick={() => setIsCreating(false)}>Cancel</Button>
                            </div>
                        </form>
                    </Card>
                )}

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-56 rounded-2xl bg-slate-800/50 animate-pulse border border-white/5" />
                        ))}
                    </div>
                ) : filteredBoards.length === 0 && !error ? (
                    <div className="flex flex-col items-center justify-center py-20 animate-in">
                        <div className="relative group cursor-pointer" onClick={() => setIsCreating(true)}>
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative w-24 h-24 bg-slate-900 ring-1 ring-white/10 rounded-full flex items-center justify-center shadow-2xl">
                                <Layout className="w-10 h-10 text-indigo-400 group-hover:scale-110 transition-transform duration-300" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold dark:text-white text-slate-900 mt-8 mb-3">No boards yet</h3>
                        <p className="dark:text-slate-400 text-slate-600 mb-8 max-w-md mx-auto text-center text-lg font-light">
                            Create your first board to start organizing tasks and collaborating with your team.
                        </p>
                        <Button onClick={() => setIsCreating(true)} size="lg" className="h-12 px-8 text-lg">
                            <Plus className="w-5 h-5 mr-2" />
                            Create Your First Board
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredBoards.map((board, index) => (
                            <Link
                                key={board.id}
                                to={`/boards/${board.id}`}
                                className="block group decoration-none outline-none"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <Card hoverEffect className="h-60 flex flex-col justify-between group-focus:ring-2 group-focus:ring-indigo-500/50 animate-in">
                                    <div>
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300 shadow-inner shadow-white/5">
                                                <Layout className="w-6 h-6" />
                                            </div>
                                            <div className="flex flex-col gap-2 items-end">
                                                {board._count && (
                                                    <span className="text-xs font-bold tracking-wider px-3 py-1 rounded-full bg-slate-900/50 text-slate-400 border border-white/10 group-hover:border-indigo-500/30 transition-colors">
                                                        {board._count.tasks} TASKS
                                                    </span>
                                                )}
                                                {board.owner?.group && (
                                                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                                        <Users2 className="w-3 h-3 inline mr-1" />
                                                        {board.owner.group.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <h3 className="text-2xl font-bold dark:text-slate-100 text-slate-800 mb-2 group-hover:text-indigo-400 transition-colors w-full truncate">
                                            {board.name}
                                        </h3>
                                        <p className="dark:text-slate-400 text-slate-600 text-sm line-clamp-2 leading-relaxed font-light">
                                            {board.description || "No description provided for this board."}
                                        </p>
                                    </div>
                                    <div className="text-sm font-medium text-slate-500 flex justify-end items-center gap-2 group-hover:text-indigo-400 transition-colors mt-4">
                                        Open Board <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};
