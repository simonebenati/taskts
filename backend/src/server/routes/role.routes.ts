import { Router } from "express"
import { createRole, getRoles, updateRole, deleteRole } from "../controllers/role.controller.js"
import { authMiddleware } from "../middleware/auth.middleware.js"
import { tenantMiddleware } from "../middleware/tenant.middleware.js"
import { validate, validateParams } from "../middleware/validate.middleware.js"

const roleRouter = Router()

// Validation schemas
const roleSchema = {
    name: { required: true, type: "string" as const, minLength: 1, maxLength: 50 }
}

// All routes are protected - using type assertions for middleware compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
roleRouter.use(authMiddleware as any)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
roleRouter.use(tenantMiddleware as any)

// Routes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
roleRouter.get("/", getRoles as any)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
roleRouter.post("/", validate(roleSchema), createRole as any)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
roleRouter.put("/:id", validateParams("id"), validate(roleSchema), updateRole as any)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
roleRouter.delete("/:id", validateParams("id"), deleteRole as any)

export default roleRouter
