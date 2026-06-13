import { Router } from 'express';
import * as controller from '../controllers/sheet.controller.js';

const router = Router();

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getOne);
router.delete('/:id', controller.remove);

export default router;
