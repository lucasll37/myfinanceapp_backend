import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError.js";
import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";
import {
  isPrismaKnownRequestError,
  isPrismaValidationError,
  getPrismaErrorCode,
  getPrismaErrorMeta,
  getPrismaClientVersion,
  type PrismaKnownRequestError,
} from "../types/prismaErrorTypes.js";

/**
 * Interface para resposta de erro
 * Compatível com exactOptionalPropertyTypes: true
 */
interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  stack?: string;
  details?: ErrorDetails;
}

/**
 * Interface para detalhes do erro
 */
interface ErrorDetails {
  code?: string;
  meta?: Record<string, unknown>;
  clientVersion?: string;
}

/**
 * Mapeia códigos de erro do Prisma para mensagens amigáveis
 */
function handlePrismaError(error: PrismaKnownRequestError): {
  statusCode: number;
  message: string;
} {
  const code = error.code;

  switch (code) {
    case "P2000":
      return { statusCode: 400, message: "O valor fornecido é muito longo para o campo." };
    case "P2001":
      return { statusCode: 404, message: "Registro não encontrado na busca." };
    case "P2002":
      return { statusCode: 409, message: "Registro duplicado. Este valor já existe." };
    case "P2003":
      return { statusCode: 400, message: "Violação de chave estrangeira." };
    case "P2004":
      return { statusCode: 400, message: "Erro de restrição no banco de dados." };
    case "P2005":
      return { statusCode: 400, message: "Valor inválido armazenado no banco." };
    case "P2006":
      return { statusCode: 400, message: "O valor fornecido é inválido." };
    case "P2007":
      return { statusCode: 400, message: "Erro de validação de dados." };
    case "P2008":
      return { statusCode: 400, message: "Falha ao analisar a consulta." };
    case "P2009":
      return { statusCode: 400, message: "Falha ao validar a consulta." };
    case "P2010":
      return { statusCode: 500, message: "Falha na consulta SQL." };
    case "P2011":
      return { statusCode: 400, message: "Violação de restrição de nulo." };
    case "P2012":
      return { statusCode: 400, message: "Valor obrigatório ausente." };
    case "P2013":
      return { statusCode: 400, message: "Argumento obrigatório ausente." };
    case "P2014":
      return { statusCode: 400, message: "A alteração violaria uma restrição de relacionamento." };
    case "P2015":
      return { statusCode: 404, message: "Registro relacionado não encontrado." };
    case "P2016":
      return { statusCode: 400, message: "Erro na interpretação da consulta." };
    case "P2017":
      return { statusCode: 400, message: "Registros relacionados não conectados." };
    case "P2018":
      return { statusCode: 400, message: "Registros relacionados requeridos não encontrados." };
    case "P2019":
      return { statusCode: 400, message: "Erro de entrada de dados." };
    case "P2020":
      return { statusCode: 400, message: "Valor fora do alcance para o tipo de dados." };
    case "P2021":
      return { statusCode: 500, message: "Tabela não existe no banco de dados." };
    case "P2022":
      return { statusCode: 500, message: "Coluna não existe no banco de dados." };
    case "P2023":
      return { statusCode: 400, message: "Dados inconsistentes na coluna." };
    case "P2024":
      return { statusCode: 408, message: "Timeout ao buscar dados do banco de dados." };
    case "P2025":
      return { statusCode: 404, message: "Registro não encontrado para a operação." };
    case "P2026":
      return { statusCode: 400, message: "Provedor de banco de dados não suporta a operação." };
    case "P2027":
      return { statusCode: 500, message: "Múltiplos erros ocorreram no banco de dados." };
    case "P2028":
      return { statusCode: 500, message: "Erro na API de transação." };
    case "P2030":
      return { statusCode: 400, message: "Índice full-text não encontrado." };
    case "P2033":
      return { statusCode: 400, message: "Número excede o limite de precisão." };
    case "P2034":
      return { statusCode: 409, message: "Conflito de transação." };
    case "P1000":
      return { statusCode: 503, message: "Não foi possível conectar ao banco de dados." };
    case "P1001":
      return { statusCode: 503, message: "Timeout de conexão com o banco de dados." };
    case "P1002":
      return { statusCode: 503, message: "Servidor de banco de dados não acessível." };
    case "P1003":
      return { statusCode: 500, message: "Banco de dados não existe." };
    case "P1008":
      return { statusCode: 503, message: "Timeout de operação no banco de dados." };
    case "P1009":
      return { statusCode: 500, message: "Banco de dados já existe." };
    case "P1010":
      return { statusCode: 403, message: "Acesso negado ao banco de dados." };
    case "P1011":
      return { statusCode: 500, message: "Erro ao abrir conexão TLS." };
    case "P1012":
      return { statusCode: 400, message: "Erro no schema do banco de dados." };
    case "P1013":
      return { statusCode: 400, message: "String de conexão inválida." };
    case "P1014":
      return { statusCode: 404, message: "Modelo não existe." };
    case "P1015":
      return { statusCode: 400, message: "Versão do schema não suportada." };
    case "P1016":
      return { statusCode: 400, message: "Número incorreto de parâmetros na consulta SQL." };
    case "P1017":
      return { statusCode: 503, message: "Servidor de banco de dados fechou a conexão." };
    default:
      return { statusCode: 400, message: `Erro de banco de dados: ${code}` };
  }
}

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
  // Erros do Prisma - Known Request Error
  else if (isPrismaKnownRequestError(error)) {
    const prismaError = handlePrismaError(error);
    statusCode = prismaError.statusCode;
    message = prismaError.message;
    isOperational = true;
  }
  // Erros de validação do Prisma
  else if (isPrismaValidationError(error)) {
    statusCode = 400;
    message = "Dados inválidos fornecidos à consulta.";
    isOperational = true;
  }
  // Erros de sintaxe JSON
  else if (error instanceof SyntaxError && "body" in error) {
    statusCode = 400;
    message = "JSON inválido no corpo da requisição.";
    isOperational = true;
  }
  // Erros de tipo
  else if (error instanceof TypeError) {
    statusCode = 400;
    message = "Tipo de dado inválido.";
    isOperational = false;
  }

  // Log do erro
  if (!isOperational || statusCode >= 500) {
    logger.error(`Error ${statusCode}`, error, {
      method: req.method,
      path: req.path,
      ip: req.ip,
      body: req.body,
      query: req.query,
      params: req.params,
    });
  } else {
    logger.warn(`Operational Error ${statusCode}`, {
      message: error.message,
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
  }

  // Resposta ao cliente - inicializar objeto base
  const response: ErrorResponse = {
    error: error.name || "Error",
    message,
    statusCode,
  };

  // Em desenvolvimento, incluir stack trace e detalhes
  if (config.isDevelopment) {
    // ✅ SOLUÇÃO: Verificar se stack existe antes de atribuir
    if (error.stack !== undefined) {
      response.stack = error.stack;
    }

    // Adicionar detalhes específicos do Prisma em desenvolvimento
    if (isPrismaKnownRequestError(error)) {
      const code = getPrismaErrorCode(error);
      const meta = getPrismaErrorMeta(error);
      const clientVersion = getPrismaClientVersion(error);
      
      // ✅ SOLUÇÃO: Criar objeto apenas com propriedades definidas
      const details: ErrorDetails = {};
      
      if (code !== undefined) {
        details.code = code;
      }
      
      if (meta !== undefined) {
        details.meta = meta;
      }
      
      if (clientVersion !== undefined) {
        details.clientVersion = clientVersion;
      }
      
      // Apenas adicionar details se tiver alguma propriedade
      if (Object.keys(details).length > 0) {
        response.details = details;
      }
    }
  }

  res.status(statusCode).json(response);
};

/**
 * Middleware para capturar erros assíncronos
 */
export const asyncHandler = <T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};