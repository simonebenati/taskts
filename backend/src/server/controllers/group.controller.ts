import { type Response } from "express"
import { prisma } from "../../db/bootstrap.js"
import { type AuthenticatedRequest } from "../types/auth.types.js"
import { forbiddenError, notFoundError } from "../middleware/error.middleware.js"

interface GroupResponse {
    id: string
    name: string
    description: string | null
    tenantId: string
    memberCount?: number
}

/**
 * Creates a new group within the tenant.
 * Only admins can create groups.
 * 
 * @param req - Authenticated Express request
 * @param res - Express response object
 */
export async function createGroup(
    req: AuthenticatedRequest & { body: { name: string; description?: string } },
    res: Response<{ success: true; data: GroupResponse }>
): Promise<void> {
    const { tenantId, roleName } = req.user
    const { name, description } = req.body

    if (roleName !== "admin") {
        throw forbiddenError("Only admins can create groups")
    }

    const group = await prisma.group.create({
        data: {
            name,
            description: description || null,
            tenantId
        }
    })

    res.status(201).json({
        success: true,
        data: {
            id: group.id,
            name: group.name,
            description: group.description,
            tenantId: group.tenantId,
            memberCount: 0
        }
    })
}

/**
 * Gets all groups for the tenant.
 * 
 * @param req - Authenticated Express request
 * @param res - Express response object
 */
export async function getGroups(
    req: AuthenticatedRequest,
    res: Response<{ success: true; data: GroupResponse[] }>
): Promise<void> {
    const { tenantId } = req.user

    const groups = await prisma.group.findMany({
        where: {
            tenantId,
            ...(req.user.roleName !== 'admin' && {
                id: req.user.groupId || undefined // If null, they might not see any groups? 
                // Actually if groupId is null, they should see no groups in the organizational list.
            })
        },
        include: {
            _count: { select: { users: true } }
        },
        orderBy: { name: "asc" }
    })

    res.status(200).json({
        success: true,
        data: groups.map(group => ({
            id: group.id,
            name: group.name,
            description: group.description,
            tenantId: group.tenantId,
            memberCount: group._count.users
        }))
    })
}

/**
 * Updates a group.
 * Only admins can update groups.
 * 
 * @param req - Authenticated Express request
 * @param res - Express response object
 */
export async function updateGroup(
    req: AuthenticatedRequest & { body: { name?: string; description?: string }; params: { id: string } },
    res: Response<{ success: true; data: GroupResponse }>
): Promise<void> {
    const { tenantId, roleName } = req.user
    const { id } = req.params
    const { name, description } = req.body

    if (roleName !== "admin") {
        throw forbiddenError("Only admins can update groups")
    }

    const existingGroup = await prisma.group.findFirst({
        where: { id, tenantId }
    })

    if (!existingGroup) {
        throw notFoundError("Group")
    }

    const group = await prisma.group.update({
        where: { id },
        data: {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description })
        },
        include: {
            _count: { select: { users: true } }
        }
    })

    res.status(200).json({
        success: true,
        data: {
            id: group.id,
            name: group.name,
            description: group.description,
            tenantId: group.tenantId,
            memberCount: group._count.users
        }
    })
}

/**
 * Deletes a group.
 * Only admins can delete groups.
 * Cannot delete groups with assigned users.
 * 
 * @param req - Authenticated Express request
 * @param res - Express response object
 */
export async function deleteGroup(
    req: AuthenticatedRequest & { params: { id: string } },
    res: Response<{ success: true; message: string }>
): Promise<void> {
    const { tenantId, roleName } = req.user
    const { id } = req.params

    if (roleName !== "admin") {
        throw forbiddenError("Only admins can delete groups")
    }

    const existingGroup = await prisma.group.findFirst({
        where: { id, tenantId },
        include: { _count: { select: { users: true } } }
    })

    if (!existingGroup) {
        throw notFoundError("Group")
    }

    // Prevent deleting groups with users
    if (existingGroup._count.users > 0) {
        throw forbiddenError("Cannot delete a group that has users assigned")
    }

    await prisma.group.delete({ where: { id } })

    res.status(200).json({
        success: true,
        message: "Group deleted successfully"
    })
}
