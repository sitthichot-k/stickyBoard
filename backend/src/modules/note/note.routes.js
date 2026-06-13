import { Router } from 'express';
import * as controller from './controller/note.controller.js';

const router = Router();

router.get('/', controller.list);
router.post('/', controller.create);
router.patch('/:id', controller.update);
router.delete('/:id', controller.remove);
router.post('/:id/restore', controller.restore);

export default router;
