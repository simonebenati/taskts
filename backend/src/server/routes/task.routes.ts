import { Router } from "express"
import { createTask, getTasks, getTask, updateTask, deleteTask } from "../controllers/task.controller.js"
import { authMiddleware } from "../middleware/auth.middleware.js"
import { tenantMiddleware } from "../middleware/tenant.middleware.js"
import { validate, validateParams } from "../middleware/validate.middleware.js"

const taskRouter = Router({ mergeParams: true }) // To access :boardId from parent router

// Validation schemas
const createTaskSchema = {
  title: { required: true, type: "string" as const, minLength: 1, maxLength: 200 },
  description: { required: false, type: "string" as const, maxLength: 2000 },
  status: { required: false, type: "string" as const, enum: ["TODO", "IN_PROGRESS", "DONE"] as const },
  assigneeId: { required: false, type: "uuid" as const },
  parentTaskId: { required: false, type: "uuid" as const }
}

const updateTaskSchema = {
  title: { required: false, type: "string" as const, minLength: 1, maxLength: 200 },
  description: { required: false, type: "string" as const, maxLength: 2000 },
  status: { required: false, type: "string" as const, enum: ["TODO", "IN_PROGRESS", "DONE"] as const },
  assigneeId: { required: false, type: "uuid" as const },
  parentTaskId: { required: false, type: "uuid" as const }
}

// All routes are protected - using type assertions for middleware compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
taskRouter.use(authMiddleware as any)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
taskRouter.use(tenantMiddleware as any)

// Routes - nested under /boards/:boardId/tasks
// eslint-disable-next-line @typescript-eslint/no-explicit-any
taskRouter.get("/", getTasks as any)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
taskRouter.post("/", validate(createTaskSchema), createTask as any)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
taskRouter.get("/:id", validateParams("id"), getTask as any)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
taskRouter.put("/:id", validateParams("id"), validate(updateTaskSchema), updateTask as any)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
taskRouter.delete("/:id", validateParams("id"), deleteTask as any)

export default taskRouter