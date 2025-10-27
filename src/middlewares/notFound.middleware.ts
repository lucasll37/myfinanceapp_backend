import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError.js";

/**
 * Middleware para capturar rotas não encontradas (404)
 */
export const notFoundMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = AppError.notFound(`Route ${req.method} ${req.originalUrl} not found`);
  next(error);
};
