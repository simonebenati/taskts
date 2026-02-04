/**
 * Unit tests for User Controller
 */
import { mockPrisma, resetMocks } from "../mocks/prisma.mock"
import { createMockAuthRequest, createMockResponse, testUserPayload } from "../mocks/express.mock"
import { getProfile, getUsers } from "../../src/server/controllers/user.controller"

describe("User Controller", () => {
    beforeEach(() => {
        resetMocks()
        jest.clearAllMocks()
    })

    describe("getProfile", () => {
        it("should return current user profile", async () => {
            const req = createMockAuthRequest({ user: testUserPayload })
            const res = createMockResponse()

            const mockUser = {
                id: testUserPayload.userId,
                email: "test@example.com",
                name: "John",
                surname: "Doe",
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                role: { name: "admin" },
                group: null,
            }

            mockPrisma.user.findUnique.mockResolvedValue(mockUser)

            await getProfile(req as any, res)

            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        email: "test@example.com",
                    }),
                })
            )
        })

        it("should throw error when user not found", async () => {
            const req = createMockAuthRequest({ user: testUserPayload })
            const res = createMockResponse()

            mockPrisma.user.findUnique.mockResolvedValue(null)

            await expect(getProfile(req as any, res)).rejects.toThrow()
        })
    })

    describe("getUsers", () => {
        it("should return all users in tenant", async () => {
            const req = createMockAuthRequest({ user: testUserPayload })
            const res = createMockResponse()

            const mockUsers = [
                {
                    id: "user-1",
                    email: "user1@example.com",
                    name: "User",
                    surname: "One",
                    role: { name: "admin" },
                    group: null,
                },
                {
                    id: "user-2",
                    email: "user2@example.com",
                    name: "User",
                    surname: "Two",
                    role: { name: "member" },
                    group: null,
                },
            ]

            mockPrisma.user.findMany.mockResolvedValue(mockUsers)

            await getUsers(req as any, res)

            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.arrayContaining([
                        expect.objectContaining({ email: "user1@example.com" }),
                        expect.objectContaining({ email: "user2@example.com" }),
                    ]),
                })
            )
        })

        it("should filter by tenant and active users", async () => {
            const req = createMockAuthRequest({ user: testUserPayload })
            const res = createMockResponse()

            mockPrisma.user.findMany.mockResolvedValue([])

            await getUsers(req as any, res)

            expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { tenantId: testUserPayload.tenantId, isActive: true },
                })
            )
        })
    })
})
