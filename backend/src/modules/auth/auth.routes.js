import { Router } from 'express';
import * as controller from './controller/auth.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { loginRateLimiter } from '../../middleware/rateLimit.js';

const router = Router();

router.get('/config', controller.publicConfig);
router.post('/login', loginRateLimiter, controller.login);
router.post('/register', loginRateLimiter, controller.register);
router.post('/verify-email', controller.verifyEmail);
router.post('/resend-verification', loginRateLimiter, controller.resendVerification);
router.post('/forgot-password', loginRateLimiter, controller.forgotPassword);
router.post('/reset-password', loginRateLimiter, controller.resetPassword);

router.get('/me', requireAuth, controller.me);
router.patch('/me', requireAuth, controller.updateProfile);
router.post('/change-password', requireAuth, controller.changePassword);

export default router;
