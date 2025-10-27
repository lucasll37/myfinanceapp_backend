import type { Request, Response, NextFunction } from "express";
import { AppError } from "@/utils/appError";
import { logger } from "@/utils/logger";
import { config } from "@/config";
import { Prisma } from "@prisma/client";

/**
 * Middleware global de tratamento de erros
 */
export const errorMiddleware = (
  error: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let isOperational = false;

  // Erros da aplicação (AppError)
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    isOperational = error.isOperational;
  }
  // Erros do Prisma
  else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400;
    isOperational = true;

    switch (error.code) {
      case "P2002":
        message = "Registro duplicado. Este valor já existe.";
        statusCode = 409;
        break;
      case "P2025":
        message = "Registro não encontrado.";
        statusCode = 404;
        break;
      case "P2003":
        message = "Violação de chave estrangeira.";
        break;
      default:
        message = "Erro de banco de dados.";
    }
  }
  // Erros de validação do Prisma
  else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = "Dados inválidos fornecidos.";
    isOperational = true;
  }

  // Log do erro
  if (!isOperational || statusCode >= 500) {
    logger.error(`Error ${statusCode}`, error, {
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
  }

  // Resposta ao cliente
  const response: {
    error: string;
    message: string;
    statusCode: number;
    stack?: string;
    details?: unknown;
  } = {
    error: error.name || "Error",
    message,
    statusCode,
  };

  // Em desenvolvimento, incluir stack trace e detalhes
  if (config.isDevelopment) {
    response.stack = error.stack;
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      response.details = {
        code: error.code,
        meta: error.meta,
      };
    }
  }

  res.status(statusCode).json(response);
};
