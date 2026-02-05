import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Middleware validacion con Zod
 *  schema
 *  source - fuente de datos ('body', 'query', 'params' - default: 'body')
 */
export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const dataToValidate = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
    
    const validationResult = schema.safeParse(dataToValidate);

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation error',
        message: `Invalid ${source} parameters`,
        details: validationResult.error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }

    (req as any).validated = validationResult.data;
    next();
  };
};
