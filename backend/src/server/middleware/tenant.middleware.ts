import { type Response, type NextFunction } from "express"
import { type AuthenticatedRequest } from "../types/auth.types.js"
import { prisma } from "../../db/bootstrap.js"

/**
 * Tenant isolation middleware
 * Validates that the authenticated user belongs to the requested tenant
 * Must be used AFTER authMiddleware
 * 
 * @param req - Authenticated Express request with user payload
 * @param res - Express response object
 * @param next - Express next function
 */
export async function tenantMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    // User must be authenticated first
    if (!req.user) {
        res.status(401).json({
            success: false,
            code: "UNAUTHORIZED",
            message: "Authentication required before tenant validation"
        })
        return
    }

    const { tenantId } = req.user

    // Verify tenant exists and is active
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, isActive: true }
    })

    if (!tenant) {
        res.status(403).json({
            success: false,
            code: "TENANT_NOT_FOUND",
            message: "Tenant not found"
        })
        return
    }

    if (!tenant.isActive) {
        res.status(403).json({
            success: false,
            code: "TENANT_INACTIVE",
            message: "Tenant is inactive. Please contact support."
        })
        return
    }

    next()
}

/**
 * Extracts tenantId from the authenticated request
 * Utility function for controllers to use when querying data
 * 
 * @param req - Authenticated Express request
 * @returns tenantId from the JWT payload
 * @throws Error if user is not authenticated (should never happen if middleware is used)
 */
export function getTenantId(req: AuthenticatedRequest): string {
    if (!req.user) {
        throw new Error("User not authenticated - tenantMiddleware must be used before this function")
    }
    return req.user.tenantId
}
