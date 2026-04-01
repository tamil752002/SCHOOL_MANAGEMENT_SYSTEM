import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as service from './attendance.service.js';


// POST /attendance/teacher
export const markTeacherAttendance = asyncHandler(
  async (req: Request, res: Response) => {

    const result = await service.markTeacherAttendance(req.body);

    res.json({
      message: 'Teacher attendance recorded',
      data: result
    });

  }
);


// GET /attendance/teacher
export const getTeacherAttendance = asyncHandler(
  async (req: Request, res: Response) => {

    const result = await service.getTeacherAttendance(req.query);

    res.json(result);

  }
);


// GET /attendance/my-classes-today
export const getMyClassesToday = asyncHandler(
  async (req: Request, res: Response) => {

    const result = await service.getMyClassesToday(req.query);

    res.json(result);

  }
);


// POST /attendance/records
export const saveAttendance = asyncHandler(
  async (req: Request, res: Response) => {

    const result = await service.saveAttendance(req.body);

    res.json({
      message: 'Attendance recorded',
      data: result
    });

  }
);