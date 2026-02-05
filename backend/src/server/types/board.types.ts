/**
 * Board-related type definitions
 */

/**
 * Request body for creating a board
 */
export interface CreateBoardBody {
    name: string
    description?: string
    groupId?: string | null
}

/**
 * Request body for updating a board
 */
export interface UpdateBoardBody {
    name?: string
    description?: string
}

export const createBoardSchema = {
    name: { required: true, type: "string" as const, minLength: 1, maxLength: 100 },
    description: { required: false, type: "string" as const, maxLength: 1000 },
    groupId: { required: false, type: "string" as const }
}

/**
 * Board response structure
 */
export interface BoardResponse {
    id: string
    name: string
    description: string | null
    ownerId: string
    tenantId: string
    groupId?: string | null
    group?: { id: string, name: string } | null
    createdAt: Date
    updatedAt: Date
    taskCount?: number
    owner?: {
        id: string
        email: string
        name: string
        surname: string
        tenantId: string
        roleName?: string
        groupId?: string | null
        group?: { id: string, name: string } | null
    }
}
