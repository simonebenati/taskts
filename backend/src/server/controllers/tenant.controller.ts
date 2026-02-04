import { type Request, type Response } from "express"
import { prisma } from "../../db/bootstrap.js"
import { type AuthenticatedRequest } from "../types/auth.types.js"
import { type CreateTenantBody, type UpdateTenantBody, type TenantResponse } from "../types/tenant.types.js"
import { hashPassword, generateAccessToken, generateRefreshToken, getRefreshTokenExpiry, getAccessTokenExpirySeconds } from "../utils/crypto.utils.js"
import { forbiddenError } from "../middleware/error.middleware.js"
import { type AuthResponse } from "../types/auth.types.js"

/**
 * Creates a new tenant with an initial admin user.
 * This is the signup flow for new organizations.
 * 
 * @param req - Express request with CreateTenantBody in body
 * @param res - Express response object
 */
export async function createTenant(
    req: Request<object, AuthResponse, CreateTenantBody>,
    res: Response<AuthResponse>
): Promise<void> {
    const { tenantName, adminEmail, adminName, adminSurname, adminPassword } = req.body

    try {

        // Create tenant with admin role and user in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create tenant
            const tenant = await tx.tenant.create({
                data: { name: tenantName }
            })

            // Create admin role
            const adminRole = await tx.role.create({
                data: {
                    tenantId: tenant.id,
                    name: "admin"
                }
            })

            // Create member role (for future users)
            await tx.role.create({
                data: {
                    tenantId: tenant.id,
                    name: "member"
                }
            })

            // Hash password
            const hashedPassword = await hashPassword(adminPassword)

            // Create admin user
            const adminUser = await tx.user.create({
                data: {
                    email: adminEmail,
                    name: adminName,
                    surname: adminSurname,
                    password: hashedPassword,
                    tenantId: tenant.id,
                    roleId: adminRole.id
                }
            })

            // Generate refresh token
            const refreshTokenValue = generateRefreshToken()
            await tx.refreshToken.create({
                data: {
                    token: refreshTokenValue,
                    userId: adminUser.id,
                    expiresAt: getRefreshTokenExpiry()
                }
            })

            return {
                tenant,
                adminUser,
                adminRole,
                refreshToken: refreshTokenValue
            }
        })

        // Generate access token
        const accessToken = generateAccessToken({
            userId: result.adminUser.id,
            tenantId: result.tenant.id,
            roleId: result.adminRole.id,
            roleName: result.adminRole.name
        })

        res.status(201).json({
            accessToken,
            refreshToken: result.refreshToken,
            expiresIn: getAccessTokenExpirySeconds(),
            user: {
                id: result.adminUser.id,
                email: result.adminUser.email,
                name: result.adminUser.name,
                surname: result.adminUser.surname,
                tenantId: result.tenant.id,
                roleName: result.adminRole.name
            }
        })
    } catch (error) {
        // Log error to file for debugging
        const fs = await import('fs');
        fs.writeFileSync('backend-error.log', JSON.stringify(error, Object.getOwnPropertyNames(error)) + '\n' + String(error));
        throw error;
    }
}

/**
 * Gets the current tenant details.
 * 
 * @param req - Authenticated Express request
 * @param res - Express response object
 */
export async function getTenant(
    req: AuthenticatedRequest,
    res: Response<{ success: true; data: TenantResponse }>
): Promise<void> {
    const { tenantId } = req.user

    const tenant = await prisma.tenant.findUniqueOrThrow({
        where: { id: tenantId }
    })

    res.status(200).json({
        success: true,
        data: {
            id: tenant.id,
            name: tenant.name,
            subscription: tenant.subscription,
            paymentMethod: tenant.paymentMethod,
            isActive: tenant.isActive,
            createdAt: tenant.createdAt,
            updatedAt: tenant.updatedAt
        }
    })
}

/**
 * Updates the current tenant.
 * Only admins can update tenant details.
 * 
 * @param req - Authenticated Express request with UpdateTenantBody in body
 * @param res - Express response object
 */
export async function updateTenant(
    req: AuthenticatedRequest & { body: UpdateTenantBody },
    res: Response<{ success: true; data: TenantResponse }>
): Promise<void> {
    const { tenantId, roleName } = req.user
    const { name, subscription, paymentMethod } = req.body

    // Only admins can update tenant
    if (roleName !== "admin") {
        throw forbiddenError("Only admins can update tenant details")
    }

    const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: {
            ...(name !== undefined && { name }),
            ...(subscription !== undefined && { subscription }),
            ...(paymentMethod !== undefined && { paymentMethod })
        }
    })

    res.status(200).json({
        success: true,
        data: {
            id: tenant.id,
            name: tenant.name,
            subscription: tenant.subscription,
            paymentMethod: tenant.paymentMethod,
            isActive: tenant.isActive,
            createdAt: tenant.createdAt,
            updatedAt: tenant.updatedAt
        }
    })
}
