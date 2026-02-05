/**
 * Unit tests for User Controller
 */
import { mockPrisma, resetMocks } from "../mocks/prisma.mock.js"
import { createMockAuthRequest, createMockResponse, testUserPayload } from "../mocks/express.mock.js"
import { getProfile, updateProfile, getUsers, updateUserRole, deleteUser, getAllUsers, approveUser, blockUser, unblockUser, assignUserToGroup } from "../../src/server/controllers/user.controller.js"

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
                tenant: { name: "Test Tenant" },
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

    describe("updateProfile", () => {
        it("should update user profile successfully", async () => {
            const req = createMockAuthRequest({
                user: testUserPayload,
                body: { name: "Jane", surname: "Smith" }
            })
            const res = createMockResponse()

            const updatedUser = {
                id: testUserPayload.userId,
                email: "test@example.com",
                name: "Jane",
                surname: "Smith",
                isActive: true,
                updatedAt: new Date(),
                role: { name: "admin" },
                tenant: { name: "Test Tenant" },
                group: null
            }

            mockPrisma.user.update.mockResolvedValue(updatedUser)

            await updateProfile(req as any, res)

            expect(mockPrisma.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: testUserPayload.userId },
                    data: expect.objectContaining({ name: "Jane" })
                })
            )
            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({ name: "Jane" })
                })
            )
        })

        it("should return 409 if email is already taken", async () => {
            const req = createMockAuthRequest({
                user: testUserPayload,
                body: { email: "taken@example.com" }
            })
            const res = createMockResponse()

            mockPrisma.user.findFirst.mockResolvedValue({ id: "other-user" } as any)

            await updateProfile(req as any, res)

            expect(res.status).toHaveBeenCalledWith(409)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false })
            )
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
                }
            ]

            mockPrisma.user.findMany.mockResolvedValue(mockUsers)

            await getUsers(req as any, res)

            // User removed explicit status(200) call in controller, defaulting to res.json logic
            // Assuming res.json doesn't auto-call status(200) in mock unless chained.
            // But if it's just res.json(), status spy won't be called.
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.arrayContaining([
                        expect.objectContaining({ email: "user1@example.com" })
                    ]),
                })
            )
        })
    })

    describe("updateUserRole", () => {
        it("should update user role successfully", async () => {
            const req = createMockAuthRequest({
                user: testUserPayload,
                params: { id: "user-123" },
                body: { roleName: "member" }
            })
            const res = createMockResponse()

            mockPrisma.user.findFirst.mockResolvedValue({ id: "user-123", role: { name: "guest" } } as any)
            mockPrisma.role.findFirst.mockResolvedValue({ id: "role-member", name: "member" } as any)

            mockPrisma.user.update.mockResolvedValue({
                id: "user-123",
                roleId: "role-member",
                role: { name: "member" }
            } as any)

            await updateUserRole(req as any, res)

            expect(mockPrisma.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: "user-123" },
                    data: { roleId: "role-member" }
                })
            )
            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: true })
            )
        })

        it("should return 400 if role not found", async () => {
            const req = createMockAuthRequest({
                user: testUserPayload,
                params: { id: "user-123" },
                body: { roleName: "invalid" }
            })
            const res = createMockResponse()

            mockPrisma.user.findFirst.mockResolvedValue({ id: "user-123", role: { name: "member" } } as any)
            mockPrisma.role.findFirst.mockResolvedValue(null)

            await updateUserRole(req as any, res)

            expect(res.status).toHaveBeenCalledWith(400)
        })
    })

    describe("deleteUser", () => {
        it("should delete user successfully", async () => {
            const req = createMockAuthRequest({
                user: testUserPayload,
                params: { id: "user-123" }
            })
            const res = createMockResponse()

            mockPrisma.user.findFirst.mockResolvedValue({ id: "user-123", role: { name: "member" } } as any)
            mockPrisma.user.delete.mockResolvedValue({ id: "user-123" } as any)

            await deleteUser(req as any, res)

            expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: "user-123" } })
            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: true })
            )
        })

        it("should throw error if user not found", async () => {
            const req = createMockAuthRequest({
                user: testUserPayload,
                params: { id: "nonexistent" }
            })
            const res = createMockResponse()

            mockPrisma.user.findFirst.mockResolvedValue(null)

            await expect(deleteUser(req as any, res)).rejects.toThrow()
        })
    })

    describe("getAllUsers", () => {
        it("should return all users in tenant for admin", async () => {
            const req = createMockAuthRequest({ user: testUserPayload })
            const res = createMockResponse()

            const mockUsers = [{ id: "user-1", email: "test@example.com" }]
            mockPrisma.user.findMany.mockResolvedValue(mockUsers)

            await getAllUsers(req as any, res)

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: mockUsers }))
        })
    })

    describe("approveUser", () => {
        it("should approve a user successfully", async () => {
            const req = createMockAuthRequest({ user: testUserPayload, params: { id: "user-123" } })
            const res = createMockResponse()

            mockPrisma.user.findFirst.mockResolvedValue({ id: "user-123", role: { name: "member" } } as any)
            mockPrisma.user.update.mockResolvedValue({ id: "user-123", isActive: true, role: { name: "member" } } as any)

            await approveUser(req as any, res)

            expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: "user-123" },
                data: { isActive: true }
            }))
            expect(res.status).toHaveBeenCalledWith(200)
        })
    })

    describe("blockUser", () => {
        it("should block a user successfully", async () => {
            const req = createMockAuthRequest({ user: testUserPayload, params: { id: "user-123" } })
            const res = createMockResponse()

            mockPrisma.user.findFirst.mockResolvedValue({ id: "user-123", role: { name: "member" } } as any)
            mockPrisma.user.update.mockResolvedValue({ id: "user-123", isActive: false, role: { name: "member" } } as any)

            await blockUser(req as any, res)

            expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: "user-123" },
                data: { isActive: false }
            }))
            expect(res.status).toHaveBeenCalledWith(200)
        })
    })

    describe("unblockUser", () => {
        it("should unblock a user successfully", async () => {
            const req = createMockAuthRequest({ user: testUserPayload, params: { id: "user-123" } })
            const res = createMockResponse()

            mockPrisma.user.findFirst.mockResolvedValue({ id: "user-123", role: { name: "member" } } as any)
            mockPrisma.user.update.mockResolvedValue({ id: "user-123", isActive: true, role: { name: "member" } } as any)

            await unblockUser(req as any, res)

            expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: "user-123" },
                data: { isActive: true }
            }))
            expect(res.status).toHaveBeenCalledWith(200)
        })
    })

    describe("assignUserToGroup", () => {
        it("should assign user to group successfully", async () => {
            const req = createMockAuthRequest({
                user: testUserPayload,
                params: { id: "user-123" },
                body: { groupId: "group-123" }
            })
            const res = createMockResponse()

            mockPrisma.user.findFirst.mockResolvedValue({ id: "user-123", role: { name: "member" } } as any)
            mockPrisma.group.findFirst.mockResolvedValue({ id: "group-123" } as any)
            mockPrisma.user.update.mockResolvedValue({ id: "user-123", groupId: "group-123", role: { name: "member" } } as any)

            await assignUserToGroup(req as any, res)

            expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: "user-123" },
                data: { groupId: "group-123" }
            }))
            expect(res.status).toHaveBeenCalledWith(200)
        })
    })
})
