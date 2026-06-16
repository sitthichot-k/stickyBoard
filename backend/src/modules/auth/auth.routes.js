import { Router } from 'express';
import * as controller from './controller/auth.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { loginRateLimiter } from '../../middleware/rateLimit.js';

const router = Router();

router.post('/login', loginRateLimiter, controller.login);
router.post('/register', loginRateLimiter, controller.register);
router.post('/verify-email', controller.verifyEmail);
router.post('/resend-verification', loginRateLimiter, controller.resendVerification);
router.get('/me', requireAuth, controller.me);

export default router;
