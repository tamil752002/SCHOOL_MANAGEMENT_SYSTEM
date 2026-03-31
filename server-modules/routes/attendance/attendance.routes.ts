import express from 'express';
import validate from '../../middleware/validdate.js';
import { teacherAttendanceSchema } from './attendance.schema.js';
import * as controller from './attendance.controller.js';

const router = express.Router();

router.post(
  '/teacher',
  validate(teacherAttendanceSchema),
  controller.markTeacherAttendance
);

export default router;