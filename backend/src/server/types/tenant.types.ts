/**
 * Tenant-related type definitions
 */

/**
 * Request body for creating a tenant (with initial admin user)
 */
export interface CreateTenantBody {
    tenantName: string
    adminEmail: string
    adminName: string
    adminSurname: string
    adminPassword: string
}

/**
 * Request body for updating a tenant
 */
export interface UpdateTenantBody {
    name?: string
    subscription?: string
    paymentMethod?: string
}

/**
 * Tenant response structure
 */
export interface TenantResponse {
    id: string
    name: string
    subscription: string
    paymentMethod: string | null
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}
