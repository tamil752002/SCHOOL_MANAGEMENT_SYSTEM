import express from 'express';

import { bulkmovesStudents, examGrowth, getStudents } from './students.controller.js';
import { bulkMoveSchema } from './students.schema.js';
import validate from '../middleware/validate.js';
const router = express.Router();

// POST /api/students/bulk-move
router.post(
    '/bulk-move',
    validate(bulkMoveSchema),
    bulkmovesStudents
);

//get 
router.get('/:id/exam-growth', examGrowth)


router.get('/', getStudents);
export default router;