import { type Response } from "express"
import { prisma } from "../../db/bootstrap.js"
import { type AuthenticatedRequest } from "../types/auth.types.js"
import { type CreateTaskBody, type UpdateTaskBody, type TaskResponse } from "../types/task.types.js"
import { notFoundError, forbiddenError } from "../middleware/error.middleware.js"
import { emitTaskEvent } from "../utils/events.js"

/**
 * Validates that board exists and belongs to user's tenant.
 * Returns the board if valid, throws NotFoundError otherwise.
 */
async function validateBoardAccess(boardId: string, tenantId: string): Promise<{ id: string }> {
    const board = await prisma.board.findFirst({
        where: { id: boardId, tenantId },
        select: { id: true }
    })

    if (!board) {
        throw notFoundError("Board")
    }

    return board
}

/**
 * Creates a new task within a board.
 * 
 * @param req - Authenticated Express request with CreateTaskBody in body
 * @param res - Express response object
 */
export async function createTask(
    req: AuthenticatedRequest & {
        body: CreateTaskBody
        params: { boardId: string }
    },
    res: Response<{ success: true; data: TaskResponse }>
): Promise<void> {
    const { tenantId, userId } = req.user
    const { boardId } = req.params
    const { title, description, status, assigneeId, parentTaskId } = req.body

    // Validate board access
    await validateBoardAccess(boardId, tenantId)

    // Validate assignee belongs to same tenant (if provided)
    if (assigneeId) {
        const assignee = await prisma.user.findFirst({
            where: { id: assigneeId, tenantId },
            select: { id: true }
        })
        if (!assignee) {
            throw notFoundError("Assignee")
        }
    }

    // Validate parent task belongs to same board (if provided)
    if (parentTaskId) {
        const parentTask = await prisma.task.findFirst({
            where: { id: parentTaskId, boardId },
            select: { id: true }
        })
        if (!parentTask) {
            throw notFoundError("Parent task")
        }
    }

    const task = await prisma.task.create({
        data: {
            title,
            description,
            status: status ?? "TODO",
            boardId,
            ownerId: userId,
            assigneeId,
            parentTaskId
        },
        include: {
            assignee: {
                select: { id: true, name: true, surname: true }
            }
        }
    })

    const response: TaskResponse = {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        boardId: task.boardId,
        ownerId: task.ownerId,
        assigneeId: task.assigneeId,
        parentTaskId: task.parentTaskId,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        assignee: task.assignee
    }

    // Emit real-time event
    emitTaskEvent(tenantId, "created", response)

    res.status(201).json({
        success: true,
        data: response
    })
}

/**
 * Gets all tasks for a board.
 * 
 * @param req - Authenticated Express request with boardId in params
 * @param res - Express response object
 */
export async function getTasks(
    req: AuthenticatedRequest & { params: { boardId: string } },
    res: Response<{ success: true; data: TaskResponse[] }>
): Promise<void> {
    const { tenantId } = req.user
    const { boardId } = req.params

    // Validate board access
    await validateBoardAccess(boardId, tenantId)

    const tasks = await prisma.task.findMany({
        where: {
            boardId,
            parentTaskId: null // Only get top-level tasks
        },
        include: {
            assignee: {
                select: { id: true, name: true, surname: true }
            },
            subTasks: {
                include: {
                    assignee: {
                        select: { id: true, name: true, surname: true }
                    }
                }
            }
        },
        orderBy: { createdAt: "desc" }
    })

    const response: TaskResponse[] = tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        boardId: task.boardId,
        ownerId: task.ownerId,
        assigneeId: task.assigneeId,
        parentTaskId: task.parentTaskId,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        assignee: task.assignee,
        subTasks: task.subTasks.map(sub => ({
            id: sub.id,
            title: sub.title,
            description: sub.description,
            status: sub.status,
            boardId: sub.boardId,
            ownerId: sub.ownerId,
            assigneeId: sub.assigneeId,
            parentTaskId: sub.parentTaskId,
            createdAt: sub.createdAt,
            updatedAt: sub.updatedAt,
            assignee: sub.assignee
        }))
    }))

    res.status(200).json({
        success: true,
        data: response
    })
}

/**
 * Gets a single task by ID.
 * 
 * @param req - Authenticated Express request with boardId and id in params
 * @param res - Express response object
 */
