import { type Response, type NextFunction } from "express"
import { type AuthenticatedRequest, type TokenPayload } from "../types/auth.types.js"
import { verifyAccessToken } from "../utils/crypto.utils.js"

/**
 * Authentication middleware
 * Validates JWT from Authorization header and attaches user to request
 * 
 * @param req - Express request object (will be typed as AuthenticatedRequest after validation)
 * @param res - Express response object
 * @param next - Express next function
 */
export function authMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void {
    const authHeader = req.headers.authorization

    // Check for Authorization header
    if (!authHeader) {
        res.status(401).json({
            success: false,
            code: "UNAUTHORIZED",
            message: "Authorization header is required"
        })
        return
    }

    // Validate Bearer token format
    if (!authHeader.startsWith("Bearer ")) {
        res.status(401).json({
            success: false,
            code: "INVALID_TOKEN_FORMAT",
            message: "Authorization header must be in format: Bearer <token>"
        })
        return
    }

    const token = authHeader.slice(7) // Remove "Bearer " prefix

    // Verify and decode token
    const payload: TokenPayload | null = verifyAccessToken(token)

    if (payload === null) {
        res.status(401).json({
            success: false,
            code: "INVALID_TOKEN",
            message: "Token is invalid or expired"
        })
        return
    }

    // Attach user payload to request
    req.user = payload

    next()
}
