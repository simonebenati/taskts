/**
 * Unit tests for Role Controller
 */
import { mockPrisma, resetMocks } from "../mocks/prisma.mock.js"
import { createMockAuthRequest, createMockResponse, testUserPayload } from "../mocks/express.mock.js"
import { createRole, getRoles, updateRole, deleteRole } from "../../src/server/controllers/role.controller.js"

describe("Role Controller", () => {
    beforeEach(() => {
        resetMocks()
        jest.clearAllMocks()
    })

    describe("createRole", () => {
        it("should create a role when user is admin", async () => {
            const req = createMockAuthRequest({
                body: { name: "reviewer" },
                user: testUserPayload, // admin role
            })
            const res = createMockResponse()

            const mockRole = {
                id: "role-123",
                name: "reviewer",
                tenantId: testUserPayload.tenantId,
            }

            mockPrisma.role.create.mockResolvedValue(mockRole)

            await createRole(req as any, res)

            expect(res.status).toHaveBeenCalledWith(201)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        name: "reviewer",
                    }),
                })
            )
        })

        it("should throw error when user is not admin", async () => {
            const memberPayload = { ...testUserPayload, roleName: "member" }
            const req = createMockAuthRequest({
                body: { name: "reviewer" },
                user: memberPayload,
            })
            const res = createMockResponse()

            await expect(createRole(req as any, res)).rejects.toThrow()
        })
    })

    describe("getRoles", () => {
        it("should return all roles for tenant", async () => {
            const req = createMockAuthRequest({ user: testUserPayload })
            const res = createMockResponse()

            const mockRoles = [
                { id: "role-1", name: "admin", tenantId: testUserPayload.tenantId, _count: { users: 1 } },
                { id: "role-2", name: "member", tenantId: testUserPayload.tenantId, _count: { users: 5 } },
            ]

            mockPrisma.role.findMany.mockResolvedValue(mockRoles)

            await getRoles(req as any, res)

            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.arrayContaining([
                        expect.objectContaining({ name: "admin", userCount: 1 }),
                        expect.objectContaining({ name: "member", userCount: 5 }),
                    ]),
                })
            )
        })
    })

    describe("updateRole", () => {
        it("should update a custom role when user is admin", async () => {
            const req = createMockAuthRequest({
                body: { name: "updated-role" },
                user: testUserPayload,
                params: { id: "role-123" },
            })
            const res = createMockResponse()

            mockPrisma.role.findFirst.mockResolvedValue({
                id: "role-123",
                name: "custom-role",
                tenantId: testUserPayload.tenantId,
            })

            mockPrisma.role.update.mockResolvedValue({
                id: "role-123",
                name: "updated-role",
                tenantId: testUserPayload.tenantId,
            })

            await updateRole(req as any, res)

            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        name: "updated-role",
                    }),
                })
            )
        })

        it("should throw error when trying to update built-in role", async () => {
            const req = createMockAuthRequest({
                body: { name: "new-name" },
                user: testUserPayload,
                params: { id: "role-123" },
            })
            const res = createMockResponse()

            mockPrisma.role.findFirst.mockResolvedValue({
                id: "role-123",
                name: "admin", // Built-in role
                tenantId: testUserPayload.tenantId,
            })

            await expect(updateRole(req as any, res)).rejects.toThrow()
        })
    })

    describe("deleteRole", () => {
        it("should delete a custom role with no users", async () => {
            const req = createMockAuthRequest({
                user: testUserPayload,
                params: { id: "role-123" },
            })
            const res = createMockResponse()

            mockPrisma.role.findFirst.mockResolvedValue({
                id: "role-123",
                name: "custom-role",
                tenantId: testUserPayload.tenantId,
                _count: { users: 0 },
            })

            mockPrisma.role.delete.mockResolvedValue({})

            await deleteRole(req as any, res)

            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Role deleted successfully",
            })
        })

        it("should throw error when role has users", async () => {
            const req = createMockAuthRequest({
                user: testUserPayload,
                params: { id: "role-123" },
            })
            const res = createMockResponse()

            mockPrisma.role.findFirst.mockResolvedValue({
                id: "role-123",
                name: "custom-role",
                tenantId: testUserPayload.tenantId,
                _count: { users: 3 },
            })

            await expect(deleteRole(req as any, res)).rejects.toThrow()
        })
    })
})
