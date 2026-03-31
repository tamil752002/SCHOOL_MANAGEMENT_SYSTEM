import { ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: result.error.issues.map(i => ({
          field: i.path.join('.'),
          message: i.message
        }))
      });
    }

    req.body = result.data;
    next();
  };

export default validate;