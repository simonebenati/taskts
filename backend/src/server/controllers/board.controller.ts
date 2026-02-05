import { type Response } from "express"
import { prisma } from "../../db/bootstrap.js"
import { type AuthenticatedRequest } from "../types/auth.types.js"
import { type CreateBoardBody, type UpdateBoardBody, type BoardResponse } from "../types/board.types.js"
import { notFoundError, forbiddenError } from "../middleware/error.middleware.js"
import { emitBoardEvent } from "../utils/events.js"

/**
 * Creates a new board within the user's tenant.
 * 
 * @param req - Authenticated Express request with CreateBoardBody in body
 * @param res - Express response object
 */
export async function createBoard(
    req: AuthenticatedRequest & { body: CreateBoardBody },
    res: Response<{ success: true; data: BoardResponse }>
): Promise<void> {
    const { tenantId, userId } = req.user
    const { name, description } = req.body

    const board = await prisma.board.create({
        data: {
            name,
            description,
            tenantId,
            ownerId: userId,
            // For non-admins, always associate with their group. 
            // Admins can specify a groupId or leave it null.
            groupId: req.user.roleName === 'admin' ? (req.body.groupId || null) : req.user.groupId
        }
    })

    const response: BoardResponse = {
        id: board.id,
        name: board.name,
        description: board.description,
        ownerId: board.ownerId,
        tenantId: board.tenantId,
        groupId: board.groupId,
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
        taskCount: 0
    }

    // Emit real-time event
    emitBoardEvent(tenantId, "created", response)

    res.status(201).json({
        success: true,
        data: response
    })
}

/**
 * Gets all boards for the user's tenant.
 * 
 * @param req - Authenticated Express request
 * @param res - Express response object
 */
export async function getBoards(
    req: AuthenticatedRequest,
    res: Response<{ success: true; data: BoardResponse[] }>
): Promise<void> {
    const { tenantId, roleName, groupId: userGroupId } = req.user

    const boards = await prisma.board.findMany({
        where: {
            tenantId,
            ...(roleName !== 'admin' && {
                OR: [
                    // Boards in the user's group
                    { groupId: userGroupId },
                    // Private boards (no group) owned by the user
                    { AND: [{ groupId: null }, { ownerId: req.user.userId }] }
                ]
            })
        },
        include: {
            _count: { select: { tasks: true } },
            group: { select: { id: true, name: true } },
            owner: { select: { id: true, email: true, name: true, surname: true, tenantId: true, groupId: true, group: { select: { id: true, name: true } } } }
        },
        orderBy: { createdAt: "desc" }
    })

    const response: BoardResponse[] = boards.map(board => ({
        id: board.id,
        name: board.name,
        description: board.description,
        ownerId: board.ownerId,
        tenantId: board.tenantId,
        groupId: board.groupId,
        group: board.group,
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
        taskCount: board._count.tasks,
        owner: board.owner ? {
            id: board.owner.id,
            email: board.owner.email,
            name: board.owner.name,
            surname: board.owner.surname,
            tenantId: board.owner.tenantId,
            groupId: board.owner.groupId,
            group: board.owner.group
        } : undefined
    }))

    res.status(200).json({
        success: true,
        data: response
    })
}

/**
 * Gets a single board by ID (must belong to user's tenant).
 * 
 * @param req - Authenticated Express request with board ID in params
 * @param res - Express response object
 */
export async function getBoard(
    req: AuthenticatedRequest & { params: { id: string } },
    res: Response<{ success: true; data: BoardResponse }>
): Promise<void> {
    const { tenantId } = req.user
    const { id } = req.params

    const board = await prisma.board.findFirst({
        where: {
            id,
            tenantId,
            ...(req.user.roleName !== 'admin' && {
                OR: [
                    { groupId: req.user.groupId },
                    { AND: [{ groupId: null }, { ownerId: req.user.userId }] }
                ]
            })
        },
        include: {
            _count: { select: { tasks: true } },
            owner: {
                include: {
                    group: true,
                    role: true
                }
            },
            group: true
        }
    })

    if (!board) {
        throw notFoundError("Board")
    }

    res.status(200).json({
        success: true,
        data: {
            id: board.id,
            name: board.name,
            description: board.description,
            ownerId: board.ownerId,
            tenantId: board.tenantId,
            groupId: board.groupId,
            group: board.group,
            createdAt: board.createdAt,
            updatedAt: board.updatedAt,
            taskCount: board._count.tasks,
            owner: {
                id: board.owner.id,
                email: board.owner.email,
                name: board.owner.name,
                surname: board.owner.surname,
                tenantId: board.owner.tenantId,
                roleName: board.owner.role.name,
                groupId: board.owner.groupId,
                group: board.owner.group
            }
        }
    })
}

/**
 * Updates a board (must be owner or admin).
 * 
 * @param req - Authenticated Express request with UpdateBoardBody in body and board ID in params
 * @param res - Express response object
 */
export async function updateBoard(
    req: AuthenticatedRequest & { body: UpdateBoardBody; params: { id: string } },
    res: Response<{ success: true; data: BoardResponse }>
): Promise<void> {
    const { tenantId, userId, roleName } = req.user
    const { id } = req.params
    const { name, description } = req.body

    // Find board
    const existingBoard = await prisma.board.findFirst({
        where: { id, tenantId }
    })

    if (!existingBoard) {
        throw notFoundError("Board")
    }

    // Check permission: must be owner or admin
    if (existingBoard.ownerId !== userId && roleName !== "admin") {
        throw forbiddenError("You can only update boards you own")
    }

    const board = await prisma.board.update({
        where: { id },
        data: {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description })
        },
        include: {
            _count: { select: { tasks: true } }
        }
    })

    const response: BoardResponse = {
        id: board.id,
        name: board.name,
        description: board.description,
        ownerId: board.ownerId,
        tenantId: board.tenantId,
        groupId: board.groupId,
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
        taskCount: board._count.tasks
    }

    // Emit real-time event
    emitBoardEvent(tenantId, "updated", response)

    res.status(200).json({
        success: true,
        data: response
    })
}

/**
 * Deletes a board (must be owner or admin).
 * Also deletes all tasks within the board (cascade).
 * 
 * @param req - Authenticated Express request with board ID in params
 * @param res - Express response object
 */
export async function deleteBoard(
    req: AuthenticatedRequest & { params: { id: string } },
    res: Response<{ success: true; message: string }>
): Promise<void> {
    const { tenantId, userId, roleName } = req.user
    const { id } = req.params

    // Find board
    const existingBoard = await prisma.board.findFirst({
        where: { id, tenantId }
    })

    if (!existingBoard) {
        throw notFoundError("Board")
    }

    // Check permission: must be owner or admin
    if (existingBoard.ownerId !== userId && roleName !== "admin") {
        throw forbiddenError("You can only delete boards you own")
    }

    await prisma.board.delete({ where: { id } })

    // Emit real-time event
    emitBoardEvent(tenantId, "deleted", { id, tenantId })

    res.status(200).json({
        success: true,
        message: "Board deleted successfully"
    })
}
