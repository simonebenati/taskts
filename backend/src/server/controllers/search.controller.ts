import type { Response } from 'express';
import { prisma } from "../../db/bootstrap.js";
import { type AuthenticatedRequest } from "../types/auth.types.js";

export class SearchController {
    static async search(req: AuthenticatedRequest, res: Response) {
        try {
            const { q } = req.query;
            const query = q as string;
            const { userId, tenantId, roleName, groupId: userGroupId } = req.user;

            if (!query || query.length < 2) {
                res.json({ success: true, data: { boards: [], tasks: [] } });
                return;
            }

            // Build board filter based on role
            const boardFilter: any = {
                tenantId,
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } }
                ]
            };

            // If not admin, restrict to user's group or ownership
            if (roleName !== 'admin') {
                boardFilter.AND = [
                    {
                        OR: [
                            { groupId: userGroupId },
                            { ownerId: userId }
                        ]
                    }
                ];
            }

            const boards = await prisma.board.findMany({
                where: boardFilter,
                take: 5,
                select: { id: true, name: true, description: true }
            });

            // Search Tasks (matched by title or description)
            // Access control: tasks in boards user has access to.
            const taskFilter: any = {
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } }
                ],
                board: {
                    tenantId
                }
            };

            if (roleName !== 'admin') {
                taskFilter.board.OR = [
                    { groupId: userGroupId },
                    { ownerId: userId }
                ];
            }

            const tasks = await prisma.task.findMany({
                where: taskFilter,
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
