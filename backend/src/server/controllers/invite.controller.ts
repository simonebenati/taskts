import { type Response } from 'express';
import { prisma } from '../../db/bootstrap.js';
import { validationError, notFoundError, forbiddenError } from '../middleware/error.middleware.js';
import { type AuthenticatedRequest } from '../types/auth.types.js';

/**
 * Send an invite to join the tenant
 * POST /invites
 * Body: { email: string, role: string, type: 'member' | 'guest' }
 */
export async function sendInvite(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { email, role, type } = req.body;
    const { tenantId, userId } = req.user;

    // Validate type
    if (type && !['member', 'guest'].includes(type)) {
        throw validationError('Invalid invite type. Must be "member" or "guest"');
    }

    // Validate role exists in tenant
    const roleExists = await prisma.role.findFirst({
        where: { tenantId, name: role }
    });

    if (!roleExists) {
        throw validationError(`Role "${role}" does not exist in this tenant`);
    }

    // Check if there's already a pending invite for this email in this tenant
    const existingInvite = await prisma.invite.findFirst({
        where: {
            email,
            tenantId,
            status: 'pending'
        }
    });

    if (existingInvite) {
        throw validationError('An invite for this email is already pending');
    }

    // Calculate expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invite
    const invite = await prisma.invite.create({
        data: {
            email,
            role,
            type: type || 'member',
            tenantId,
            invitedBy: userId,
            expiresAt,
            status: 'pending'
        },
        include: {
            tenant: { select: { name: true } },
            inviter: { select: { name: true, surname: true } }
        }
    });

    // Mockup: In a real system, send email here
    console.log(`[MOCKUP] Email sent to ${email}: You've been invited to join ${invite.tenant.name} by ${invite.inviter.name} ${invite.inviter.surname}`);

    res.status(200).json({
        success: true,
        message: 'User invited successfully!',
        data: invite
    });
}

/**
 * List all pending invites for the tenant
 * GET /invites
 */
export async function listInvites(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { tenantId } = req.user;

    const invites = await prisma.invite.findMany({
        where: {
            tenantId,
            status: 'pending',
            expiresAt: { gte: new Date() } // Only non-expired invites
        },
        include: {
            inviter: { select: { name: true, surname: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
        success: true,
        data: invites
    });
}

/**
 * Revoke a pending invite
 * DELETE /invites/:id
 */
export async function revokeInvite(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { tenantId } = req.user;

    const invite = await prisma.invite.findUnique({
        where: { id: id as string }
    });

    if (!invite) {
        throw notFoundError('Invite');
    }

    if (invite.tenantId !== tenantId) {
        throw forbiddenError('You can only revoke invites from your own tenant');
    }

    if (invite.status !== 'pending') {
        throw validationError('Only pending invites can be revoked');
    }

    await prisma.invite.update({
        where: { id: id as string },
        data: { status: 'revoked' }
    });

    res.status(200).json({
        success: true,
        message: 'Invite revoked successfully'
    });
}

/**
 * Accept an invite (used during registration)
 * This is called internally by the auth controller
 */
export async function acceptInvite(inviteId: string, userId: string) {
    const invite = await prisma.invite.findUnique({
        where: { id: inviteId }
    });

    if (!invite) {
        throw new Error('Invite not found');
    }

    if (invite.status !== 'pending') {
        throw new Error('This invite has already been used or revoked');
    }

    if (invite.expiresAt < new Date()) {
        throw new Error('This invite has expired');
    }

    // Mark invite as accepted
    await prisma.invite.update({
        where: { id: inviteId },
        data: { status: 'accepted' }
    });

    // If it's a guest invite, set guest expiration (30 days)
    if (invite.type === 'guest') {
        const guestExpiresAt = new Date();
        guestExpiresAt.setDate(guestExpiresAt.getDate() + 30);

        await prisma.user.update({
            where: { id: userId },
            data: {
                isGuest: true,
                guestExpiresAt
            }
        });
    }

    return invite;
}

/**
 * Resend an invite (updates expiration)
 * POST /invites/:id/resend
 */
export async function resendInvite(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { tenantId } = req.user;

    const invite = await prisma.invite.findUnique({
        where: { id: id as string },
        include: {
            tenant: { select: { name: true } },
            inviter: { select: { name: true, surname: true } }
        }
    });

    if (!invite) {
        throw notFoundError('Invite');
    }

    if (invite.tenantId !== tenantId) {
        throw forbiddenError('You can only resend invites from your own tenant');
    }

    if (invite.status !== 'pending') {
        throw validationError('Only pending invites can be resent');
    }

    // Update expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const updatedInvite = await prisma.invite.update({
        where: { id: id as string },
        data: { expiresAt },
        include: {
            tenant: { select: { name: true } },
            inviter: { select: { name: true, surname: true } }
        }
    });

    // Mockup: In a real system, resend email here
    console.log(`[MOCKUP] Email resent to ${invite.email}: You've been invited to join ${invite.tenant.name}`);

    res.status(200).json({
        success: true,
        message: 'Invite resent successfully!',
        data: updatedInvite
    });
}

/**
 * Get public invite details (unauthenticated)
 * GET /invites/:id/public
 */
export async function getInvitePublicDetails(req: any, res: Response): Promise<void> {
    const { id } = req.params;

    const invite = await prisma.invite.findUnique({
        where: { id: id as string },
        select: {
            id: true,
            email: true,
            tenantId: true,
            role: true,
            status: true,
            expiresAt: true
        }
    });

    if (!invite) {
        throw notFoundError('Invite');
    }

    if (invite.status !== 'pending') {
        throw validationError('This invite has already been used or revoked');
    }

    if (invite.expiresAt < new Date()) {
        throw validationError('This invite has expired');
    }

    res.status(200).json({
        success: true,
        data: invite
    });
}
