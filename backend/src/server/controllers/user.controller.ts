import { prisma } from "../../db/bootstrap.js"
import { type Request, type Response } from "express"
import { type userRegisterBody } from "../types/user.types.js"
import { type AuthenticatedRequest } from "../types/auth.types.js"
import { notFoundError } from "../middleware/error.middleware.js"

/**
 * Gets the current authenticated user's profile.
 * 
 * @param req - Authenticated Express request
 * @param res - Express response object
 */
export async function getProfile(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { userId } = req.user

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      surname: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      role: { select: { name: true } },
      group: { select: { id: true, name: true } }
    }
  })

  if (!user) {
    throw notFoundError("User")
  }

  res.status(200).json({
    success: true,
    data: user
  })
}

/**
 * Gets all users in the tenant.
 * Useful for assigning tasks to users.
 * 
 * @param req - Authenticated Express request
 * @param res - Express response object
 */
export async function getUsers(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { tenantId } = req.user

  const users = await prisma.user.findMany({
    where: { tenantId, isActive: true },
    select: {
      id: true,
      email: true,
      name: true,
      surname: true,
      role: { select: { name: true } },
      group: { select: { id: true, name: true } }
    },
    orderBy: { name: "asc" }
  })

  res.status(200).json({
    success: true,
    data: users
  })
}
