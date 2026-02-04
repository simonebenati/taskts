import { Router } from "express"
import { createTenant, getTenant, updateTenant } from "../controllers/tenant.controller.js"
import { authMiddleware } from "../middleware/auth.middleware.js"
import { tenantMiddleware } from "../middleware/tenant.middleware.js"
import { validate } from "../middleware/validate.middleware.js"

const tenantRouter = Router()

// Validation schemas
const createTenantSchema = {
    tenantName: { required: true, type: "string" as const, minLength: 1, maxLength: 100 },
    adminEmail: { required: true, type: "email" as const, maxLength: 255 },
    adminName: { required: true, type: "string" as const, minLength: 1, maxLength: 50 },
    adminSurname: { required: true, type: "string" as const, minLength: 1, maxLength: 50 },
    adminPassword: { required: true, type: "string" as const, minLength: 8, maxLength: 128 }
}

const updateTenantSchema = {
    name: { required: false, type: "string" as const, minLength: 1, maxLength: 100 },
    subscription: { required: false, type: "string" as const, maxLength: 20 },
    paymentMethod: { required: false, type: "string" as const, maxLength: 50 }
}

// Public route - create tenant (signup)
tenantRouter.post("/", validate(createTenantSchema), createTenant)

// Protected routes - using type assertions for middleware compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authMw = authMiddleware as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tenantMw = tenantMiddleware as any

tenantRouter.get("/me", authMw, tenantMw, getTenant as any)
tenantRouter.put("/me", authMw, tenantMw, validate(updateTenantSchema), updateTenant as any)

export default tenantRouter
