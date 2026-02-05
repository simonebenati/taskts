export interface Tenant {
    id: string;
    name: string;
    subscription?: string;
    paymentMethod?: string;
    isActive?: boolean;
}

export interface Group {
    id: string;
    name: string;
    description?: string | null;
    tenantId: string;
    memberCount?: number;
}

export interface Role {
    id: string;
    name: string;
    tenantId: string;
    userCount?: number;
}

export interface User {
    id: string;
    email: string;
    name: string;
    surname: string;
    tenantId: string;
    roleName: string;
    tenantName?: string;
    isActive?: boolean;
    groupId?: string | null;
    group?: Group | null;
    role?: Role;
    createdAt?: string;
    isGuest?: boolean;
    guestExpiresAt?: string;
}

export interface Invite {
    id: string;
    email: string;
    role: string;
    type: 'member' | 'guest';
    status: 'pending' | 'accepted' | 'revoked';
    expiresAt: string;
    createdAt: string;
    inviter?: {
        name: string;
        surname: string;
        email: string;
    };
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
    parentTaskId?: string;
    subTasks?: Task[];
    createdAt: string;
    updatedAt: string;
    _count?: {
        subTasks: number;
    }
}
