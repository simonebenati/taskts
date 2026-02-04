/**
 * Task-related type definitions
 */

/**
 * Task status enum (matches Prisma schema)
 */
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE"

/**
 * Request body for creating a task
 */
export interface CreateTaskBody {
    title: string
    description?: string
    status?: TaskStatus
    assigneeId?: string
    parentTaskId?: string
}

/**
 * Request body for updating a task
 */
export interface UpdateTaskBody {
    title?: string
    description?: string
    status?: TaskStatus
    assigneeId?: string | null
    parentTaskId?: string | null
}

/**
 * Task response structure
 */
export interface TaskResponse {
    id: string
    title: string
    description: string | null
    status: TaskStatus
    boardId: string
    ownerId: string
    assigneeId: string | null
    parentTaskId: string | null
    createdAt: Date
    updatedAt: Date
    assignee?: {
        id: string
        name: string
        surname: string
    } | null
    subTasks?: TaskResponse[]
}
