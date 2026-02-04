import { type Response } from "express"
import { prisma } from "../../db/bootstrap.js"
import { type AuthenticatedRequest } from "../types/auth.types.js"
import { forbiddenError, notFoundError } from "../middleware/error.middleware.js"

/**
 * Role response type
 */
interface RoleResponse {
    id: string
    name: string
    tenantId: string
    userCount?: number
}

/**
 * Creates a new role within the tenant.
 * Only admins can create roles.
 * 
 * @param req - Authenticated Express request
 * @param res - Express response object
 */
export async function createRole(
    req: AuthenticatedRequest & { body: { name: string } },
    res: Response<{ success: true; data: RoleResponse }>
): Promise<void> {
    const { tenantId, roleName: currentRole } = req.user
    const { name } = req.body

    if (currentRole !== "admin") {
        throw forbiddenError("Only admins can create roles")
    }

    const role = await prisma.role.create({
        data: {
            name,
            tenantId
        }
    })

    res.status(201).json({
        success: true,
        data: {
            id: role.id,
            name: role.name,
            tenantId: role.tenantId
        }
    })
}

/**
 * Gets all roles for the tenant.
 * 
 * @param req - Authenticated Express request
 * @param res - Express response object
 */
export async function getRoles(
    req: AuthenticatedRequest,
    res: Response<{ success: true; data: RoleResponse[] }>
): Promise<void> {
    const { tenantId } = req.user

    const roles = await prisma.role.findMany({
        where: { tenantId },
        include: {
            _count: { select: { users: true } }
        },
        orderBy: { name: "asc" }
    })

    res.status(200).json({
        success: true,
        data: roles.map(role => ({
            id: role.id,
            name: role.name,
            tenantId: role.tenantId,
            userCount: role._count.users
        }))
    })
}

/**
 * Updates a role.
 * Only admins can update roles. Cannot update "admin" or "member" built-in roles.
 * 
 * @param req - Authenticated Express request
 * @param res - Express response object
 */
export async function updateRole(
    req: AuthenticatedRequest & { body: { name: string }; params: { id: string } },
    res: Response<{ success: true; data: RoleResponse }>
): Promise<void> {
    const { tenantId, roleName: currentRole } = req.user
    const { id } = req.params
    const { name } = req.body

    if (currentRole !== "admin") {
        throw forbiddenError("Only admins can update roles")
    }

    const existingRole = await prisma.role.findFirst({
        where: { id, tenantId }
    })

    if (!existingRole) {
        throw notFoundError("Role")
    }

    // Prevent modifying built-in roles
    if (existingRole.name === "admin" || existingRole.name === "member") {
        throw forbiddenError("Cannot modify built-in roles")
    }

    const role = await prisma.role.update({
        where: { id },
        data: { name }
    })

    res.status(200).json({
        success: true,
        data: {
            id: role.id,
            name: role.name,
            tenantId: role.tenantId
        }
    })
}

/**
 * Deletes a role.
 * Only admins can delete roles. Cannot delete "admin" or "member" built-in roles.
 * Cannot delete roles with assigned users.
 * 
 * @param req - Authenticated Express request
 * @param res - Express response object
 */
export async function deleteRole(
    req: AuthenticatedRequest & { params: { id: string } },
    res: Response<{ success: true; message: string }>
): Promise<void> {
    const { tenantId, roleName: currentRole } = req.user
    const { id } = req.params

    if (currentRole !== "admin") {
        throw forbiddenError("Only admins can delete roles")
    }

    const existingRole = await prisma.role.findFirst({
        where: { id, tenantId },
        include: { _count: { select: { users: true } } }
    })

    if (!existingRole) {
        throw notFoundError("Role")
    }

    // Prevent deleting built-in roles
    if (existingRole.name === "admin" || existingRole.name === "member") {
        throw forbiddenError("Cannot delete built-in roles")
    }

    // Prevent deleting roles with users
    if (existingRole._count.users > 0) {
        throw forbiddenError("Cannot delete a role that has users assigned")
    }

    await prisma.role.delete({ where: { id } })

    res.status(200).json({
        success: true,
        message: "Role deleted successfully"
    })
}
