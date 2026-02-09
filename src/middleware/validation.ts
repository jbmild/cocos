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
      const issues = validationResult.error.issues;
      const hasMultipleErrors = issues.length > 1;
      
      // Si hay múltiples errores, usar un mensaje genérico
      // Si hay un solo error, usar el mensaje específico
      const errorMessage = hasMultipleErrors
        ? `Invalid ${source} parameters: ${issues.length} validation errors found`
        : (issues[0]?.message || `Invalid ${source} parameters`);
      
      res.status(400).json({
        error: 'Validation error',
        message: errorMessage,
        details: issues.map((err) => ({
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
