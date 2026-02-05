import type { Request, Response } from 'express';
import { prisma } from "../../db/bootstrap.js";

export class MetricsController {
    /**
     * Serves Prometheus-compatible metrics.
     */
    static async getMetrics(_req: Request, res: Response) {
        try {
            // System Metrics
            const uptime = process.uptime();
            const memoryUsage = process.memoryUsage();

            // Database Metrics
            const userCount = await prisma.user.count();
            const boardCount = await prisma.board.count();
            const taskCount = await prisma.task.count();
            const tenantCount = await prisma.tenant.count();

            // Format as Prometheus text
            const metrics = [
                '# HELP taskts_uptime_seconds The uptime of the system in seconds.',
                '# TYPE taskts_uptime_seconds gauge',
                `taskts_uptime_seconds ${uptime}`,
                '',
                '# HELP taskts_memory_heap_used_bytes Process heap used in bytes.',
                '# TYPE taskts_memory_heap_used_bytes gauge',
                `taskts_memory_heap_used_bytes ${memoryUsage.heapUsed}`,
                '',
                '# HELP taskts_memory_rss_bytes Resident set size in bytes.',
                '# TYPE taskts_memory_rss_bytes gauge',
                `taskts_memory_rss_bytes ${memoryUsage.rss}`,
                '',
                '# HELP taskts_users_total Total number of registered users.',
                '# TYPE taskts_users_total gauge',
                `taskts_users_total ${userCount}`,
                '',
                '# HELP taskts_boards_total Total number of boards.',
                '# TYPE taskts_boards_total gauge',
                `taskts_boards_total ${boardCount}`,
                '',
                '# HELP taskts_tasks_total Total number of tasks.',
                '# TYPE taskts_tasks_total gauge',
                `taskts_tasks_total ${taskCount}`,
                '',
                '# HELP taskts_tenants_total Total number of tenants.',
                '# TYPE taskts_tenants_total gauge',
                `taskts_tenants_total ${tenantCount}`
            ].join('\n');

            res.setHeader('Content-Type', 'text/plain; version=0.0.4');
            res.send(metrics);
        } catch (error) {
            console.error('Failed to generate metrics:', error);
            res.status(500).send('# ERROR: Failed to generate metrics');
        }
    }
}
