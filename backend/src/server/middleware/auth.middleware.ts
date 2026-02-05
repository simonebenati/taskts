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
    let token: string | undefined

    // Check for Authorization header
    const authHeader = req.headers.authorization

    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.slice(7)
    } else if (req.query && typeof req.query.token === "string") {
        // Fallback to query parameter (needed for SSE)
        token = req.query.token
    }

    if (!token) {
        res.status(401).json({
            success: false,
            code: "UNAUTHORIZED",
            message: "Authorization required"
        })
        return
    }

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
