import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/utils/errors';
import { Prisma } from '@prisma/client';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  // Erro customizado da aplicação
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }

  // Erros do Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return res.status(409).json({
          success: false,
          message: 'Registro duplicado',
        });
      case 'P2025':
        return res.status(404).json({
          success: false,
          message: 'Registro não encontrado',
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'Erro no banco de dados',
        });
    }
  }

  // Erro genérico
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
  });
};