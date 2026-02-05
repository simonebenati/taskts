import { Router } from 'express';
import { sendInvite, listInvites, revokeInvite, resendInvite, getInvitePublicDetails } from '../controllers/invite.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { tenantMiddleware } from '../middleware/tenant.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const inviteRouter = Router();

// Validation schemas
const sendInviteSchema = {
    email: { required: true, type: "email" as const, maxLength: 255 },
    role: { required: true, type: "string" as const, minLength: 1, maxLength: 50 },
    type: { required: false, type: "string" as const, enum: ['member', 'guest'] }
};

/**
 * GET /invites/:id/public
 * Get public invite details (unauthenticated)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
inviteRouter.get('/:id/public', getInvitePublicDetails as any);

// All following routes are protected
// eslint-disable-next-line @typescript-eslint/no-explicit-any
inviteRouter.use(authMiddleware as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
inviteRouter.use(tenantMiddleware as any);

/**
 * POST /invites
 * Send an invite to join the tenant
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
inviteRouter.post('/', validate(sendInviteSchema) as any, sendInvite as any);

/**
 * GET /invites
 * List all pending invites for the tenant
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
inviteRouter.get('/', listInvites as any);

/**
 * DELETE /invites/:id
 * Revoke a pending invite
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
inviteRouter.delete('/:id', revokeInvite as any);

/**
 * POST /invites/:id/resend
 * Resend an invite
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
inviteRouter.post('/:id/resend', resendInvite as any);

export default inviteRouter;
