import logger from '../utils/logger.js';

import type { Request, Response, NextFunction } from "express";
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    logger.info(`${req.method} ${req.url}`);
    next();
};