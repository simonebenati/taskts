/**
 * Unit tests for Error Middleware
 */
import { createMockRequest, createMockResponse, createMockNext } from "../mocks/express.mock"
import {
    AppError,
    validationError,
    unauthorizedError,
    forbiddenError,
    notFoundError,
    conflictError,
    internalError,
    errorMiddleware
} from "../../src/server/middleware/error.middleware"

describe("Error Middleware", () => {
    describe("AppError class", () => {
        it("should create an AppError with correct properties", () => {
            const error = new AppError(400, "TEST_ERROR", "Test message")

            expect(error.statusCode).toBe(400)
            expect(error.code).toBe("TEST_ERROR")
            expect(error.message).toBe("Test message")
            expect(error.name).toBe("AppError")
        })

        it("should create an AppError with details", () => {
            const details = { field: ["error1", "error2"] }
            const error = new AppError(400, "VALIDATION_ERROR", "Validation failed", details)

            expect(error.details).toEqual(details)
        })
    })

    describe("Error factory functions", () => {
        it("validationError should create 400 error", () => {
            const error = validationError("Invalid input")

            expect(error.statusCode).toBe(400)
            expect(error.code).toBe("VALIDATION_ERROR")
        })

        it("unauthorizedError should create 401 error", () => {
            const error = unauthorizedError("Not authorized")

            expect(error.statusCode).toBe(401)
            expect(error.code).toBe("UNAUTHORIZED")
        })

        it("unauthorizedError should use default message", () => {
            const error = unauthorizedError()

            expect(error.message).toBe("Unauthorized")
        })

        it("forbiddenError should create 403 error", () => {
            const error = forbiddenError("Access denied")

            expect(error.statusCode).toBe(403)
            expect(error.code).toBe("FORBIDDEN")
        })

        it("forbiddenError should use default message", () => {
            const error = forbiddenError()

            expect(error.message).toBe("Forbidden")
        })

        it("notFoundError should create 404 error", () => {
            const error = notFoundError("User")

            expect(error.statusCode).toBe(404)
            expect(error.code).toBe("NOT_FOUND")
            expect(error.message).toBe("User not found")
        })

        it("conflictError should create 409 error", () => {
            const error = conflictError("Resource already exists")

            expect(error.statusCode).toBe(409)
            expect(error.code).toBe("CONFLICT")
        })

        it("internalError should create 500 error", () => {
            const error = internalError("Database error")

            expect(error.statusCode).toBe(500)
            expect(error.code).toBe("INTERNAL_ERROR")
        })

        it("internalError should use default message", () => {
            const error = internalError()

            expect(error.message).toBe("Internal server error")
        })
    })

    describe("errorMiddleware", () => {
        it("should handle AppError and return proper response", () => {
            const req = createMockRequest({})
            const res = createMockResponse()
            const next = createMockNext()
            const error = new AppError(400, "VALIDATION_ERROR", "Invalid data")

                // Mock req.method and req.path
                ; (req as any).method = "POST"
                ; (req as any).path = "/test"

            errorMiddleware(error, req as any, res, next)

            expect(res.status).toHaveBeenCalledWith(400)
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                code: "VALIDATION_ERROR",
                message: "Invalid data",
            })
        })

        it("should include details in AppError response", () => {
            const req = createMockRequest({})
            const res = createMockResponse()
            const next = createMockNext()
            const details = { email: ["Invalid format"] }
            const error = new AppError(400, "VALIDATION_ERROR", "Validation failed", details)

                ; (req as any).method = "POST"
                ; (req as any).path = "/test"

            errorMiddleware(error, req as any, res, next)

            expect(res.json).toHaveBeenCalledWith({
                success: false,
                code: "VALIDATION_ERROR",
                message: "Validation failed",
                details,
            })
        })

        it("should handle Prisma P2002 unique constraint error", () => {
            const req = createMockRequest({})
            const res = createMockResponse()
            const next = createMockNext()
            const error = {
                name: "PrismaClientKnownRequestError",
                code: "P2002",
                meta: { target: ["email"] }
            }

                ; (req as any).method = "POST"
                ; (req as any).path = "/test"

            errorMiddleware(error as any, req as any, res, next)

            expect(res.status).toHaveBeenCalledWith(409)
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                code: "DUPLICATE_ENTRY",
                message: "A record with this email already exists",
            })
        })

        it("should handle Prisma P2025 not found error", () => {
            const req = createMockRequest({})
            const res = createMockResponse()
            const next = createMockNext()
            const error = { name: "PrismaClientKnownRequestError", code: "P2025" }

                ; (req as any).method = "GET"
                ; (req as any).path = "/test/123"

            errorMiddleware(error as any, req as any, res, next)

            expect(res.status).toHaveBeenCalledWith(404)
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                code: "NOT_FOUND",
                message: "Record not found",
            })
        })

        it("should handle JSON parse errors", () => {
            const req = createMockRequest({})
            const res = createMockResponse()
            const next = createMockNext()
            const error = new SyntaxError("Unexpected token")
                ; (error as any).body = "invalid json"

                ; (req as any).method = "POST"
                ; (req as any).path = "/test"

            errorMiddleware(error, req as any, res, next)

            expect(res.status).toHaveBeenCalledWith(400)
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                code: "INVALID_JSON",
                message: "Invalid JSON in request body",
            })
        })

        it("should return 500 for unknown errors", () => {
            const req = createMockRequest({})
            const res = createMockResponse()
            const next = createMockNext()
            const error = new Error("Something went wrong")

                ; (req as any).method = "GET"
                ; (req as any).path = "/test"

            errorMiddleware(error, req as any, res, next)

            expect(res.status).toHaveBeenCalledWith(500)
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                code: "INTERNAL_ERROR",
                message: "An unexpected error occurred",
            })
        })
    })
})
