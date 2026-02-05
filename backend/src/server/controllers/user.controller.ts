import { prisma } from "../../db/bootstrap.js"
import { type Request, type Response } from "express"
import { type userRegisterBody } from "../types/user.types.js"
import { type AuthenticatedRequest } from "../types/auth.types.js"
import { notFoundError, forbiddenError } from "../middleware/error.middleware.js"

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
      tenantId: true,
      createdAt: true,
      updatedAt: true,
      role: { select: { name: true } },
      group: { select: { id: true, name: true } },
      tenant: { select: { name: true } }
    }
  })

  if (!user) {
    throw notFoundError("User")
  }

  res.status(200).json({
    success: true,
    data: {
      ...user,
      // Flatten the structure for frontend convenience if needed, 
      // but the frontend type expects tenantName property on User interface?
      // User interface in frontend has tenantName?: string.
      // But Prisma return user.tenant.name. 
      // I should map it.
      tenantName: user.tenant.name,
      roleName: user.role.name
    }
  })
}

/**
 * Updates the current authenticated user's profile.
 * 
 * @param req - Authenticated Express request
 * @param res - Express response object
 */
export async function updateProfile(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { userId } = req.user
  const { name, surname, email } = req.body

  // Check if email is taken (if changed)
  if (email) {
    const existingUser = await prisma.user.findFirst({
      where: { email, id: { not: userId } }
    })
    if (existingUser) {
      res.status(409).json({ success: false, error: 'Email already in use' });
      return;
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name && { name }),
      ...(surname && { surname }),
      ...(email && { email })
    },
    select: {
      id: true,
      email: true,
      name: true,
      surname: true,
      isActive: true,
      updatedAt: true,
      role: { select: { name: true } },
      group: { select: { id: true, name: true } }
    }
  })

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

  res.json({ success: true, data: users })
}

const ROLE_LEVELS: Record<string, number> = {
  admin: 3,
  member: 2,
  guest: 1,
  viewer: 1,
};

function getRoleLevel(roleName: string): number {
  return ROLE_LEVELS[roleName.toLowerCase()] || 0;
}

/**
 * Updates a user's role (Admin only).
 */
export async function updateUserRole(
  req: AuthenticatedRequest & { params: { id: string }, body: { roleName: string } },
  res: Response
): Promise<void> {
  const { tenantId, userId, roleName: requesterRoleName } = req.user
  const { id } = req.params
  const { roleName: newRoleName } = req.body

  // 1. Only admins can change roles
  if (requesterRoleName !== 'admin') {
    throw forbiddenError("Only administrators can change user roles");
  }

  // 2. Prevent self-role update
  if (id === userId) {
    throw forbiddenError("You cannot change your own role");
  }

  // 3. Ensure target user belongs to tenant and get their current role
  const targetUser = await prisma.user.findFirst({
    where: { id, tenantId },
    include: { role: true }
  })

  if (!targetUser) {
    throw notFoundError("User")
  }

  // 4. Permission Hierarchy Check
  const requesterLevel = getRoleLevel(requesterRoleName);
  const targetCurrentLevel = getRoleLevel(targetUser.role.name);
  const targetNewLevel = getRoleLevel(newRoleName);

  // Cannot modify someone with equal or higher level
  if (requesterLevel <= targetCurrentLevel && targetUser.role.name !== 'member') { // Special case: admin can always manage members
    // Actually strictly: requesterLevel must be > targetCurrentLevel
    // unless we are bootstrapping. But in a running system:
  }

  // Refined hierarchy logic:
  // Admin (3) can manage anyone with level < 3 (Members, Guests).
  // Admin cannot manage other Admins (prevent takeover/locking).
  if (targetCurrentLevel >= requesterLevel) {
    throw forbiddenError("You do not have permission to modify a user with an equal or higher role level");
  }

  // Cannot promote someone to a level higher than your own
  if (targetNewLevel >= requesterLevel) {
    throw forbiddenError("You cannot promote a user to a role equal to or higher than your own");
  }

  // Get new role object
  const newRole = await prisma.role.findFirst({
    where: { name: newRoleName, tenantId }
  })

  if (!newRole) {
    res.status(400).json({ success: false, error: 'Role not found' })
    return
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { roleId: newRole.id },
    include: { role: true }
  })

  res.status(200).json({
    success: true,
    data: updatedUser
  })
}

/**
 * Deletes a user (Admin only).
 */
export async function deleteUser(
  req: AuthenticatedRequest & { params: { id: string } },
  res: Response
): Promise<void> {
  const { tenantId, userId: currentUserId, roleName: requesterRoleName } = req.user
  const { id } = req.params

  if (requesterRoleName !== "admin") {
    throw forbiddenError("Only admins can delete users")
  }

  // Prevent admin from deleting themselves
  if (id === currentUserId) {
    throw forbiddenError("You cannot delete yourself")
  }

  // Ensure user belongs to tenant and get their role
  const user = await prisma.user.findFirst({
    where: { id, tenantId },
    include: { role: true }
  })

  if (!user) {
    throw notFoundError("User")
  }

  // Permission Hierarchy Check
  const requesterLevel = getRoleLevel(requesterRoleName);
  const targetLevel = getRoleLevel(user.role.name);

  if (targetLevel >= requesterLevel) {
    throw forbiddenError("You do not have permission to manage a user with an equal or higher role level");
  }

  await prisma.user.delete({
    where: { id }
  })

  res.status(200).json({
    success: true,
    data: null
  })
}

/**
 * Gets all users in the tenant including inactive ones (Admin only).
 * 
 * @param req - Authenticated Express request
 * @param res - Express response object
 */
