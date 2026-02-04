import "dotenv/config"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import * as crypto from "crypto"
import { type TokenPayload } from "../types/auth.types.js"

// Environment configuration with validation
const JWT_SECRET: string = process.env["JWT_SECRET"] ?? (() => { throw new Error("JWT_SECRET is not defined") })()
const JWT_REFRESH_SECRET: string = process.env["JWT_REFRESH_SECRET"] ?? (() => { throw new Error("JWT_REFRESH_SECRET is not defined") })()
const ACCESS_TOKEN_EXPIRY = "15m"
const REFRESH_TOKEN_EXPIRY_DAYS = 7
const BCRYPT_SALT_ROUNDS = 12

/**
 * Hashes a password using bcrypt
 * 
 * @param password - Plain text password to hash
 * @returns Promise resolving to hashed password
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS)
}

/**
 * Verifies a password against a bcrypt hash
 * 
 * @param password - Plain text password to verify
 * @param hashedPassword - Stored bcrypt hash to compare against
 * @returns Promise resolving to true if password matches, false otherwise
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
}

/**
 * Generates a JWT access token
 * 
 * @param payload - Token payload containing user information
 * @returns Signed JWT access token string
 */
export function generateAccessToken(payload: Omit<TokenPayload, "iat" | "exp">): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY })
}

/**
 * Generates a secure random refresh token
 * 
 * @returns Random 64-byte hex string
 */
export function generateRefreshToken(): string {
    return crypto.randomBytes(64).toString("hex")
}

/**
 * Calculates refresh token expiration date
 * 
 * @returns Date object set to REFRESH_TOKEN_EXPIRY_DAYS from now
 */
export function getRefreshTokenExpiry(): Date {
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + REFRESH_TOKEN_EXPIRY_DAYS)
    return expiry
}

/**
 * Verifies and decodes a JWT access token
 * 
 * @param token - JWT access token to verify
 * @returns Decoded token payload or null if invalid/expired
 */
export function verifyAccessToken(token: string): TokenPayload | null {
    try {
        const payload = jwt.verify(token, JWT_SECRET) as TokenPayload
        return payload
    } catch {
        return null
    }
}

/**
 * Gets the access token expiry in seconds
 * 
 * @returns Number of seconds until access token expires (900 = 15 minutes)
 */
export function getAccessTokenExpirySeconds(): number {
    return 15 * 60 // 15 minutes in seconds
}
