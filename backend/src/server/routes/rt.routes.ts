import { Router } from "express"
import { rtUpdates } from "../controllers/rt.controller.js"
import { authMiddleware } from "../middleware/auth.middleware.js"
import { tenantMiddleware } from "../middleware/tenant.middleware.js"

const rtRouter = Router()

// Real-time events endpoint (protected - requires authentication)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
rtRouter.get("/events", authMiddleware as any, tenantMiddleware as any, rtUpdates as any)

export default rtRouter