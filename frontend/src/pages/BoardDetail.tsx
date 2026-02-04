import { useEffect, useState, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { type Board, type Task, TaskStatus } from '../types';
import { Card, Button, Input, cn } from '../components/ui';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { Plus, Trash2, ArrowRight, ArrowLeft } from 'lucide-react';

// Status Columns
const COLUMNS = [
    { id: TaskStatus.TODO, label: 'To Do', color: 'bg-slate-700/50' },
    { id: TaskStatus.IN_PROGRESS, label: 'In Progress', color: 'bg-blue-900/20' },
    { id: TaskStatus.DONE, label: 'Done', color: 'bg-green-900/20' }
];

export const BoardDetail = () => {
    const { boardId } = useParams();
    const [board, setBoard] = useState<Board | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Create Task State
    const [isCreating, setIsCreating] = useState<TaskStatus | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');

    const token = localStorage.getItem('token');

    // Fetch Initial Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [boardRes, tasksRes] = await Promise.all([
                    api.get<{ success: boolean, data: Board }>(`/boards/${boardId}`),
                    api.get<{ success: boolean, data: Task[] }>(`/boards/${boardId}/tasks`)
                ]);
                setBoard(boardRes.data.data);
                setTasks(tasksRes.data.data);
            } catch (err) {
                console.error(err);
                setError('Failed to load board');
            } finally {
                setLoading(false);
            }
        };
        if (boardId) fetchData();
    }, [boardId]);

    // SSE Subscription
    useEffect(() => {
        if (!token || !boardId) return;

        const controller = new AbortController();
        const fetchData = async () => {
            await fetchEventSource('/api/rt/events', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                signal: controller.signal,
                onmessage(ev) {
                    if (ev.event === 'connected' || ev.event === 'heartbeat') return;

                    try {
                        const payload = JSON.parse(ev.data);
                        const type = payload.type.toLowerCase();
                        const data = payload.data as Task;

                        // Filter events for THIS board
                        if (data.boardId && data.boardId !== boardId) return;

                        if (type.includes('task:created')) {
                            setTasks(prev => {
                                if (prev.some(t => t.id === data.id)) return prev;
                                return [...prev, data];
                            });
                        } else if (type.includes('task:updated')) {
                            setTasks(prev => prev.map(t => t.id === data.id ? data : t));
                        } else if (type.includes('task:deleted')) {
                            setTasks(prev => prev.filter(t => t.id !== (data.id || (payload.data as any).taskId)));
                        }

                    } catch (e) {
                        console.error('SSE Error', e);
                    }
                },
                onerror(_err) {
                    // Do nothing, standard retry
                }
            });
        };

        fetchData();

        return () => controller.abort();
    }, [boardId, token]);

    const handleCreateTask = async (status: TaskStatus) => {
        if (!newTaskTitle.trim()) return;
        try {
            await api.post(`/boards/${boardId}/tasks`, {
                title: newTaskTitle,
                status
            });
            // Task will update via SSE or fetch
            setNewTaskTitle('');
            setIsCreating(null);

            // Refetch to be safe (SSE delay)
            const { data } = await api.get<{ success: boolean, data: Task[] }>(`/boards/${boardId}/tasks`);
            setTasks(data.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (taskId: string) => {
        if (!confirm('Delete this task?')) return;
        try {
            await api.delete(`/boards/${boardId}/tasks/${taskId}`);
            setTasks(prev => prev.filter(t => t.id !== taskId));
        } catch (err) {
            console.error(err);
        }
    };

    const handleMove = async (task: Task, direction: 'forward' | 'backward') => {
        const currentIndex = COLUMNS.findIndex(c => c.id === task.status);
        if (currentIndex === -1) return;

        const newIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;
        if (newIndex < 0 || newIndex >= COLUMNS.length) return;

        const newStatus = COLUMNS[newIndex].id;

        // Optimistic update
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

        try {
            await api.put(`/boards/${boardId}/tasks/${task.id}`, {
                status: newStatus
            });
        } catch (err) {
            console.error(err);
            // Revert
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t));
        }
    };

    if (loading) return <div className="text-center py-20">Loading Board...</div>;
    if (error || !board) return <div className="text-center py-20 text-red-400">{error || 'Board not found'}</div>;

    return (
        <div className="container py-8 h-[calc(100vh-64px)] flex flex-col">
            <div className="mb-6">
                <Link to="/" className="text-slate-400 hover:text-white mb-2 inline-block text-sm">&larr; Back to Dashboard</Link>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold font-display tracking-tight text-white">{board.name}</h1>
                        {board.description && <p className="text-slate-400 mt-1">{board.description}</p>}
                    </div>
                    <div className="text-xs text-slate-500">
                        Host: {board.owner.name}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto">
                <div className="flex gap-6 h-full min-w-[1000px]">
                    {COLUMNS.map(col => {
                        const colTasks = tasks.filter(t => t.status === col.id);
                        return (
                            <div key={col.id} className={cn("flex-1 flex flex-col rounded-xl glass-panel border-none",
                                col.id === TaskStatus.TODO ? "bg-slate-900/40" :
                                    col.id === TaskStatus.IN_PROGRESS ? "bg-blue-900/10" :
                                        "bg-green-900/10"
                            )}>
                                <div className="p-4 border-b border-white/5 flex justify-between items-center rounded-t-xl backdrop-blur-md">
                                    <h3 className="font-semibold flex items-center gap-2 font-display tracking-tight text-white">
                                        <div className={cn("w-2 h-2 rounded-full ring-2 ring-offset-2 ring-offset-slate-900",
                                            col.id === 'DONE' ? "bg-green-500 ring-green-500/30" :
                                                col.id === 'IN_PROGRESS' ? "bg-blue-500 ring-blue-500/30" :
                                                    "bg-slate-400 ring-slate-400/30")} />
                                        {col.label}
                                        <span className="text-xs font-normal text-slate-400 bg-white/5 px-2 py-0.5 rounded-full ml-2 border border-white/5">{colTasks.length}</span>
                                    </h3>
                                    <Button variant="ghost" size="sm" onClick={() => setIsCreating(col.id)} title="Add Task" className="hover:bg-white/10 text-slate-400 hover:text-white">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>

                                <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                                    {isCreating === col.id && (
                                        <Card className="mb-4 animate-in fade-in slide-in-from-top-2 border-primary/50 bg-slate-800/90 shadow-lg">
                                            <form onSubmit={(e: FormEvent) => { e.preventDefault(); handleCreateTask(col.id); }}>
                                                <Input
                                                    autoFocus
                                                    placeholder="Task title..."
                                                    value={newTaskTitle}
                                                    onChange={e => setNewTaskTitle(e.target.value)}
                                                    className="mb-3 bg-slate-900/50"
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <Button type="button" variant="ghost" size="sm" onClick={() => { setIsCreating(null); setNewTaskTitle(''); }}>Cancel</Button>
                                                    <Button type="submit" size="sm">Add</Button>
                                                </div>
                                            </form>
                                        </Card>
                                    )}

                                    {colTasks.map(task => (
                                        <Card key={task.id} hoverEffect className="group p-3 animate-in fade-in duration-300">
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="font-medium text-sm leading-snug">{task.title}</p>
                                                <Button variant="ghost" className="h-6 w-6 p-0 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(task.id)}>
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                            {task.description && <p className="text-xs text-slate-400 line-clamp-2 mb-3">{task.description}</p>}

                                            <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/5">
                                                <div className="text-[10px] text-slate-500 truncate max-w-[80px] flex items-center gap-1">
                                                    <div className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[8px] text-white font-bold">
                                                        {(task.assignee?.name || 'U').charAt(0)}
                                                    </div>
                                                    {task.assignee ? task.assignee.name : 'Unassigned'}
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {col.id !== TaskStatus.TODO && (
                                                        <button
                                                            onClick={() => handleMove(task, 'backward')}
                                                            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400 transition-colors"
                                                            title="Move Back"
                                                        >
                                                            <ArrowLeft className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                    {col.id !== TaskStatus.DONE && (
                                                        <button
                                                            onClick={() => handleMove(task, 'forward')}
                                                            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400 transition-colors"
                                                            title="Move Forward"
                                                        >
                                                            <ArrowRight className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
