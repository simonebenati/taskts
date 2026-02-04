import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Button, Input, Card } from '../components/ui';
import { Plus, Layout, LogOut, User as UserIcon } from 'lucide-react';

interface Board {
    id: string;
    name: string;
    description: string;
    tenantId: string;
    ownerId: string;
    _count?: {
        tasks: number;
    }
}

export const Dashboard = () => {
    const { user, logout } = useAuth();
    const [boards, setBoards] = useState<Board[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newBoardName, setNewBoardName] = useState('');

    const fetchBoards = async () => {
        try {
            const { data } = await api.get('/boards');
            // Check if response is array or wrapped
            setBoards(Array.isArray(data) ? data : data.data || []);
        } catch (error) {
            console.error("Failed to fetch boards", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBoards();
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
        <div className="min-h-screen app-bg">
            {/* Header */}
            <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="container h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Layout className="w-6 h-6 text-blue-500" />
                        <span className="font-bold text-2xl tracking-tight text-gradient font-display">TaskTS</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-800 py-1 px-3 rounded-full">
                            <UserIcon className="w-4 h-4" />
                            <span>{user?.name} {user?.surname}</span>
                            <span className="text-slate-600">|</span>
                            <span className="text-xs uppercase tracking-wider font-semibold text-blue-400">{user?.roleName}</span>
                        </div>
                        <Button variant="ghost" onClick={logout} title="Logout">
                            <LogOut className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container py-8">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold">Your Boards</h1>
                    <Button onClick={() => setIsCreating(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Board
                    </Button>
                </div>

                {isCreating && (
                    <Card className="mb-8 border-blue-500/50">
                        <form onSubmit={handleCreateBoard} className="flex gap-4 items-end">
                            <div className="flex-1">
                                <Input
                                    label="Board Name"
                                    value={newBoardName}
                                    onChange={(e) => setNewBoardName(e.target.value)}
                                    autoFocus
                                    placeholder="e.g. Product Roadmap"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button type="submit">Create</Button>
                                <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                            </div>
                        </form>
                    </Card>
                )}

                {loading ? (
                    <div className="text-center py-20 text-slate-500">Loading boards...</div>
                ) : boards.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-slate-700 rounded-lg">
                        <Layout className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl font-medium mb-2">No boards yet</h3>
                        <p className="text-slate-500 mb-6">Create your first board to get started</p>
                        <Button onClick={() => setIsCreating(true)}>Create Board</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {boards.map((board) => (
                            <Link key={board.id} to={`/boards/${board.id}`} className="block group decoration-none">
                                <Card hoverEffect className="h-40 flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-400 transition-colors">{board.name}</h3>
                                        <p className="text-slate-400 text-sm line-clamp-2">{board.description || "No description"}</p>
                                    </div>
                                    <div className="text-xs text-slate-500 flex justify-end">
                                        View Board &rarr;
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
