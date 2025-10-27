import type { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { AppError } from "../utils/appError.js";

/**
 * Middleware para validação de dados com Zod
 * Valida body, query e params de acordo com o schema fornecido
 */
export const validateSchema = (schema: z.ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));

        const appError = new AppError("Validation failed", 400);
        res.status(400).json({
          error: appError.name,
          message: appError.message,
          statusCode: appError.statusCode,
          errors: formattedErrors,
        });
        return;
      }
      next(error);
    }
  };
};