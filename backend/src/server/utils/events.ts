import { EventEmitter } from "events"
import { type BoardResponse } from "../types/board.types.js"
import { type TaskResponse } from "../types/task.types.js"

/**
 * Event bus for real-time updates.
 * Emits events scoped by tenant for SSE broadcasting.
 */
class TenantEventEmitter extends EventEmitter {
    constructor() {
        super()
        // Allow many listeners (one per connected SSE client)
        this.setMaxListeners(1000)
    }
}

export const eventBus = new TenantEventEmitter()

/**
 * Event types for real-time updates
 */
export type EventType = "created" | "updated" | "deleted"

/**
 * Structure of an emitted event
 */
export interface TenantEvent<T> {
    tenantId: string
    type: EventType
    entity: "board" | "task"
    data: T
    timestamp: Date
}

/**
 * Emits a board event to all listeners for the tenant.
 * 
 * @param tenantId - The tenant ID to scope the event
 * @param type - Event type (created, updated, deleted)
 * @param data - Board data or partial data for delete events
 */
export function emitBoardEvent(
    tenantId: string,
    type: EventType,
    data: BoardResponse | { id: string; tenantId: string }
): void {
    const event: TenantEvent<typeof data> = {
        tenantId,
        type,
        entity: "board",
        data,
        timestamp: new Date()
    }
    eventBus.emit(`tenant:${tenantId}`, event)
}

/**
 * Emits a task event to all listeners for the tenant.
 * 
 * @param tenantId - The tenant ID to scope the event
 * @param type - Event type (created, updated, deleted)
 * @param data - Task data or partial data for delete events
 */
export function emitTaskEvent(
    tenantId: string,
    type: EventType,
    data: TaskResponse | { id: string; boardId: string; tenantId: string }
): void {
    const event: TenantEvent<typeof data> = {
        tenantId,
        type,
        entity: "task",
        data,
        timestamp: new Date()
    }
    eventBus.emit(`tenant:${tenantId}`, event)
}
