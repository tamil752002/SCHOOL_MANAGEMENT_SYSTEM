import { Router } from 'express';

import developerRoutes from './developer.js';
import dataRoutes from './data.js';
import authRoutes from './auth.js';
import studentRoutes from './students.js';
import attendanceRoutes from '../attendance/attendance.routes.ts';
import feeRoutes from './fees.js';
import examRoutes from './exams.js';
import settingsRoutes from './settings.js';
import teachersRoutes from './teachers.js';
import subjectsRoutes from './subjects.js';
import leaveRoutes from './leave.js';
import classesRoutes from './classes.js';
import enrollmentsRoutes from './enrollments.js';
import studentNewRoutes from '../students/students.routes.js';
import newstudents from '../data/data.routes.js';
const router = Router();

router.use('/', developerRoutes);
router.use('/', dataRoutes);
router.use('/auth', authRoutes);
// router.use('/students', studentRoutes);
// router.use('/students',studentNewRoutes)
router.use('/students',newstudents)
router.use('/attendance', attendanceRoutes);
router.use('/fees', feeRoutes);
router.use('/exams', examRoutes);
router.use('/settings', settingsRoutes);
router.use('/teachers', teachersRoutes);
router.use('/subjects', subjectsRoutes);
router.use('/leave', leaveRoutes);
router.use('/classes', classesRoutes);
router.use('/enrollments', enrollmentsRoutes);

export default router;