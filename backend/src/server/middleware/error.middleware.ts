import { type Request, type Response, type NextFunction } from "express"
import { type ApiError } from "../types/api.types.js"

/**
 * Custom application error class with HTTP status code and error code
 */
export class AppError extends Error {
    public readonly statusCode: number
    public readonly code: string
    public readonly details?: Record<string, string[]>

    constructor(
        statusCode: number,
        code: string,
        message: string,
        details?: Record<string, string[]>
    ) {
        super(message)
        this.statusCode = statusCode
        this.code = code
        this.details = details
        this.name = "AppError"

        // Maintains proper stack trace for where error was thrown
        Error.captureStackTrace(this, this.constructor)
    }
}

/**
 * Creates a validation error (400)
 */
export function validationError(message: string, details?: Record<string, string[]>): AppError {
    return new AppError(400, "VALIDATION_ERROR", message, details)
}

/**
 * Creates an unauthorized error (401)
 */
export function unauthorizedError(message: string = "Unauthorized"): AppError {
    return new AppError(401, "UNAUTHORIZED", message)
}

/**
 * Creates a forbidden error (403)
 */
export function forbiddenError(message: string = "Forbidden"): AppError {
    return new AppError(403, "FORBIDDEN", message)
}

/**
 * Creates a not found error (404)
 */
export function notFoundError(resource: string): AppError {
    return new AppError(404, "NOT_FOUND", `${resource} not found`)
}

/**
 * Creates a conflict error (409)
 */
export function conflictError(message: string): AppError {
    return new AppError(409, "CONFLICT", message)
}

/**
 * Creates an internal server error (500)
 */
export function internalError(message: string = "Internal server error"): AppError {
    return new AppError(500, "INTERNAL_ERROR", message)
}

/**
 * Global error handling middleware
 * Must be registered LAST in the middleware chain
 * 
 * @param err - Error object (may be AppError or generic Error)
 * @param req - Express request object
 * @param res - Express response object
 * @param _next - Express next function (unused but required for error middleware signature)
 */
export function errorMiddleware(
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void {
    // Log error for debugging (in production, use proper logging)
    console.error(`[ERROR] ${req.method} ${req.path}:`, err)
    import('fs').then(fs => {
        fs.appendFileSync('backend-error-global.log', `[${new Date().toISOString()}] ${req.method} ${req.path}\n${err.stack || err}\n\n`);
    }).catch(e => console.error('Failed to log to file', e));

    // Handle AppError instances
    if (err instanceof AppError) {
        const errorResponse: ApiError = {
            success: false,
            code: err.code,
            message: err.message
        }

        if (err.details) {
            errorResponse.details = err.details
        }

        res.status(err.statusCode).json(errorResponse)
        return
    }

    // Handle Prisma errors
    if (err.name === "PrismaClientKnownRequestError") {
        const prismaError = err as { code?: string; meta?: { target?: string[] } }

        if (prismaError.code === "P2002") {
            // Unique constraint violation
            const target = prismaError.meta?.target?.join(", ") ?? "field"
            res.status(409).json({
                success: false,
                code: "DUPLICATE_ENTRY",
                message: `A record with this ${target} already exists`
            })
            return
        }

        if (prismaError.code === "P2025") {
            // Record not found
            res.status(404).json({
                success: false,
                code: "NOT_FOUND",
                message: "Record not found"
            })
            return
        }
    }

    // Handle JSON parse errors
    if (err instanceof SyntaxError && "body" in err) {
        res.status(400).json({
            success: false,
            code: "INVALID_JSON",
            message: "Invalid JSON in request body"
        })
        return
    }

    // Default to 500 for unknown errors
    res.status(500).json({
        success: false,
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred"
    })
}
