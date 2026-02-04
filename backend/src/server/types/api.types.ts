/**
 * API response and error type definitions
 * Provides consistent structure for all API responses
 */

/**
 * Standard success response wrapper
 */
export interface ApiResponse<T> {
    success: true
    data: T
    message?: string
}

/**
 * Standard error response
 */
export interface ApiError {
    success: false
    code: string
    message: string
    details?: Record<string, string[]>
}

/**
 * Paginated response for list endpoints
 */
export interface PaginatedResponse<T> {
    success: true
    data: T[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}

/**
 * Union type for all API responses
 */
export type ApiResult<T> = ApiResponse<T> | ApiError
