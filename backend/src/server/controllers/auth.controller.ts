import { type Request, type Response } from "express"
import { prisma } from "../../db/bootstrap.js"
import { type LoginBody, type RegisterBody, type RefreshBody, type AuthResponse } from "../types/auth.types.js"
import {
    hashPassword,
    verifyPassword,
    generateAccessToken,
    generateRefreshToken,
    getRefreshTokenExpiry,
    getAccessTokenExpirySeconds
} from "../utils/crypto.utils.js"
import { notFoundError, unauthorizedError, conflictError } from "../middleware/error.middleware.js"

/**
 * Registers a new user in the system.
 * User must join an existing tenant with an existing role.
 * 
 * @param req - Express request with RegisterBody in body
 * @param res - Express response object
 */
export async function register(
    req: Request<object, AuthResponse, RegisterBody>,
    res: Response<AuthResponse>
): Promise<void> {
    const { email, name, surname, password, tenantId } = req.body

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, isActive: true }
    })

    if (!tenant) {
        throw notFoundError("Tenant")
    }

    if (!tenant.isActive) {
        throw conflictError("Cannot register to an inactive tenant")
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true }
    })

    if (existingUser) {
        throw conflictError("A user with this email already exists")
    }

    // Get default "member" role for this tenant (create if doesn't exist)
    let memberRole = await prisma.role.findFirst({
        where: { tenantId, name: "member" },
        select: { id: true }
    })

    if (!memberRole) {
        memberRole = await prisma.role.create({
            data: { tenantId, name: "member" },
            select: { id: true }
        })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
        data: {
            email,
            name,
            surname,
            password: hashedPassword,
            tenantId,
            roleId: memberRole.id
        },
        select: {
            id: true,
            email: true,
            name: true,
            surname: true,
            tenantId: true,
            role: { select: { name: true } }
        }
    })

    // Generate tokens
    const accessToken = generateAccessToken({
        userId: user.id,
        tenantId: user.tenantId,
        roleId: memberRole.id,
        roleName: user.role.name
    })

    const refreshTokenValue = generateRefreshToken()

    // Store refresh token
    await prisma.refreshToken.create({
        data: {
            token: refreshTokenValue,
            userId: user.id,
            expiresAt: getRefreshTokenExpiry()
        }
    })

    res.status(201).json({
        accessToken,
        refreshToken: refreshTokenValue,
        expiresIn: getAccessTokenExpirySeconds(),
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            surname: user.surname,
            tenantId: user.tenantId,
            roleName: user.role.name
        }
    })
}

/**
 * Authenticates a user and returns tokens.
 * 
 * @param req - Express request with LoginBody in body
 * @param res - Express response object
 */
export async function login(
    req: Request<object, AuthResponse, LoginBody>,
    res: Response<AuthResponse>
): Promise<void> {
    const { email, password } = req.body

    // Find user with role info
    const user = await prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
            name: true,
            surname: true,
            password: true,
            isActive: true,
            tenantId: true,
            roleId: true,
            role: { select: { name: true } },
            tenant: { select: { isActive: true } }
        }
    })

    if (!user) {
        throw unauthorizedError("Invalid email or password")
    }

    if (!user.isActive) {
        throw unauthorizedError("Account is deactivated")
    }

    if (!user.tenant.isActive) {
        throw unauthorizedError("Tenant is inactive")
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password)

    if (!isValidPassword) {
        throw unauthorizedError("Invalid email or password")
    }

    // Generate tokens
    const accessToken = generateAccessToken({
        userId: user.id,
        tenantId: user.tenantId,
        roleId: user.roleId,
        roleName: user.role.name
    })

    const refreshTokenValue = generateRefreshToken()

    // Store refresh token
    await prisma.refreshToken.create({
        data: {
            token: refreshTokenValue,
            userId: user.id,
            expiresAt: getRefreshTokenExpiry()
        }
    })

    res.status(200).json({
        accessToken,
        refreshToken: refreshTokenValue,
        expiresIn: getAccessTokenExpirySeconds(),
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            surname: user.surname,
            tenantId: user.tenantId,
            roleName: user.role.name
        }
    })
}

/**
 * Refreshes an access token using a valid refresh token.
 * 
 * @param req - Express request with RefreshBody in body
 * @param res - Express response object
 */
export async function refresh(
    req: Request<object, AuthResponse, RefreshBody>,
    res: Response<AuthResponse>
): Promise<void> {
    const { refreshToken: tokenValue } = req.body

    // Find refresh token with user data
    const storedToken = await prisma.refreshToken.findUnique({
        where: { token: tokenValue },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    surname: true,
                    isActive: true,
                    tenantId: true,
                    roleId: true,
                    role: { select: { name: true } },
                    tenant: { select: { isActive: true } }
                }
            }
        }
    })

    if (!storedToken) {
        throw unauthorizedError("Invalid refresh token")
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
        // Delete expired token
        await prisma.refreshToken.delete({ where: { id: storedToken.id } })
        throw unauthorizedError("Refresh token has expired")
    }

    const { user } = storedToken

    if (!user.isActive) {
        throw unauthorizedError("Account is deactivated")
    }

    if (!user.tenant.isActive) {
        throw unauthorizedError("Tenant is inactive")
    }

    // Delete old refresh token (token rotation)
    await prisma.refreshToken.delete({ where: { id: storedToken.id } })

    // Generate new tokens
    const accessToken = generateAccessToken({
        userId: user.id,
        tenantId: user.tenantId,
        roleId: user.roleId,
        roleName: user.role.name
    })

    const newRefreshToken = generateRefreshToken()

    // Store new refresh token
    await prisma.refreshToken.create({
        data: {
            token: newRefreshToken,
            userId: user.id,
            expiresAt: getRefreshTokenExpiry()
        }
    })

    res.status(200).json({
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: getAccessTokenExpirySeconds(),
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            surname: user.surname,
            tenantId: user.tenantId,
            roleName: user.role.name
        }
    })
}

/**
 * Logs out a user by invalidating their refresh token.
 * 
 * @param req - Express request with RefreshBody in body
 * @param res - Express response object
 */
export async function logout(
    req: Request<object, { success: boolean; message: string }, RefreshBody>,
    res: Response<{ success: boolean; message: string }>
): Promise<void> {
    const { refreshToken: tokenValue } = req.body

    // Delete refresh token if it exists
    const deleted = await prisma.refreshToken.deleteMany({
        where: { token: tokenValue }
    })

    if (deleted.count === 0) {
        // Token doesn't exist, but we still return success
        // to prevent token enumeration attacks
    }

    res.status(200).json({
        success: true,
        message: "Successfully logged out"
    })
}
