import { Request, Response } from "express"
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as service from './data.services';


export const getDatas = asyncHandler(
    async (req: Request, res: Response) => {

        const result = await service.getAllData(req)

        res.json({
            data: result,
            message: "fetch data completed"
        })
    }
)