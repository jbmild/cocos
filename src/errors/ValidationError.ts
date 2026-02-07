import { AppError } from './AppError';

/**
 * Error de validacion (400 Bad Request)
 * Usado para errores de validacion de schema o reglas de negocio
 */
export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly errorType = 'Validation error';

  constructor(message: string) {
    super(message);
  }
}
