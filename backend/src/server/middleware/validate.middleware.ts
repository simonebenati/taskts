import { type Request, type Response, type NextFunction } from "express"
import { validationError } from "./error.middleware.js"

/**
 * Type guard to check if a value is a non-empty string
 */
function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0
}

/**
 * Type guard to check if a value is a valid email format
 */
function isValidEmail(value: unknown): value is string {
    if (typeof value !== "string") return false
    // Basic email regex - checks for format: something@something.something
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
}

/**
 * Type guard to check if a value is a valid UUID
 */
function isValidUuid(value: unknown): value is string {
    if (typeof value !== "string") return false
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(value)
}

/**
 * Validator configuration for a single field
 */
interface FieldValidator {
    required?: boolean
    type?: "string" | "email" | "uuid" | "number" | "boolean"
    minLength?: number
    maxLength?: number
    enum?: readonly string[]
}

/**
 * Schema configuration for request body validation
 */
type ValidationSchema = Record<string, FieldValidator>

/**
 * Creates a validation middleware for request body
 * 
 * @param schema - Validation schema defining field requirements
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * const registerSchema = {
 *   email: { required: true, type: "email" },
 *   name: { required: true, type: "string", minLength: 1, maxLength: 50 },
 *   password: { required: true, type: "string", minLength: 8 }
 * }
 * router.post("/register", validate(registerSchema), registerController)
 * ```
 */
export function validate(schema: ValidationSchema) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const errors: Record<string, string[]> = {}
        const body = req.body as Record<string, unknown>

        for (const [field, validator] of Object.entries(schema)) {
            const value = body[field]
            const fieldErrors: string[] = []

            // Check required
            if (validator.required && (value === undefined || value === null || value === "")) {
                fieldErrors.push(`${field} is required`)
            }

            // Skip further validation if field is optional and not provided
            if (!validator.required && (value === undefined || value === null)) {
                continue
            }

            // Type validation
            if (value !== undefined && value !== null) {
                switch (validator.type) {
                    case "string":
                        if (!isNonEmptyString(value)) {
                            fieldErrors.push(`${field} must be a non-empty string`)
                        }
                        break
                    case "email":
                        if (!isValidEmail(value)) {
                            fieldErrors.push(`${field} must be a valid email address`)
                        }
                        break
                    case "uuid":
                        if (!isValidUuid(value)) {
                            fieldErrors.push(`${field} must be a valid UUID`)
                        }
                        break
                    case "number":
                        if (typeof value !== "number" || isNaN(value)) {
                            fieldErrors.push(`${field} must be a number`)
                        }
                        break
                    case "boolean":
                        if (typeof value !== "boolean") {
                            fieldErrors.push(`${field} must be a boolean`)
                        }
                        break
                }

                // String length validation
                if (typeof value === "string") {
                    if (validator.minLength !== undefined && value.length < validator.minLength) {
                        fieldErrors.push(`${field} must be at least ${validator.minLength} characters`)
                    }
                    if (validator.maxLength !== undefined && value.length > validator.maxLength) {
                        fieldErrors.push(`${field} must be at most ${validator.maxLength} characters`)
                    }
                }

                // Enum validation
                if (validator.enum && typeof value === "string") {
                    if (!validator.enum.includes(value)) {
                        fieldErrors.push(`${field} must be one of: ${validator.enum.join(", ")}`)
                    }
                }
            }

            if (fieldErrors.length > 0) {
                errors[field] = fieldErrors
            }
        }

        if (Object.keys(errors).length > 0) {
            throw validationError("Validation failed", errors)
        }

        next()
    }
}

/**
 * Validates that URL parameters are valid UUIDs
 * 
 * @param paramNames - Array of parameter names to validate
 * @returns Express middleware function
 */
export function validateParams(...paramNames: string[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const errors: Record<string, string[]> = {}

        for (const param of paramNames) {
            const value = req.params[param]
            if (!value) {
                errors[param] = [`${param} is required`]
            } else if (!isValidUuid(value)) {
                errors[param] = [`${param} must be a valid UUID`]
            }
        }

        if (Object.keys(errors).length > 0) {
            throw validationError("Invalid URL parameters", errors)
        }

        next()
    }
}
