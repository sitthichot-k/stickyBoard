import { Router } from 'express';
import * as controller from '../controllers/stroke.controller.js';

const router = Router();

router.get('/', controller.list);
router.post('/', controller.create);
router.delete('/:id', controller.remove);
router.post('/:id/restore', controller.restore);

export default router;
