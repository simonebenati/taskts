import { useState, useEffect, type FormEvent } from 'react';
import { type Task, type User, TaskStatus } from '../types';
import { Modal, Button, Input, cn } from './ui';
import { UserAvatar } from './UserAvatar';
import { api } from '../api/client';
import { CheckSquare, Square, Plus, Trash2, User as UserIcon } from 'lucide-react';

interface TaskDetailModalProps {
    task: Task | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (task: Task) => void;
    tenantUsers: User[];
}

export const TaskDetailModal = ({ task, isOpen, onClose, onUpdate, tenantUsers }: TaskDetailModalProps) => {
    const [localTask, setLocalTask] = useState<Task | null>(task);
    const [newSubtask, setNewSubtask] = useState('');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        setLocalTask(task);
        if (task) {
            setTitle(task.title);
            setDescription(task.description || '');
        }
    }, [task]);

    if (!localTask) return null;

    const handleSaveTitleDesc = async () => {
        if (!localTask || !title.trim()) return;
        try {
            const res = await api.put<{ success: boolean, data: Task }>(`/boards/${localTask.boardId}/tasks/${localTask.id}`, {
                title,
                description
            });
            setLocalTask(res.data.data);
            onUpdate(res.data.data);
            setIsEditingTitle(false);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddSubtask = async (e: FormEvent) => {
        e.preventDefault();
        if (!newSubtask.trim()) return;
        try {
            const res = await api.post<{ success: boolean, data: Task }>(`/boards/${localTask.boardId}/tasks`, {
                title: newSubtask,
                status: TaskStatus.TODO,
                parentTaskId: localTask.id
            });
            const createdSubtask = res.data.data;

            // Manually update local state for immediate feedback
            const updatedTask = {
                ...localTask,
                subTasks: [...(localTask.subTasks || []), createdSubtask],
                _count: {
                    ...localTask._count,
                    subTasks: (localTask._count?.subTasks || 0) + 1
                }
            } as Task;

            setLocalTask(updatedTask);
            onUpdate(updatedTask);
            setNewSubtask('');
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggleSubtask = async (subtask: Task) => {
        const newStatus = subtask.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
        try {
            // Optimistic update
            const updatedSubtasks = localTask.subTasks?.map(st =>
                st.id === subtask.id ? { ...st, status: newStatus } : st
            );
            setLocalTask({ ...localTask, subTasks: updatedSubtasks } as Task);

            await api.put(`/boards/${localTask.boardId}/tasks/${subtask.id}`, {
                status: newStatus
            });
            // Ideally we'd sync with the server response, but optimistic is fine for checkboxes
            onUpdate({ ...localTask, subTasks: updatedSubtasks } as Task);
        } catch (err) {
            console.error(err);
            // Revert on error
            setLocalTask(localTask); // naive revert
        }
    };

    const handleDeleteSubtask = async (subtaskId: string) => {
        try {
            await api.delete(`/boards/${localTask.boardId}/tasks/${subtaskId}`);
            const updatedSubtasks = localTask.subTasks?.filter(st => st.id !== subtaskId);
            const updatedTask = {
                ...localTask,
                subTasks: updatedSubtasks,
                _count: {
                    ...localTask._count,
                    subTasks: Math.max(0, (localTask._count?.subTasks || 1) - 1)
                }
            } as Task;

            setLocalTask(updatedTask);
            onUpdate(updatedTask);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAssign = async (userId: string) => {
        try {
            const res = await api.put<{ success: boolean, data: Task }>(`/boards/${localTask.boardId}/tasks/${localTask.id}`, {
                assigneeId: userId
            });
            setLocalTask(res.data.data);
            onUpdate(res.data.data);
        } catch (err) {
            console.error(err);
        }
    };

    const sortedSubtasks = localTask.subTasks?.sort((a, b) => {
        if (a.status === b.status) return 0;
        return a.status === TaskStatus.DONE ? 1 : -1;
    });

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="bg-slate-900 border-slate-700">
            {/* Header / Title Editing */}
            <div className="mb-6">
                {isEditingTitle ? (
                    <div className="space-y-3">
                        <Input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="text-xl font-bold bg-slate-800"
                            autoFocus
                        />
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Add a more detailed description..."
                            className="w-full bg-slate-800 border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-blue-500 min-h-[100px]"
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setIsEditingTitle(false)}>Cancel</Button>
                            <Button size="sm" onClick={handleSaveTitleDesc}>Save</Button>
                        </div>
                    </div>
                ) : (
                    <div onClick={() => setIsEditingTitle(true)} className="group cursor-pointer">
                        <h2 className="text-2xl font-bold mb-1 group-hover:text-blue-400 transition-colors flex items-center gap-2">
                            {localTask.title}
                        </h2>
                        <p className="text-slate-400 text-sm min-h-[1.5em] group-hover:text-slate-300 transition-colors">
                            {localTask.description || "No description provided."}
                        </p>
                    </div>
                )}
            </div>

            <div className="flex gap-8 flex-col-reverse md:flex-row">
                {/* Main Content: Subtasks */}
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <CheckSquare className="w-4 h-4" /> Subtasks
                    </h3>

                    <div className="space-y-2 mb-4">
                        {/* Progress Bar */}
                        {localTask.subTasks && localTask.subTasks.length > 0 && (
                            <div className="mb-4">
                                <div className="flex justify-between text-xs text-slate-400 mb-1">
                                    <span>Progress</span>
                                    <span>{Math.round((localTask.subTasks.filter(t => t.status === TaskStatus.DONE).length / localTask.subTasks.length) * 100)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                        style={{ width: `${(localTask.subTasks.filter(t => t.status === TaskStatus.DONE).length / localTask.subTasks.length) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {sortedSubtasks?.map(sub => (
                            <div key={sub.id} className="group flex items-start gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                                <button
                                    onClick={() => handleToggleSubtask(sub)}
                                    className={cn("mt-0.5 flex-shrink-0 transition-colors", sub.status === TaskStatus.DONE ? "text-blue-500" : "text-slate-500 hover:text-slate-400")}
                                >
                                    {sub.status === TaskStatus.DONE ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                </button>
                                <span className={cn("text-sm flex-1 transition-all", sub.status === TaskStatus.DONE ? "text-slate-500 line-through" : "text-slate-200")}>
                                    {sub.title}
                                </span>
                                <button onClick={() => handleDeleteSubtask(sub.id)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleAddSubtask} className="flex gap-2">
                        <Input
                            value={newSubtask}
                            onChange={e => setNewSubtask(e.target.value)}
                            placeholder="Add a subtask..."
                            className="flex-1 h-9 text-sm"
                        />
                        <Button type="submit" size="sm" variant="secondary">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </form>
                </div>

                {/* Sidebar: Metadata & Actions */}
                <div className="w-full md:w-48 space-y-6">
                    <div>
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Assignee</h3>
                        <div className="relative group">
                            <Button variant="ghost" className="w-full justify-start gap-2 border border-slate-700 bg-slate-800/50 hover:bg-slate-800">
                                {localTask.assignee ? (
                                    <>
                                        <UserAvatar name={localTask.assignee.name} surname={localTask.assignee.surname} size="sm" />
                                        <span className="truncate">{localTask.assignee.name}</span>
                                    </>
                                ) : (
                                    <>
                                        <UserIcon className="w-4 h-4 text-slate-400" />
                                        <span className="text-slate-400">Unassigned</span>
                                    </>
                                )}
                            </Button>

                            {/* Simple Dropdown for Assignment */}
                            <div className="absolute top-full left-0 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden hidden group-hover:block z-20 max-h-48 overflow-y-auto">
                                <button
                                    onClick={() => handleAssign('')}
                                    className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                                >
                                    Unassigned
                                </button>
                                {tenantUsers.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleAssign(user.id)}
                                        className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2"
                                    >
                                        <UserAvatar name={user.name} surname={user.surname} size="sm" className="w-5 h-5 text-[10px]" />
                                        <span className="truncate">{user.name} {user.surname}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Metadata</h3>
                        <dl className="space-y-2 text-xs text-slate-400">
                            <div>
                                <dt className="inline text-slate-500 mr-2">Status:</dt>
                                <dd className="inline font-medium text-slate-300">{localTask.status.replace('_', ' ')}</dd>
                            </div>
                            <div>
                                <dt className="inline text-slate-500 mr-2">Created:</dt>
                                <dd className="inline">{new Date(localTask.createdAt).toLocaleDateString()}</dd>
                            </div>
                        </dl>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
