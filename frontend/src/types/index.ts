export interface User {
    id: string;
    email: string;
    name: string;
    surname: string;
    tenantId: string;
    roleName: string;
}

export interface Board {
    id: string;
    name: string;
    description: string;
    tenantId: string;
    ownerId: string;
    owner: User;
    createdAt: string;
    updatedAt: string;
}

export const TaskStatus = {
    TODO: 'TODO',
    IN_PROGRESS: 'IN_PROGRESS',
    DONE: 'DONE'
} as const;

export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    boardId: string;
    ownerId: string;
    assigneeId?: string;
    owner: User;
    assignee?: User;
    createdAt: string;
    updatedAt: string;
    _count?: {
        subTasks: number;
    }
}
