import { Router } from "express"
import { getProfile, getUsers } from "../controllers/user.controller.js"
import { authMiddleware } from "../middleware/auth.middleware.js"
import { tenantMiddleware } from "../middleware/tenant.middleware.js"

const userRouter = Router()

// All routes are protected - using type assertions for middleware compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
userRouter.use(authMiddleware as any)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
userRouter.use(tenantMiddleware as any)

// Get current user's profile
// eslint-disable-next-line @typescript-eslint/no-explicit-any
userRouter.get("/me", getProfile as any)

// Get all users in tenant (for task assignment)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
userRouter.get("/", getUsers as any)

export default userRouter