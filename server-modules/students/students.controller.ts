import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as service from './students.services.js';

export const bulkmovesStudents = asyncHandler(
    async (req: Request, res: Response) => {

        const result = await service.movesBulkmovesdataStudent(req.body);

        res.json({
            message: 'Students moved successfully',
            data: result
        });

    }
);
export const examGrowth = asyncHandler(
    async (req: Request, res: Response) => {
        const result = await service.examGrowthDtls(req?.params)
        res.json({
            message: "Exam growth fetched",
            data: result
        });
    })

export const getStudents = asyncHandler(
    async (req: Request, res: Response) => {
        const result = await service.getStudents({
            schoolId: req.query.schoolId
        });

        res.json({
            message: 'Students fetched',
            data: result
        });
    }
);