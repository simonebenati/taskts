/**
 * Board-related type definitions
 */

/**
 * Request body for creating a board
 */
export interface CreateBoardBody {
    name: string
    description?: string
}

/**
 * Request body for updating a board
 */
export interface UpdateBoardBody {
    name?: string
    description?: string
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
    }
}
