/**
 * Unit tests for Board Controller
 */
import { mockPrisma, resetMocks } from "../mocks/prisma.mock"
import { createMockAuthRequest, createMockResponse, testUserPayload } from "../mocks/express.mock"
import { createBoard, getBoards, getBoard, updateBoard, deleteBoard } from "../../src/server/controllers/board.controller"
import type { CreateBoardBody, UpdateBoardBody } from "../../src/server/types/board.types"

// Mock the events module
jest.mock("../../src/server/utils/events", () => ({
    emitBoardEvent: jest.fn(),
}))

describe("Board Controller", () => {
    beforeEach(() => {
        resetMocks()
        jest.clearAllMocks()
    })

    describe("createBoard", () => {
        const createBoardBody: CreateBoardBody = {
            name: "Test Board",
            description: "Test Description",
        }

        it("should create a board successfully", async () => {
            const req = createMockAuthRequest({ body: createBoardBody, user: testUserPayload })
            const res = createMockResponse()

            const mockBoard = {
                id: "board-123",
                name: createBoardBody.name,
                description: createBoardBody.description,
                ownerId: testUserPayload.userId,
                tenantId: testUserPayload.tenantId,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            mockPrisma.board.create.mockResolvedValue(mockBoard)

            await createBoard(req as any, res)

            expect(res.status).toHaveBeenCalledWith(201)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        name: createBoardBody.name,
                    }),
                })
            )
        })
    })

    describe("getBoards", () => {
        it("should return all boards for tenant", async () => {
            const req = createMockAuthRequest({ user: testUserPayload })
            const res = createMockResponse()

            const mockBoards = [
                {
                    id: "board-1",
                    name: "Board 1",
                    description: "Description 1",
                    ownerId: testUserPayload.userId,
                    tenantId: testUserPayload.tenantId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    _count: { tasks: 5 },
                },
                {
                    id: "board-2",
                    name: "Board 2",
                    description: "Description 2",
                    ownerId: testUserPayload.userId,
                    tenantId: testUserPayload.tenantId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    _count: { tasks: 3 },
                },
            ]

            mockPrisma.board.findMany.mockResolvedValue(mockBoards)

            await getBoards(req as any, res)

            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.arrayContaining([
                        expect.objectContaining({ name: "Board 1", taskCount: 5 }),
                        expect.objectContaining({ name: "Board 2", taskCount: 3 }),
                    ]),
                })
            )
        })

        it("should return empty array when no boards exist", async () => {
            const req = createMockAuthRequest({ user: testUserPayload })
            const res = createMockResponse()

            mockPrisma.board.findMany.mockResolvedValue([])

            await getBoards(req as any, res)

            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: [],
            })
        })
    })

    describe("getBoard", () => {
        it("should return a board by id", async () => {
            const req = createMockAuthRequest({
                user: testUserPayload,
                params: { id: "board-123" },
            })
            const res = createMockResponse()

            const mockBoard = {
                id: "board-123",
                name: "Test Board",
                description: "Description",
                ownerId: testUserPayload.userId,
                tenantId: testUserPayload.tenantId,
                createdAt: new Date(),
                updatedAt: new Date(),
                _count: { tasks: 2 },
            }

            mockPrisma.board.findFirst.mockResolvedValue(mockBoard)

            await getBoard(req as any, res)

            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        id: "board-123",
                        taskCount: 2,
                    }),
                })
            )
        })

        it("should throw error when board not found", async () => {
            const req = createMockAuthRequest({
                user: testUserPayload,
                params: { id: "nonexistent" },
            })
            const res = createMockResponse()

            mockPrisma.board.findFirst.mockResolvedValue(null)

            await expect(getBoard(req as any, res)).rejects.toThrow()
        })
    })

    describe("updateBoard", () => {
        const updateBoardBody: UpdateBoardBody = {
            name: "Updated Board",
            description: "Updated Description",
        }

        it("should update a board when user is owner", async () => {
            const req = createMockAuthRequest({
                body: updateBoardBody,
                user: testUserPayload,
                params: { id: "board-123" },
            })
            const res = createMockResponse()

            mockPrisma.board.findFirst.mockResolvedValue({
                id: "board-123",
                ownerId: testUserPayload.userId,
                tenantId: testUserPayload.tenantId,
            })

            mockPrisma.board.update.mockResolvedValue({
                id: "board-123",
                name: updateBoardBody.name,
                description: updateBoardBody.description,
                ownerId: testUserPayload.userId,
                tenantId: testUserPayload.tenantId,
                createdAt: new Date(),
                updatedAt: new Date(),
                _count: { tasks: 0 },
            })

            await updateBoard(req as any, res)

            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        name: updateBoardBody.name,
                    }),
                })
            )
        })

        it("should throw error when user is not owner or admin", async () => {
            const nonOwnerPayload = { ...testUserPayload, userId: "other-user", roleName: "member" }
            const req = createMockAuthRequest({
                body: updateBoardBody,
                user: nonOwnerPayload,
                params: { id: "board-123" },
            })
            const res = createMockResponse()

            mockPrisma.board.findFirst.mockResolvedValue({
                id: "board-123",
                ownerId: "original-owner",
                tenantId: testUserPayload.tenantId,
            })

            await expect(updateBoard(req as any, res)).rejects.toThrow()
        })
    })

    describe("deleteBoard", () => {
        it("should delete a board when user is owner", async () => {
            const req = createMockAuthRequest({
                user: testUserPayload,
                params: { id: "board-123" },
            })
            const res = createMockResponse()

            mockPrisma.board.findFirst.mockResolvedValue({
                id: "board-123",
                ownerId: testUserPayload.userId,
                tenantId: testUserPayload.tenantId,
            })

            mockPrisma.board.delete.mockResolvedValue({})

            await deleteBoard(req as any, res)

            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Board deleted successfully",
            })
        })
    })
})
