import { type Response } from "express"
import { type AuthenticatedRequest } from "../types/auth.types.js"
import { eventBus, type TenantEvent } from "../utils/events.js"

/**
 * Server-Sent Events endpoint for real-time updates.
 * Clients receive events scoped to their tenant.
 * 
 * @param req - Authenticated Express request
 * @param res - Express response object
 */
export async function rtUpdates(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const { tenantId } = req.user

    // Set SSE headers
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "X-Accel-Buffering": "no" // Disable nginx buffering
    })

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: "connected", tenantId, timestamp: new Date() })}\n\n`)

    // Send heartbeat every 30 seconds to keep connection alive
    const heartbeatInterval = setInterval(() => {
        res.write(`data: ${JSON.stringify({ type: "heartbeat", timestamp: new Date() })}\n\n`)
    }, 30000)

    // Event handler for tenant-scoped events
    const eventHandler = (event: TenantEvent<unknown>): void => {
        const eventData = JSON.stringify({
            type: `${event.entity}_${event.type}`,
            data: event.data,
            timestamp: event.timestamp
        })
        res.write(`data: ${eventData}\n\n`)
    }

    // Subscribe to tenant events
    eventBus.on(`tenant:${tenantId}`, eventHandler)

    // Cleanup on client disconnect
    req.on("close", () => {
        clearInterval(heartbeatInterval)
        eventBus.off(`tenant:${tenantId}`, eventHandler)
        res.end()
    })
}