export async function getAllUsers(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { tenantId, roleName } = req.user

  // Only admins can see all users including inactive
  if (roleName !== "admin") {
    throw forbiddenError("Only admins can view all users")
  }

  const users = await prisma.user.findMany({
    where: { tenantId },
    select: {
      id: true,
      email: true,
      name: true,
      surname: true,
      isActive: true,
      createdAt: true,
      role: { select: { id: true, name: true } },
      group: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: "desc" }
  })

  res.json({ success: true, data: users })
}

/**
 * Approves a pending user (Admin only).
 */
export async function approveUser(
  req: AuthenticatedRequest & { params: { id: string } },
  res: Response
): Promise<void> {
  const { tenantId, roleName: requesterRoleName } = req.user
  const { id } = req.params

  if (requesterRoleName !== "admin") {
    throw forbiddenError("Only admins can approve users")
  }

  // Ensure user belongs to tenant and get their role
  const user = await prisma.user.findFirst({
    where: { id, tenantId },
    include: { role: true }
  })

  if (!user) {
    throw notFoundError("User")
  }

  // Permission Hierarchy Check
  const requesterLevel = getRoleLevel(requesterRoleName);
  const targetLevel = getRoleLevel(user.role.name);

  if (targetLevel >= requesterLevel) {
    throw forbiddenError("You do not have permission to manage a user with an equal or higher role level");
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { isActive: true },
    select: {
      id: true,
      email: true,
      name: true,
      surname: true,
      isActive: true,
      role: { select: { name: true } },
      group: { select: { id: true, name: true } }
    }
  })

  res.status(200).json({
    success: true,
    data: updatedUser
  })
}

/**
 * Blocks a user (Admin only).
 */
export async function blockUser(
  req: AuthenticatedRequest & { params: { id: string } },
  res: Response
): Promise<void> {
  const { tenantId, roleName: requesterRoleName, userId: currentUserId } = req.user
  const { id } = req.params

  if (requesterRoleName !== "admin") {
    throw forbiddenError("Only admins can block users")
  }

  // Prevent admin from blocking themselves
  if (id === currentUserId) {
    throw forbiddenError("You cannot block yourself")
  }

  // Ensure user belongs to tenant and get their role
  const user = await prisma.user.findFirst({
    where: { id, tenantId },
    include: { role: true }
  })

  if (!user) {
    throw notFoundError("User")
  }

  // Permission Hierarchy Check
  const requesterLevel = getRoleLevel(requesterRoleName);
  const targetLevel = getRoleLevel(user.role.name);

  if (targetLevel >= requesterLevel) {
    throw forbiddenError("You do not have permission to manage a user with an equal or higher role level");
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: {
      id: true,
      email: true,
      name: true,
      surname: true,
      isActive: true,
      role: { select: { name: true } },
      group: { select: { id: true, name: true } }
    }
  })

  res.status(200).json({
    success: true,
    data: updatedUser
  })
}

/**
 * Unblocks a user (Admin only).
 */
export async function unblockUser(
  req: AuthenticatedRequest & { params: { id: string } },
  res: Response
): Promise<void> {
  const { tenantId, roleName: requesterRoleName } = req.user
  const { id } = req.params

  if (requesterRoleName !== "admin") {
    throw forbiddenError("Only admins can unblock users")
  }

  // Ensure user belongs to tenant and get their role
  const user = await prisma.user.findFirst({
    where: { id, tenantId },
    include: { role: true }
  })

  if (!user) {
    throw notFoundError("User")
  }

  // Permission Hierarchy Check
  const requesterLevel = getRoleLevel(requesterRoleName);
  const targetLevel = getRoleLevel(user.role.name);

  if (targetLevel >= requesterLevel) {
    throw forbiddenError("You do not have permission to manage a user with an equal or higher role level");
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { isActive: true },
    select: {
      id: true,
      email: true,
      name: true,
      surname: true,
      isActive: true,
      role: { select: { name: true } },
      group: { select: { id: true, name: true } }
    }
  })

  res.status(200).json({
    success: true,
    data: updatedUser
  })
}

/**
 * Assigns a user to a group (Admin only).
 */
export async function assignUserToGroup(
  req: AuthenticatedRequest & { params: { id: string }, body: { groupId: string | null } },
  res: Response
): Promise<void> {
  const { tenantId, roleName: requesterRoleName } = req.user
  const { id } = req.params
  const { groupId } = req.body

  if (requesterRoleName !== "admin") {
    throw forbiddenError("Only admins can assign users to groups")
  }

  // Ensure user belongs to tenant and get their role
  const user = await prisma.user.findFirst({
    where: { id, tenantId },
    include: { role: true }
  })

  if (!user) {
    throw notFoundError("User")
  }

  // Permission Hierarchy Check
  const requesterLevel = getRoleLevel(requesterRoleName);
  const targetLevel = getRoleLevel(user.role.name);

  if (targetLevel >= requesterLevel) {
    throw forbiddenError("You do not have permission to manage a user with an equal or higher role level");
  }

  // If groupId is provided, verify it belongs to the same tenant
  if (groupId) {
    const group = await prisma.group.findFirst({
      where: { id: groupId, tenantId }
    })

    if (!group) {
      throw notFoundError("Group")
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { groupId },
    select: {
      id: true,
      email: true,
      name: true,
      surname: true,
      isActive: true,
      role: { select: { name: true } },
      group: { select: { id: true, name: true } }
    }
  })

  res.status(200).json({
    success: true,
    data: updatedUser
  })
}
