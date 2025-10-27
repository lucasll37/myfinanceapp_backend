import type { Request, Response, NextFunction } from "express";
import { logger } from "@/utils/logger";

/**
 * Middleware de logging de requisições HTTP
 */
export const loggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Captura o final da resposta
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const { method, originalUrl } = req;
    const { statusCode } = res;

    logger.http(method, originalUrl, statusCode, duration);
  });

  next();
};
