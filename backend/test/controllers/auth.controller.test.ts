/**
 * Unit tests for Auth Controller
 */
import { mockPrisma, resetMocks } from "../mocks/prisma.mock.js"
import { createMockRequest, createMockResponse } from "../mocks/express.mock.js"
import { register, login, logout, refresh } from "../../src/server/controllers/auth.controller.js"
import * as cryptoUtils from "../../src/server/utils/crypto.utils.js"
import type { RegisterBody, LoginBody, RefreshBody } from "../../src/server/types/auth.types.js"

// Mock the crypto utilities
jest.mock("../../src/server/utils/crypto.utils.js", () => ({
    hashPassword: jest.fn(),
    verifyPassword: jest.fn(),
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    getRefreshTokenExpiry: jest.fn(),
    getAccessTokenExpirySeconds: jest.fn(),
}))

describe("Auth Controller", () => {
    beforeEach(() => {
        resetMocks()
        jest.clearAllMocks()
    })

    describe("register", () => {
        const registerBody: RegisterBody = {
            email: "test@example.com",
            name: "John",
            surname: "Doe",
            password: "SecurePass123!",
            tenantId: "tenant-123",
        }

        it("should register a new user successfully", async () => {
            // Arrange
            const req = createMockRequest({ body: registerBody })
            const res = createMockResponse()

            mockPrisma.tenant.findUnique.mockResolvedValue({ id: "tenant-123", isActive: true })
            mockPrisma.user.findUnique.mockResolvedValue(null) // No existing user
            mockPrisma.role.findFirst.mockResolvedValue({ id: "role-123" })
            mockPrisma.user.create.mockResolvedValue({
                id: "user-123",
                email: registerBody.email,
                name: registerBody.name,
                surname: registerBody.surname,
                tenantId: registerBody.tenantId,
                role: { name: "member" },
            })
            mockPrisma.refreshToken.create.mockResolvedValue({})

                ; (cryptoUtils.hashPassword as jest.Mock).mockResolvedValue("hashed-password")
                ; (cryptoUtils.generateAccessToken as jest.Mock).mockReturnValue("access-token")
                ; (cryptoUtils.generateRefreshToken as jest.Mock).mockReturnValue("refresh-token")
                ; (cryptoUtils.getRefreshTokenExpiry as jest.Mock).mockReturnValue(new Date())
                ; (cryptoUtils.getAccessTokenExpirySeconds as jest.Mock).mockReturnValue(900)

            // Act
            await register(req as any, res)

            // Assert
            expect(res.status).toHaveBeenCalledWith(201)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    accessToken: "",
                    refreshToken: "",
                })
            )
        })

        it("should return error when tenant not found", async () => {
            const req = createMockRequest({ body: registerBody })
            const res = createMockResponse()

            mockPrisma.tenant.findUnique.mockResolvedValue(null)

            await expect(register(req as any, res)).rejects.toThrow()
        })

        it("should return error when tenant is inactive", async () => {
            const req = createMockRequest({ body: registerBody })
            const res = createMockResponse()

            mockPrisma.tenant.findUnique.mockResolvedValue({ id: "tenant-123", isActive: false })

            await expect(register(req as any, res)).rejects.toThrow()
        })

        it("should return error when email already exists", async () => {
            const req = createMockRequest({ body: registerBody })
            const res = createMockResponse()

            mockPrisma.tenant.findUnique.mockResolvedValue({ id: "tenant-123", isActive: true })
            mockPrisma.user.findUnique.mockResolvedValue({ id: "existing-user" })

            await expect(register(req as any, res)).rejects.toThrow()
        })

        it("should create member role if it does not exist", async () => {
            const req = createMockRequest({ body: registerBody })
            const res = createMockResponse()

            mockPrisma.tenant.findUnique.mockResolvedValue({ id: "tenant-123", isActive: true })
            mockPrisma.user.findUnique.mockResolvedValue(null)
            mockPrisma.role.findFirst.mockResolvedValue(null) // Role doesn't exist
            mockPrisma.role.create.mockResolvedValue({ id: "new-role-123" })
            mockPrisma.user.create.mockResolvedValue({
                id: "user-123",
                email: registerBody.email,
                name: registerBody.name,
                surname: registerBody.surname,
                tenantId: registerBody.tenantId,
                role: { name: "member" },
            })
            mockPrisma.refreshToken.create.mockResolvedValue({})

                ; (cryptoUtils.hashPassword as jest.Mock).mockResolvedValue("hashed-password")
                ; (cryptoUtils.generateAccessToken as jest.Mock).mockReturnValue("access-token")
                ; (cryptoUtils.generateRefreshToken as jest.Mock).mockReturnValue("refresh-token")
                ; (cryptoUtils.getRefreshTokenExpiry as jest.Mock).mockReturnValue(new Date())
                ; (cryptoUtils.getAccessTokenExpirySeconds as jest.Mock).mockReturnValue(900)

            await register(req as any, res)

            expect(mockPrisma.role.create).toHaveBeenCalled()
            expect(res.status).toHaveBeenCalledWith(201)
        })
    })

    describe("login", () => {
        const loginBody: LoginBody = {
            email: "test@example.com",
            password: "SecurePass123!",
        }

        it("should login user successfully with valid credentials", async () => {
            const req = createMockRequest({ body: loginBody })
            const res = createMockResponse()

            mockPrisma.user.findUnique.mockResolvedValue({
                id: "user-123",
                email: loginBody.email,
                name: "John",
                surname: "Doe",
                password: "hashed-password",
                isActive: true,
                tenantId: "tenant-123",
                roleId: "role-123",
                role: { name: "member" },
                tenant: { isActive: true },
            })
            mockPrisma.refreshToken.create.mockResolvedValue({})

                ; (cryptoUtils.verifyPassword as jest.Mock).mockResolvedValue(true)
                ; (cryptoUtils.generateAccessToken as jest.Mock).mockReturnValue("access-token")
                ; (cryptoUtils.generateRefreshToken as jest.Mock).mockReturnValue("refresh-token")
                ; (cryptoUtils.getRefreshTokenExpiry as jest.Mock).mockReturnValue(new Date())
                ; (cryptoUtils.getAccessTokenExpirySeconds as jest.Mock).mockReturnValue(900)

            await login(req as any, res)

            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    accessToken: "access-token",
                    refreshToken: "refresh-token",
                })
            )
        })

        it("should return error with invalid password", async () => {
            const req = createMockRequest({ body: loginBody })
            const res = createMockResponse()

            mockPrisma.user.findUnique.mockResolvedValue({
                id: "user-123",
                email: loginBody.email,
                password: "hashed-password",
                isActive: true,
                tenant: { isActive: true },
            })

                ; (cryptoUtils.verifyPassword as jest.Mock).mockResolvedValue(false)

            await expect(login(req as any, res)).rejects.toThrow()
        })

        it("should return error when user not found", async () => {
            const req = createMockRequest({ body: loginBody })
            const res = createMockResponse()

            mockPrisma.user.findUnique.mockResolvedValue(null)

            await expect(login(req as any, res)).rejects.toThrow()
        })

        it("should return error when user is inactive", async () => {
            const req = createMockRequest({ body: loginBody })
            const res = createMockResponse()

            mockPrisma.user.findUnique.mockResolvedValue({
                id: "user-123",
                email: loginBody.email,
                password: "hashed-password",
                isActive: false,
                tenant: { isActive: true },
            })

            await expect(login(req as any, res)).rejects.toThrow()
        })

        it("should return error when tenant is inactive", async () => {
            const req = createMockRequest({ body: loginBody })
            const res = createMockResponse()

            mockPrisma.user.findUnique.mockResolvedValue({
                id: "user-123",
                email: loginBody.email,
                password: "hashed-password",
                isActive: true,
                tenant: { isActive: false },
            })

            await expect(login(req as any, res)).rejects.toThrow()
        })
    })

    describe("refresh", () => {
        const refreshBody: RefreshBody = {
            refreshToken: "valid-refresh-token",
        }

        it("should refresh tokens successfully", async () => {
            const req = createMockRequest({ body: refreshBody })
            const res = createMockResponse()

            const futureDate = new Date(Date.now() + 86400000) // Tomorrow
            mockPrisma.refreshToken.findUnique.mockResolvedValue({
                id: "token-id",
                token: refreshBody.refreshToken,
                expiresAt: futureDate,
                user: {
                    id: "user-123",
                    email: "test@example.com",
                    name: "John",
                    surname: "Doe",
                    isActive: true,
                    tenantId: "tenant-123",
                    roleId: "role-123",
                    role: { name: "member" },
                    tenant: { isActive: true },
                },
            })
            mockPrisma.refreshToken.delete.mockResolvedValue({})
            mockPrisma.refreshToken.create.mockResolvedValue({})

                ; (cryptoUtils.generateAccessToken as jest.Mock).mockReturnValue("new-access-token")
                ; (cryptoUtils.generateRefreshToken as jest.Mock).mockReturnValue("new-refresh-token")
                ; (cryptoUtils.getRefreshTokenExpiry as jest.Mock).mockReturnValue(new Date())
                ; (cryptoUtils.getAccessTokenExpirySeconds as jest.Mock).mockReturnValue(900)

            await refresh(req as any, res)

            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    accessToken: "new-access-token",
                    refreshToken: "new-refresh-token",
                })
            )
        })

        it("should return error when refresh token not found", async () => {
            const req = createMockRequest({ body: refreshBody })
            const res = createMockResponse()

            mockPrisma.refreshToken.findUnique.mockResolvedValue(null)

            await expect(refresh(req as any, res)).rejects.toThrow()
        })

        it("should return error when refresh token is expired", async () => {
            const req = createMockRequest({ body: refreshBody })
            const res = createMockResponse()

            const pastDate = new Date(Date.now() - 86400000) // Yesterday
            mockPrisma.refreshToken.findUnique.mockResolvedValue({
                id: "token-id",
                token: refreshBody.refreshToken,
                expiresAt: pastDate,
                user: {
                    id: "user-123",
                    isActive: true,
                    tenant: { isActive: true },
                },
            })
            mockPrisma.refreshToken.delete.mockResolvedValue({})

            await expect(refresh(req as any, res)).rejects.toThrow()
        })

        it("should return error when user is deactivated", async () => {
            const req = createMockRequest({ body: refreshBody })
            const res = createMockResponse()

            const futureDate = new Date(Date.now() + 86400000)
            mockPrisma.refreshToken.findUnique.mockResolvedValue({
                id: "token-id",
                token: refreshBody.refreshToken,
                expiresAt: futureDate,
                user: {
                    id: "user-123",
                    isActive: false,
                    tenant: { isActive: true },
                },
            })

            await expect(refresh(req as any, res)).rejects.toThrow()
        })

        it("should return error when tenant is inactive during refresh", async () => {
            const req = createMockRequest({ body: refreshBody })
            const res = createMockResponse()

            const futureDate = new Date(Date.now() + 86400000)
            mockPrisma.refreshToken.findUnique.mockResolvedValue({
                id: "token-id",
                token: refreshBody.refreshToken,
                expiresAt: futureDate,
                user: {
                    id: "user-123",
                    isActive: true,
                    tenant: { isActive: false },
                },
            })

            await expect(refresh(req as any, res)).rejects.toThrow()
        })
    })

    describe("logout", () => {
        it("should logout successfully", async () => {
            const req = createMockRequest({ body: { refreshToken: "token-123" } })
            const res = createMockResponse()

            mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 })

            await logout(req as any, res)

            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Successfully logged out",
            })
        })

        it("should return success even when token does not exist", async () => {
            const req = createMockRequest({ body: { refreshToken: "nonexistent-token" } })
            const res = createMockResponse()

            mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 })

            await logout(req as any, res)

            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Successfully logged out",
            })
        })
    })
})
