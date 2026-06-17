/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         email: { type: string }
 *         name: { type: string }
 *         role: { type: string }
 *         emailVerified: { type: boolean }
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token: { type: string }
 *         user: { $ref: '#/components/schemas/User' }
 */

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Sign in
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Token + user (with resolved permissions)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       401: { description: Invalid credentials }
 *       403: { description: Email not verified (code EMAIL_NOT_VERIFIED) }
 */

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Self-register (only when enabled) and send a verification email
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string, minLength: 6 }
 *               name: { type: string }
 *     responses:
 *       201: { description: Created — check email to verify }
 *       400: { description: Invalid or fake/disposable email }
 *       403: { description: Registration disabled }
 *       409: { description: Email already exists }
 */

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Current user + resolved permissions
 *     responses:
 *       200:
 *         description: User
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       401: { description: Missing or invalid token }
 */
