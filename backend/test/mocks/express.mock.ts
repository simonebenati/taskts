/**
 * Mock Express Request and Response objects for testing
 */
import type { Request, Response, NextFunction } from "express"

/**
 * JWT token payload structure for tests
 */
export interface TokenPayload {
    userId: string
    tenantId: string
    roleId: string
    roleName: string
    iat: number
    exp: number
}

/**
 * Extended Express Request with authenticated user data
 */
export interface AuthenticatedRequest extends Request {
    user: TokenPayload
}

/**
 * Creates a mock Express Response object
 */
export function createMockResponse(): Response {
    const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        writeHead: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnThis(),
        end: jest.fn().mockReturnThis(),
    }
    return res as Response
}

/**
 * Creates a mock Express Request object
 */
export function createMockRequest<T = unknown>(options: {
    body?: T
    params?: Record<string, string>
    query?: Record<string, string>
    headers?: Record<string, string>
}): Request<Record<string, string>, unknown, T> {
    const req: Partial<Request> = {
        body: options.body ?? {},
        params: options.params ?? {},
        query: options.query ?? {},
        headers: options.headers ?? {},
        on: jest.fn(),
    }
    return req as Request<Record<string, string>, unknown, T>
}

/**
 * Creates a mock Authenticated Request with user payload
 */
export function createMockAuthRequest<T = unknown>(options: {
    body?: T
    params?: Record<string, string>
    query?: Record<string, string>
    user: TokenPayload
}): AuthenticatedRequest & { body: T } {
    const req: Partial<AuthenticatedRequest> = {
        body: options.body ?? ({} as T),
        params: options.params ?? {},
        query: options.query ?? {},
        headers: { authorization: "Bearer test-token" },
        user: options.user,
        on: jest.fn(),
    }
    return req as AuthenticatedRequest & { body: T }
}

/**
 * Creates a mock NextFunction
 */
export function createMockNext(): NextFunction {
    return jest.fn()
}

/**
 * Default test user payload
 */
export const testUserPayload: TokenPayload = {
    userId: "test-user-id",
    tenantId: "test-tenant-id",
    roleId: "test-role-id",
    roleName: "admin",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
}
