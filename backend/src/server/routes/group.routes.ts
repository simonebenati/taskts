import { Router } from "express"
import { createGroup, getGroups, updateGroup, deleteGroup } from "../controllers/group.controller.js"
import { authMiddleware } from "../middleware/auth.middleware.js"
import { tenantMiddleware } from "../middleware/tenant.middleware.js"
import { validate, validateParams } from "../middleware/validate.middleware.js"

const groupRouter = Router()

// Validation schemas
const createGroupSchema = {
    name: { required: true, type: "string" as const, minLength: 1, maxLength: 100 },
    description: { required: false, type: "string" as const, maxLength: 500 }
}

const updateGroupSchema = {
    name: { required: false, type: "string" as const, minLength: 1, maxLength: 100 },
    description: { required: false, type: "string" as const, maxLength: 500 }
}

// All routes are protected
// eslint-disable-next-line @typescript-eslint/no-explicit-any
groupRouter.use(authMiddleware as any)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
groupRouter.use(tenantMiddleware as any)

// Get all groups in tenant
// eslint-disable-next-line @typescript-eslint/no-explicit-any
groupRouter.get("/", getGroups as any)

// Create group (Admin only)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
groupRouter.post("/", validate(createGroupSchema), createGroup as any)

// Update group (Admin only)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
groupRouter.put("/:id", validateParams("id"), validate(updateGroupSchema), updateGroup as any)

// Delete group (Admin only)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
groupRouter.delete("/:id", validateParams("id"), deleteGroup as any)

export default groupRouter
