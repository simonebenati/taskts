import { Router } from "express"
import { createBoard, getBoards, getBoard, updateBoard, deleteBoard } from "../controllers/board.controller.js"
import { authMiddleware } from "../middleware/auth.middleware.js"
import { tenantMiddleware } from "../middleware/tenant.middleware.js"
import { validate, validateParams } from "../middleware/validate.middleware.js"

const boardRouter = Router()

// Validation schemas
const createBoardSchema = {
    name: { required: true, type: "string" as const, minLength: 1, maxLength: 100 },
    description: { required: false, type: "string" as const, maxLength: 1000 }
}

const updateBoardSchema = {
    name: { required: false, type: "string" as const, minLength: 1, maxLength: 100 },
    description: { required: false, type: "string" as const, maxLength: 1000 }
}

// All routes are protected - using type assertions for middleware compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
boardRouter.use(authMiddleware as any)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
boardRouter.use(tenantMiddleware as any)

// Routes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
boardRouter.get("/", getBoards as any)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
boardRouter.post("/", validate(createBoardSchema), createBoard as any)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
boardRouter.get("/:id", validateParams("id"), getBoard as any)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
boardRouter.put("/:id", validateParams("id"), validate(updateBoardSchema), updateBoard as any)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
boardRouter.delete("/:id", validateParams("id"), deleteBoard as any)

export default boardRouter
