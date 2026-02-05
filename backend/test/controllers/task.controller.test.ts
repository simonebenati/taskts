/**
 * Unit tests for Task Controller
 */
import { mockPrisma, resetMocks } from "../mocks/prisma.mock.js"
import { createMockAuthRequest, createMockResponse, testUserPayload } from "../mocks/express.mock.js"
import { createTask, getTasks, getTask, updateTask, deleteTask } from "../../src/server/controllers/task.controller.js"
import type { CreateTaskBody, UpdateTaskBody } from "../../src/server/types/task.types.js"

// Mock the events module
jest.mock("../../src/server/utils/events.js", () => ({
    emitTaskEvent: jest.fn(),
}))

describe("Task Controller", () => {
    beforeEach(() => {
        resetMocks()
        jest.clearAllMocks()
    })

    describe("createTask", () => {
        const createTaskBody: CreateTaskBody = {
            title: "Test Task",
            description: "Test Description",
            status: "TODO",
        }

        it("should create a task successfully", async () => {
            const req = createMockAuthRequest({
                body: createTaskBody,
                user: testUserPayload,
                params: { boardId: "board-123" },
            })
            const res = createMockResponse()

            mockPrisma.board.findFirst.mockResolvedValue({
                id: "board-123",
                tenantId: testUserPayload.tenantId,
            })

            const mockTask = {
                id: "task-123",
                title: createTaskBody.title,
                description: createTaskBody.description,
                status: createTaskBody.status,
                boardId: "board-123",
                ownerId: testUserPayload.userId,
                assigneeId: null,
                parentTaskId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                assignee: null,
            }

            mockPrisma.task.create.mockResolvedValue(mockTask)

            await createTask(req as any, res)

            expect(res.status).toHaveBeenCalledWith(201)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        title: createTaskBody.title,
                    }),
                })
            )
        })

        it("should throw error when board not found", async () => {
            const req = createMockAuthRequest({
                body: createTaskBody,
                user: testUserPayload,
                params: { boardId: "nonexistent" },
            })
            const res = createMockResponse()

            mockPrisma.board.findFirst.mockResolvedValue(null)

            await expect(createTask(req as any, res)).rejects.toThrow()
        })
    })

    describe("getTasks", () => {
        it("should return all tasks for a board", async () => {
            const req = createMockAuthRequest({
                user: testUserPayload,
                params: { boardId: "board-123" },
            })
            const res = createMockResponse()

            mockPrisma.board.findFirst.mockResolvedValue({
                id: "board-123",
                tenantId: testUserPayload.tenantId,
            })

            const mockTasks = [
                {
                    id: "task-1",
                    title: "Task 1",
                    description: "Description 1",
                    status: "TODO",
                    boardId: "board-123",
                    ownerId: testUserPayload.userId,
                    assigneeId: null,
                    parentTaskId: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    assignee: null,
                    subTasks: [],
                },
            ]

            mockPrisma.task.findMany.mockResolvedValue(mockTasks)

            await getTasks(req as any, res)

            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.arrayContaining([
                        expect.objectContaining({ title: "Task 1" }),
                    ]),
                })
            )
        })
    })

    describe("getTask", () => {
        it("should return a task by id", async () => {
            const req = createMockAuthRequest({
                user: testUserPayload,
                params: { boardId: "board-123", id: "task-123" },
            })
            const res = createMockResponse()

            mockPrisma.board.findFirst.mockResolvedValue({
                id: "board-123",
                tenantId: testUserPayload.tenantId,
            })

            const mockTask = {
                id: "task-123",
                title: "Test Task",
                description: "Description",
                status: "TODO",
                boardId: "board-123",
                ownerId: testUserPayload.userId,
                assigneeId: null,
                parentTaskId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                assignee: null,
                subTasks: [],
            }

            mockPrisma.task.findFirst.mockResolvedValue(mockTask)

            await getTask(req as any, res)

            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        id: "task-123",
                    }),
                })
            )
        })

        it("should throw error when task not found", async () => {
            const req = createMockAuthRequest({
                user: testUserPayload,
                params: { boardId: "board-123", id: "nonexistent" },
            })
            const res = createMockResponse()

            mockPrisma.board.findFirst.mockResolvedValue({
                id: "board-123",
                tenantId: testUserPayload.tenantId,
            })

            mockPrisma.task.findFirst.mockResolvedValue(null)

            await expect(getTask(req as any, res)).rejects.toThrow()
        })
    })

    describe("updateTask", () => {
        const updateTaskBody: UpdateTaskBody = {
            title: "Updated Task",
            status: "IN_PROGRESS",
        }

        it("should update a task when user is owner", async () => {
            const req = createMockAuthRequest({
                body: updateTaskBody,
                user: testUserPayload,
                params: { boardId: "board-123", id: "task-123" },
            })
            const res = createMockResponse()

            mockPrisma.board.findFirst.mockResolvedValue({
                id: "board-123",
                tenantId: testUserPayload.tenantId,
            })

            mockPrisma.task.findFirst.mockResolvedValue({
                id: "task-123",
                ownerId: testUserPayload.userId,
                assigneeId: null,
                boardId: "board-123",
            })

            mockPrisma.task.update.mockResolvedValue({
                id: "task-123",
                title: updateTaskBody.title,
                description: null,
                status: updateTaskBody.status,
                boardId: "board-123",
                ownerId: testUserPayload.userId,
                assigneeId: null,
                parentTaskId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                assignee: null,
            })

            await updateTask(req as any, res)

            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        title: updateTaskBody.title,
                        status: updateTaskBody.status,
                    }),
                })
            )
        })
    })

    describe("deleteTask", () => {
        it("should delete a task when user is owner", async () => {
            const req = createMockAuthRequest({
                user: testUserPayload,
                params: { boardId: "board-123", id: "task-123" },
            })
            const res = createMockResponse()

            mockPrisma.board.findFirst.mockResolvedValue({
                id: "board-123",
                tenantId: testUserPayload.tenantId,
            })

            mockPrisma.task.findFirst.mockResolvedValue({
                id: "task-123",
                ownerId: testUserPayload.userId,
                boardId: "board-123",
            })

            mockPrisma.task.delete.mockResolvedValue({})

            await deleteTask(req as any, res)

            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Task deleted successfully",
            })
        })
    })
})
