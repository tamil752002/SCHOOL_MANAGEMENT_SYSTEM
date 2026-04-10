import express from 'express';
import validate from '../middleware/validate.js';
import * as controller from './attendance.controller.js';
import {
    teacherAttendanceSchema,
    attendanceRecordSchema
} from './attendance.schema.js';

const router = express.Router();


router.post(
    '/teacher',
    validate(teacherAttendanceSchema),
    controller.markTeacherAttendance
);

router.get(
    '/teacher',
    controller.getTeacherAttendance
);

router.get(
    '/my-classes-today',
    controller.getMyClassesToday
);

router.post(
    '/records',
    validate(attendanceRecordSchema),
    controller.saveAttendance
);
export default router;

