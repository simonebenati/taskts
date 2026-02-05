import express from "express"
import * as https from "https"
import * as fs from "fs"

// Import middleware
import { errorMiddleware } from "./server/middleware/error.middleware.js"

// Import routes
import authRouter from "./server/routes/auth.routes.js"
import tenantRouter from "./server/routes/tenant.routes.js"
import userRouter from "./server/routes/user.routes.js"
import boardRouter from "./server/routes/board.routes.js"
import taskRouter from "./server/routes/task.routes.js"
import roleRouter from "./server/routes/role.routes.js"
import groupRouter from "./server/routes/group.routes.js"
import inviteRouter from "./server/routes/invite.routes.js"
import rtRouter from "./server/routes/rt.routes.js"
import searchRouter from "./server/routes/global_search.routes.js"

const app = express()
app.use(express.json())

// --- Health Check ---
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

// --- Mount Routes ---
app.use("/auth", authRouter)           // Authentication (login, register, refresh, logout)
app.use("/tenants", tenantRouter)      // Tenant management (signup, tenant details)
app.use("/users", userRouter)          // User management (profile, list users)
app.use("/boards", boardRouter)        // Board CRUD
app.use("/boards/:boardId/tasks", taskRouter)  // Task CRUD (nested under boards)
app.use("/roles", roleRouter)          // Role management
app.use("/groups", groupRouter)        // Group management
app.use("/invites", inviteRouter)      // Invite management
app.use("/rt", rtRouter)               // Real-time SSE events
app.use("/search", searchRouter)       // Global Search

// --- Global Error Handler (must be last) ---
app.use(errorMiddleware)

// --- HTTPS Server ---
const options = {
  key: fs.readFileSync("key.pem"),
  cert: fs.readFileSync("cert.pem"),
}

const PORT = process.env["PORT"] ?? 3001

https.createServer(options, app).listen(PORT, () => {
  console.log(`TaskTS Server running on https://localhost:${PORT}`)
  console.log("Available endpoints:")
  console.log("  POST   /auth/register")
  console.log("  POST   /auth/login")
  console.log("  POST   /auth/refresh")
  console.log("  POST   /auth/logout")
  console.log("  POST   /tenants")
  console.log("  GET    /tenants/me")
  console.log("  PUT    /tenants/me")
  console.log("  GET    /users")
  console.log("  GET    /users/me")
  console.log("  GET    /boards")
  console.log("  POST   /boards")
  console.log("  GET    /boards/:id")
  console.log("  PUT    /boards/:id")
  console.log("  DELETE /boards/:id")
  console.log("  GET    /boards/:boardId/tasks")
  console.log("  POST   /boards/:boardId/tasks")
  console.log("  GET    /boards/:boardId/tasks/:id")
  console.log("  PUT    /boards/:boardId/tasks/:id")
  console.log("  DELETE /boards/:boardId/tasks/:id")
  console.log("  GET    /roles")
  console.log("  POST   /roles")
  console.log("  PUT    /roles/:id")
  console.log("  DELETE /roles/:id")
  console.log("  GET    /rt/events (SSE)")
})