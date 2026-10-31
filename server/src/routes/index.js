import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import tokenRoutes from './token.routes.js';
import doctorRoutes from './doctor.routes.js';
import receptionRoutes from './reception.routes.js';
import adminRoutes from './admin.routes.js';
import webhookRoutes from './webhook.routes.js';
import assistantRoutes from './assistant.routes.js';

const router = Router();

// Mount all feature routes under /api/v1
router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/tokens', tokenRoutes);
router.use('/doctor', doctorRoutes);
router.use('/reception', receptionRoutes);
router.use('/admin', adminRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/assistant', assistantRoutes);

export default router;
