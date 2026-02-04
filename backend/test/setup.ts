/**
 * Jest test setup file
 * Configures mocks and global test utilities
 */

// Mock environment variables
process.env["JWT_SECRET"] = "test-jwt-secret-key"
process.env["JWT_REFRESH_SECRET"] = "test-refresh-secret-key"
process.env["DATABASE_URL"] = "postgresql://test:test@localhost:5432/test"

// Extend Jest matchers if needed
expect.extend({})
