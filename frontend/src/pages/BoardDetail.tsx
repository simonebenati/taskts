import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { type Board, type Task, TaskStatus, type User } from '../types';
import { Button, Input, Modal, cn } from '../components/ui';
import { TaskCard } from '../components/TaskCard';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { Plus, ArrowLeft, Edit2, Trash2, AlertTriangle, X, Search } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { UserMenu } from '../components/UserMenu';

export const BoardDetail = () => {
    const { boardId } = useParams<{ boardId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [board, setBoard] = useState<Board | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Task Creation State
    const [addingToColumn, setAddingToColumn] = useState<string | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');

    // Task Detail Modal State
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

    // Board Management State
    const [isEditingBoard, setIsEditingBoard] = useState(false);
    const [isDeletingBoard, setIsDeletingBoard] = useState(false);
    const [editBoardName, setEditBoardName] = useState('');
    const [editBoardDescription, setEditBoardDescription] = useState('');

    const token = localStorage.getItem('token');

    // Fetch Board & Tasks
    const fetchBoardData = async () => {
        try {
            console.log('Fetching board data for', boardId);
            const [boardRes, tasksRes] = await Promise.all([
                api.get<{ success: boolean; data: Board }>(`/boards/${boardId}`),
                api.get<{ success: boolean; data: Task[] }>(`/boards/${boardId}/tasks`)
            ]);
            console.log('Got board:', boardRes.data);
            console.log('Got tasks:', tasksRes.data);
            setBoard(boardRes.data.data);
            setTasks(tasksRes.data.data);
        } catch (err) {
            console.error(err);
            setError('Failed to load board');
        } finally {
            setLoading(false);
        }
    };

    // Fetch Users (for assignment)
    const fetchUsers = async () => {
        try {
            const res = await api.get<{ success: boolean; data: User[] }>('/users');
            setUsers(res.data.data);
        } catch (err) {
            console.error("Failed to fetch users", err);
        }
    };

    // Initial Load
    useEffect(() => {
        if (boardId) {
            fetchBoardData();
            fetchUsers();
        }
    }, [boardId]);

    // Initial Edit State
    useEffect(() => {
        if (board) {
            setEditBoardName(board.name);
            setEditBoardDescription(board.description || '');
        }
    }, [board]);

    // SSE Subscription
    useEffect(() => {
        if (!token || !boardId) return;

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
                        console.log('SSE Event received:', data);

                        // Skip heartbeat and connected events
                        if (data.type === 'connected' || data.type === 'heartbeat') return;

                        // Handle task events
                        if (data.type === 'task_created' || data.type === 'task_updated' || data.type === 'task_deleted') {
                            // data.data contains the actual task/board data
                            if (data.data?.boardId === boardId || data.data?.id === boardId) {
                                console.log('Task event for this board, refreshing...');
                                fetchBoardData();
                            }
                        }

                        // Handle board events
                        if (data.type === 'board_updated' && data.data?.id === boardId) {
                            console.log('Board updated, refreshing...');
                            fetchBoardData();
                        }
                        if (data.type === 'board_deleted' && data.data?.id === boardId) {
                            console.log('Board deleted, redirecting...');
                            navigate('/');
                        }
                    } catch (e) {
                        console.error("SSE Parse Error", e);
                    }
                },
                onerror(err) {
                    console.error("SSE Error", err);
                }
            });
        };

        fetchData();
        return () => controller.abort();
    }, [boardId, token, navigate]);

    const handleCreateTask = async (e: FormEvent) => {
        e.preventDefault();
        console.log('Creating task:', newTaskTitle, 'in', addingToColumn);
        if (!newTaskTitle.trim() || !addingToColumn) return;

        try {
            const res = await api.post(`/boards/${boardId}/tasks`, {
                title: newTaskTitle,
                status: addingToColumn,
                currentBoardId: boardId
            });
            console.log('Create task response:', res.data);
            setNewTaskTitle('');
            setAddingToColumn(null);
            fetchBoardData(); // Refresh
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            await api.delete(`/boards/${boardId}/tasks/${taskId}`);
            setTasks(prev => prev.filter(t => t.id !== taskId));
        } catch (err) {
            console.error(err);
        }
    };

    const handleMoveTask = async (task: Task, direction: 'forward' | 'backward') => {
        const statuses = Object.values(TaskStatus);
        const currentIndex = statuses.indexOf(task.status);
        const newIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;

        if (newIndex >= 0 && newIndex < statuses.length) {
            const newStatus = statuses[newIndex];
            const oldStatus = task.status;

            // Optimistic update
            const updatedTask = { ...task, status: newStatus };
            setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));

            try {
                await api.put(`/boards/${boardId}/tasks/${task.id}`, { status: newStatus });
            } catch (err) {
                console.error(err);
                // Revert
                setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: oldStatus } : t));
            }
        }
    };

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const newStatus = destination.droppableId as TaskStatus;
        const task = tasks.find(t => t.id === draggableId);
        if (!task) return;

        const oldStatus = task.status;

        // Optimistic Update
        setTasks(prev => prev.map(t =>
            t.id === draggableId ? { ...t, status: newStatus } : t
        ));

        try {
            await api.put(`/boards/${boardId}/tasks/${draggableId}`, { status: newStatus });
        } catch (err) {
            console.error("Failed to move task", err);
            // Revert
            setTasks(prev => prev.map(t => t.id === draggableId ? { ...t, status: oldStatus } : t));
        }
    };

    const handleTaskClick = (task: Task) => {
        setSelectedTask(task);
        setIsTaskModalOpen(true);
    };

    const handleModalClose = () => {
        setIsTaskModalOpen(false);
        setSelectedTask(null);
    };

    const handleTaskUpdate = (updatedTask: Task) => {
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
        if (selectedTask?.id === updatedTask.id) {
            setSelectedTask(updatedTask);
        }
    };

    const handleUpdateBoard = async (e: FormEvent) => {
        e.preventDefault();
        try {
            const { data } = await api.put(`/boards/${boardId}`, {
                name: editBoardName,
                description: editBoardDescription
            });
            setBoard(prev => prev ? { ...prev, name: data.data.name, description: data.data.description } : null);
            setIsEditingBoard(false);
        } catch (err) {
            console.error('Failed to update board', err);
        }
    };

    const handleDeleteBoard = async () => {
        try {
            await api.delete(`/boards/${boardId}`);
            navigate('/');
        } catch (err) {
            console.error('Failed to delete board', err);
        }
    };

    const canManageBoard = user?.roleName === 'admin' || user?.id === board?.ownerId;

    if (loading) return <div className="text-center py-20 text-slate-500">Loading board...</div>;
    if (error || !board) return <div className="text-center py-20 text-red-400">{error || 'Board not found'}</div>;

    const columnsDisplay = [
        { id: TaskStatus.TODO, label: 'To Do', color: 'border-l-4 border-l-blue-500' },
        { id: TaskStatus.IN_PROGRESS, label: 'In Progress', color: 'border-l-4 border-l-yellow-500' },
        { id: TaskStatus.DONE, label: 'Done', color: 'border-l-4 border-l-green-500' },
    ];

    return (
        <div className="min-h-screen app-bg flex flex-col">
            {/* Header */}
            <header className="border-b dark:border-white/5 border-slate-200 dark:bg-slate-900/50 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <div className="w-full h-20 flex items-center justify-between px-6">
                    <div>
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="-ml-2 dark:text-slate-400 text-slate-500 hover:text-slate-900 dark:hover:text-white">
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                Back
                            </Button>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight dark:text-white text-slate-900 mt-1 flex items-center gap-3">
                            {board.name}
                            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/5">
                                {board.ownerId === user?.id ? 'Owner' : 'Member'}
                            </span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        {canManageBoard && (
                            <>
                                <Button variant="ghost" size="sm" onClick={() => setIsEditingBoard(true)}>
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Settings
                                </Button>
                                <Button variant="danger" size="sm" onClick={() => setIsDeletingBoard(true)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </>
                        )}
                        <div className="ml-4 pl-4 border-l border-white/10 flex items-center gap-4">
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
                </div>
            </header>

            {/* Board Management Modals */}
            <Modal
                isOpen={isEditingBoard}
                onClose={() => setIsEditingBoard(false)}
                title="Edit Board Settings"
            >
                <form onSubmit={handleUpdateBoard} className="space-y-4">
                    <Input
                        label="Board Name"
                        value={editBoardName}
                        onChange={(e) => setEditBoardName(e.target.value)}
                        required
                    />
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-300">Description</label>
                        <textarea
                            className="input min-h-[100px] resize-none"
                            value={editBoardDescription}
                            onChange={(e) => setEditBoardDescription(e.target.value)}
                            placeholder="What's this board about?"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={() => setIsEditingBoard(false)}>Cancel</Button>
                        <Button type="submit">Save Changes</Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={isDeletingBoard}
                onClose={() => setIsDeletingBoard(false)}
                title="Delete Board"
                className="max-w-md border-red-500/20"
            >
                <div className="text-center p-2">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">Are you sure?</h3>
                    <p className="text-slate-400 mb-6">
                        This action cannot be undone. This will permanently delete the board <span className="text-white font-medium">"{board.name}"</span> and all {tasks.length} tasks inside it.
                    </p>
                    <div className="flex justify-center gap-3">
                        <Button type="button" variant="ghost" onClick={() => setIsDeletingBoard(false)}>Cancel</Button>
                        <Button type="button" variant="danger" onClick={handleDeleteBoard}>Yes, Delete Board</Button>
                    </div>
                </div>
            </Modal>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 overflow-x-auto">
                    <div className="flex gap-6 h-full min-w-[1024px] px-6 pb-4">
                        {columnsDisplay.map((col, colIndex) => (
                            <div key={col.id} className={cn("glass-panel flex-1 flex flex-col rounded-xl min-w-[300px]", "bg-slate-900/40 backdrop-blur-xl border border-white/10")}>
                                <div className={cn("p-4 border-b border-white/5 flex justify-between items-center bg-slate-800/30", col.color)}>
                                    <h2 className="font-semibold dark:text-slate-200 text-slate-800 tracking-wide">{col.label}</h2>
                                    <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                        {tasks.filter(t => t.status === col.id).length}
                                    </span>
                                </div>

                                <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
                                    <Droppable droppableId={col.id}>
                                        {(provided, snapshot) => (
                                            <div
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                                className={cn("space-y-3 min-h-[100px] transition-colors rounded-lg", snapshot.isDraggingOver ? "bg-slate-800/30" : "")}
                                            >
                                                {tasks
                                                    .filter(t => t.status === col.id)
                                                    .map((task, index) => (
                                                        <Draggable key={task.id} draggableId={task.id} index={index}>
                                                            {(provided) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    style={{ ...provided.draggableProps.style }}
                                                                >
                                                                    <TaskCard
                                                                        task={task}
                                                                        onDelete={handleDeleteTask}
                                                                        onMove={handleMoveTask}
                                                                        onClick={handleTaskClick}
                                                                        isFirstColumn={colIndex === 0}
                                                                        isLastColumn={colIndex === columnsDisplay.length - 1}
                                                                    />
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>

                                    {addingToColumn === col.id ? (
                                        <form onSubmit={handleCreateTask} className="mt-3 animate-in fade-in zoom-in-95 duration-200">
                                            <Input
                                                autoFocus
                                                value={newTaskTitle}
                                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                                placeholder="Task title..."
                                                className="mb-2 bg-slate-800 border-slate-600 focus:border-blue-500"
                                            />
                                            <div className="flex gap-2">
                                                <Button type="submit" size="sm" className="flex-1">Add</Button>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setAddingToColumn(null)}>
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </form>
                                    ) : (
                                        <button
                                            onClick={() => setAddingToColumn(col.id)}
                                            className="w-full mt-3 py-2 flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-blue-400 hover:bg-slate-800/50 rounded-lg border border-dashed border-slate-700 hover:border-blue-500/50 transition-all group"
                                        >
                                            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                            Add Task
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </DragDropContext>

            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    isOpen={isTaskModalOpen}
                    onClose={handleModalClose}
                    onUpdate={handleTaskUpdate}
                    tenantUsers={users}
                />
            )}
        </div>
    );
};
