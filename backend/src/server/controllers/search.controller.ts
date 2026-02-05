import type { Request, Response } from 'express';
import { prisma } from "../../db/bootstrap.js";

interface AuthRequest extends Request {
    user?: {
        userId: string;
        tenantId: string;
        role: string;
    }
}

export class SearchController {
    static async search(req: AuthRequest, res: Response) {
        try {
            const { q } = req.query;
            const query = q as string;
            const userId = req.user!.userId;

            if (!query || query.length < 2) {
                res.json({ success: true, data: { boards: [], tasks: [] } });
                return;
            }

            // Search Boards (matched by name or description)
            // User must be owner or member (if we had specific member logic, but currently owner/tenant based)
            // Assuming simplified model: user can see boards they own or are in tenant? 
            // Previous code used `where: { OR: [{ ownerId: req.user.userId }, { tenantId: req.user.tenantId }] } ` generally.
            // Let's mimic BoardController.list logic for permission scope.

            const boards = await prisma.board.findMany({
                where: {
                    AND: [
                        { OR: [{ ownerId: userId }, { tenantId: req.user!.tenantId }] },
                        {
                            OR: [
                                { name: { contains: query, mode: 'insensitive' } },
                                { description: { contains: query, mode: 'insensitive' } }
                            ]
                        }
                    ]
                },
                take: 5,
                select: { id: true, name: true, description: true }
            });

            // Search Tasks (matched by title or description)
            // Access control: tasks in boards user has access to.
            const tasks = await prisma.task.findMany({
                where: {
                    AND: [
                        {
                            board: {
                                OR: [{ ownerId: userId }, { tenantId: req.user!.tenantId }]
                            }
                        },
                        {
                            OR: [
                                { title: { contains: query, mode: 'insensitive' } },
                                { description: { contains: query, mode: 'insensitive' } }
                            ]
                        }
                    ]
                },
                take: 5,
                select: {
                    id: true,
                    title: true,
                    status: true,
                    board: { select: { id: true, name: true } }
                }
            });

            res.json({
                success: true,
                data: {
                    boards,
                    tasks
                }
            });

        } catch (error) {
            console.error('Search error:', error);
            res.status(500).json({ success: false, error: 'Search failed' });
        }
    }
}
