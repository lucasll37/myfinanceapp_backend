/**
 * Classe customizada para erros da aplicação
 * Permite criar erros com status HTTP e mensagens personalizadas
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    // Mantém o stack trace correto
    Error.captureStackTrace(this, this.constructor);
  }

  // Factory methods para erros comuns
  static badRequest(message: string = "Bad Request"): AppError {
    return new AppError(message, 400);
  }

  static unauthorized(message: string = "Unauthorized"): AppError {
    return new AppError(message, 401);
  }

  static forbidden(message: string = "Forbidden"): AppError {
    return new AppError(message, 403);
  }

  static notFound(message: string = "Not Found"): AppError {
    return new AppError(message, 404);
  }

  static conflict(message: string = "Conflict"): AppError {
    return new AppError(message, 409);
  }

  static internal(message: string = "Internal Server Error"): AppError {
    return new AppError(message, 500, false);
  }
}
