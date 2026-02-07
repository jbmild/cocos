/**
 * Clase base para errores de la aplicacion
 */
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorType: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
