/**
 * @openapi
 * components:
 *   schemas:
 *     Sheet:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         name: { type: string }
 *         background: { type: string, enum: [dots, grid, blank] }
 *         ownerId: { type: string, nullable: true }
 */

/**
 * @openapi
 * /sheets:
 *   get:
 *     tags: [Sheets]
 *     summary: List boards (owner-scoped for owner-mode roles)
 *     responses:
 *       200:
 *         description: Boards
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Sheet' }
 *       401: { description: No token }
 *       403: { description: No view permission }
 *   post:
 *     tags: [Sheets]
 *     summary: Create a board
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               background: { type: string, enum: [dots, grid, blank] }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Sheet' }
 *       403: { description: No edit permission }
 */

/**
 * @openapi
 * /sheets/{id}:
 *   get:
 *     tags: [Sheets]
 *     summary: Get a board
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Board }
 *       404: { description: Not found (or not yours in owner mode) }
 *   patch:
 *     tags: [Sheets]
 *     summary: Update a board's name/background
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               background: { type: string, enum: [dots, grid, blank] }
 *     responses:
 *       200: { description: Updated }
 *       403: { description: No edit permission }
 *   delete:
 *     tags: [Sheets]
 *     summary: Delete a board (cascades to its notes/arrows/strokes)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       204: { description: Deleted }
 *       403: { description: No delete permission }
 */
