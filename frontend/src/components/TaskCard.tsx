import { type Task, TaskStatus } from '../types';
import { Card, Button } from './ui';
import { UserAvatar } from './UserAvatar';
import { Trash2, ArrowLeft, ArrowRight, CheckSquare } from 'lucide-react';

interface TaskCardProps {
    task: Task;
    onDelete: (id: string) => void;
    onMove: (task: Task, direction: 'forward' | 'backward') => void;
    onClick: (task: Task) => void;
    isFirstColumn: boolean;
    isLastColumn: boolean;
}

export const TaskCard = ({ task, onDelete, onMove, onClick, isFirstColumn, isLastColumn }: TaskCardProps) => {
    // Calculate subtask progress
    const totalSubtasks = task.subTasks?.length || task._count?.subTasks || 0;
    const completedSubtasks = task.subTasks ? task.subTasks.filter(st => st.status === TaskStatus.DONE).length : 0;
    const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

    return (
        <Card
            hoverEffect
            className="group p-3 animate-in fade-in duration-300 relative dark:bg-slate-800/50 bg-white backdrop-blur-md dark:border-white/5 border-slate-200 hover:dark:border-primary/30 hover:border-primary/50 cursor-pointer shadow-sm"
            onClick={() => onClick(task)}
        >
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                    <p className="font-medium text-sm leading-snug dark:text-slate-200 text-slate-800 dark:group-hover:text-white group-hover:text-slate-900 transition-colors line-clamp-2">{task.title}</p>
                    <Button
                        variant="ghost"
                        className="h-6 w-6 p-0 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                    >
                        <Trash2 className="w-3 h-3" />
                    </Button>
                </div>

                {task.description && <p className="text-xs dark:text-slate-400 text-slate-600 line-clamp-2 mb-3 leading-relaxed">{task.description}</p>}

                {/* Subtask Progress Bar */}
                {totalSubtasks > 0 && (
                    <div className="mb-3">
                        <div className="flex items-center gap-1.5 text-[10px] dark:text-slate-400 text-slate-500 mb-1">
                            <CheckSquare className="w-3 h-3 text-blue-400" />
                            <span>{completedSubtasks}/{totalSubtasks} Subtasks</span>
                        </div>
                        <div className="h-1 w-full dark:bg-slate-700/50 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(59,130,246,0.3)]" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center mt-2 pt-2 border-t dark:border-white/5 border-slate-100">
                    <div className="flex items-center gap-2">
                        {task.assignee ? (
                            <div className="flex items-center gap-1.5" title={`Assigned to ${task.assignee.name} ${task.assignee.surname}`}>
                                <UserAvatar name={task.assignee.name} surname={task.assignee.surname} size="sm" className="w-5 h-5 text-[9px]" />
                                <span className="text-[10px] dark:text-slate-400 text-slate-500 max-w-[80px] truncate">{task.assignee.name}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5" title="Unassigned">
                                <div className="w-5 h-5 rounded-full dark:bg-slate-800 bg-white border dark:border-slate-700 border-slate-300 border-dashed flex items-center justify-center">
                                    <span className="text-[10px] dark:text-slate-600 text-slate-400">?</span>
                                </div>
                                <span className="text-[10px] dark:text-slate-600 text-slate-500 italic">Unassigned</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isFirstColumn && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onMove(task, 'backward'); }}
                                className="p-1 dark:hover:bg-slate-700 hover:bg-slate-100 rounded dark:text-slate-400 text-slate-500 hover:text-blue-600 transition-colors"
                                title="Move Back"
                            >
                                <ArrowLeft className="w-3 h-3" />
                            </button>
                        )}
                        {!isLastColumn && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onMove(task, 'forward'); }}
                                className="p-1 dark:hover:bg-slate-700 hover:bg-slate-100 rounded dark:text-slate-400 text-slate-500 hover:text-blue-600 transition-colors"
                                title="Move Forward"
                            >
                                <ArrowRight className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
};
