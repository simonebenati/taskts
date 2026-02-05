import { Router } from "express"
import { getProfile, updateProfile, getUsers, getAllUsers, updateUserRole, deleteUser, approveUser, blockUser, unblockUser, assignUserToGroup } from "../controllers/user.controller.js"
import { authMiddleware } from "../middleware/auth.middleware.js"
import { tenantMiddleware } from "../middleware/tenant.middleware.js"
import { validate, validateParams } from "../middleware/validate.middleware.js"

const userRouter = Router()

// Validation schemas
const updateProfileSchema = {
    name: { required: false, type: "string" as const, minLength: 1, maxLength: 50 },
    surname: { required: false, type: "string" as const, minLength: 1, maxLength: 50 },
    email: { required: false, type: "email" as const, maxLength: 255 }
}

// All routes are protected - using type assertions for middleware compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
userRouter.use(authMiddleware as any)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
userRouter.use(tenantMiddleware as any)

// Get current user's profile
// eslint-disable-next-line @typescript-eslint/no-explicit-any
userRouter.get("/me", getProfile as any)

// Update current user's profile
// eslint-disable-next-line @typescript-eslint/no-explicit-any
userRouter.put("/me", validate(updateProfileSchema), updateProfile as any)

// Get all users in tenant (for task assignment) - only active users
// eslint-disable-next-line @typescript-eslint/no-explicit-any
userRouter.get("/", getUsers as any)

// Get all users including inactive (Admin only)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
userRouter.get("/all", getAllUsers as any)

// Approve user (Admin only)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
userRouter.put("/:id/approve", validateParams("id"), approveUser as any)

// Block user (Admin only)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
userRouter.put("/:id/block", validateParams("id"), blockUser as any)

// Unblock user (Admin only)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
userRouter.put("/:id/unblock", validateParams("id"), unblockUser as any)

// Assign user to group (Admin only)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
userRouter.put("/:id/group", validateParams("id"), assignUserToGroup as any)

// Update user role (protected by endpoint logic, but should also ideally check for admin role in middleware)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
userRouter.put("/:id/role", validateParams("id"), updateUserRole as any)

// Delete user
// eslint-disable-next-line @typescript-eslint/no-explicit-any
userRouter.delete("/:id", validateParams("id"), deleteUser as any)

export default userRouter