export async function getTask(
    req: AuthenticatedRequest & { params: { boardId: string; id: string } },
    res: Response<{ success: true; data: TaskResponse }>
): Promise<void> {
    const { tenantId } = req.user
    const { boardId, id } = req.params

    // Validate board access
    await validateBoardAccess(boardId, tenantId)

    const task = await prisma.task.findFirst({
        where: { id, boardId },
        include: {
            assignee: {
                select: { id: true, name: true, surname: true }
            },
            subTasks: {
                include: {
                    assignee: {
                        select: { id: true, name: true, surname: true }
                    }
                }
            }
        }
    })

    if (!task) {
        throw notFoundError("Task")
    }

    res.status(200).json({
        success: true,
        data: {
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            boardId: task.boardId,
            ownerId: task.ownerId,
            assigneeId: task.assigneeId,
            parentTaskId: task.parentTaskId,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            assignee: task.assignee,
            subTasks: task.subTasks.map(sub => ({
                id: sub.id,
                title: sub.title,
                description: sub.description,
                status: sub.status,
                boardId: sub.boardId,
                ownerId: sub.ownerId,
                assigneeId: sub.assigneeId,
                parentTaskId: sub.parentTaskId,
                createdAt: sub.createdAt,
                updatedAt: sub.updatedAt,
                assignee: sub.assignee
            }))
        }
    })
}

/**
 * Updates a task.
 * 
 * @param req - Authenticated Express request with UpdateTaskBody in body
 * @param res - Express response object
 */
export async function updateTask(
    req: AuthenticatedRequest & {
        body: UpdateTaskBody
        params: { boardId: string; id: string }
    },
    res: Response<{ success: true; data: TaskResponse }>
): Promise<void> {
    const { tenantId, userId, roleName } = req.user
    const { boardId, id } = req.params
    const { title, description, status, assigneeId, parentTaskId } = req.body

    // Validate board access
    await validateBoardAccess(boardId, tenantId)

    // Find existing task
    const existingTask = await prisma.task.findFirst({
        where: { id, boardId }
    })

    if (!existingTask) {
        throw notFoundError("Task")
    }

    // Check permission: must be owner, assignee, or admin
    const canUpdate = existingTask.ownerId === userId ||
        existingTask.assigneeId === userId ||
        roleName === "admin"

    if (!canUpdate) {
        throw forbiddenError("You can only update tasks you own or are assigned to")
    }

    // Validate new assignee belongs to same tenant (if changing)
    if (assigneeId !== undefined && assigneeId !== null) {
        const assignee = await prisma.user.findFirst({
            where: { id: assigneeId, tenantId },
            select: { id: true }
        })
        if (!assignee) {
            throw notFoundError("Assignee")
        }
    }

    // Prevent circular parent task reference
    if (parentTaskId === id) {
        throw forbiddenError("A task cannot be its own parent")
    }

    const task = await prisma.task.update({
        where: { id },
        data: {
            ...(title !== undefined && { title }),
            ...(description !== undefined && { description }),
            ...(status !== undefined && { status }),
            ...(assigneeId !== undefined && { assigneeId }),
            ...(parentTaskId !== undefined && { parentTaskId })
        },
        include: {
            assignee: {
                select: { id: true, name: true, surname: true }
            }
        }
    })

    const response: TaskResponse = {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        boardId: task.boardId,
        ownerId: task.ownerId,
        assigneeId: task.assigneeId,
        parentTaskId: task.parentTaskId,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        assignee: task.assignee
    }

    // Emit real-time event
    emitTaskEvent(tenantId, "updated", response)

    res.status(200).json({
        success: true,
        data: response
    })
}

/**
 * Deletes a task (and all subtasks via cascade).
 * 
 * @param req - Authenticated Express request with boardId and id in params
 * @param res - Express response object
 */
export async function deleteTask(
    req: AuthenticatedRequest & { params: { boardId: string; id: string } },
    res: Response<{ success: true; message: string }>
): Promise<void> {
    const { tenantId, userId, roleName } = req.user
    const { boardId, id } = req.params

    // Validate board access
    await validateBoardAccess(boardId, tenantId)

    // Find existing task
    const existingTask = await prisma.task.findFirst({
        where: { id, boardId }
    })

    if (!existingTask) {
        throw notFoundError("Task")
    }

    // Check permission: must be owner or admin
    if (existingTask.ownerId !== userId && roleName !== "admin") {
        throw forbiddenError("You can only delete tasks you own")
    }

    await prisma.task.delete({ where: { id } })

    // Emit real-time event
    emitTaskEvent(tenantId, "deleted", { id, boardId, tenantId })

    res.status(200).json({
        success: true,
        message: "Task deleted successfully"
    })
}
