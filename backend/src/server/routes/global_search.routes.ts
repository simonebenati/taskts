import { Router } from 'express';
import { SearchController } from '../controllers/search.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authMiddleware as any, SearchController.search as any);

export default router;
