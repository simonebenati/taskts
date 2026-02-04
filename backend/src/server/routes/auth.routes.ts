import { Router } from "express"
import { register, login, refresh, logout } from "../controllers/auth.controller.js"
import { validate } from "../middleware/validate.middleware.js"

const authRouter = Router()

// Validation schemas
const registerSchema = {
    email: { required: true, type: "email" as const, maxLength: 255 },
    name: { required: true, type: "string" as const, minLength: 1, maxLength: 50 },
    surname: { required: true, type: "string" as const, minLength: 1, maxLength: 50 },
    password: { required: true, type: "string" as const, minLength: 8, maxLength: 128 },
    tenantId: { required: true, type: "uuid" as const }
}

const loginSchema = {
    email: { required: true, type: "email" as const },
    password: { required: true, type: "string" as const }
}

const refreshSchema = {
    refreshToken: { required: true, type: "string" as const }
}

// Routes
authRouter.post("/register", validate(registerSchema), register)
authRouter.post("/login", validate(loginSchema), login)
authRouter.post("/refresh", validate(refreshSchema), refresh)
authRouter.post("/logout", validate(refreshSchema), logout)

export default authRouter
