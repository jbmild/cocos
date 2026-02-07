import { AppError } from './AppError';

/**
 * Error de recurso no encontrado (404 Not Found)
 * Usado cuando un recurso solicitado no existe
 */
export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly errorType = 'Resource not found';

  constructor(message: string) {
    super(message);
  }
}
