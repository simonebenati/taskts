import { type Request } from "express"

/**
 * JWT token payload structure
 */
export interface TokenPayload {
    userId: string
    tenantId: string
    roleId: string
    roleName: string
    iat: number
    exp: number
}

/**
 * Request body for user login
 */
export interface LoginBody {
    email: string
    password: string
}

/**
 * Request body for user registration
 */
export interface RegisterBody {
    email: string
    name: string
    surname: string
    password: string
    tenantId?: string
    inviteId?: string
}

/**
 * Request body for token refresh
 */
export interface RefreshBody {
    refreshToken: string
}

/**
 * Response structure for successful authentication
 */
export interface AuthResponse {
    accessToken: string
    refreshToken: string
    expiresIn: number
    user: {
        id: string
        email: string
        name: string
        surname: string
        tenantId: string
        roleName: string
        tenantName?: string
    }
}

/**
 * Extended Express Request with authenticated user data
 */
export interface AuthenticatedRequest extends Request {
    user: TokenPayload
}
