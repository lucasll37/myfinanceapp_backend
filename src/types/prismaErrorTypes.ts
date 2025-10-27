/**
 * Tipos customizados para erros do Prisma
 * Compatível com exactOptionalPropertyTypes: true
 */

/**
 * Interface para erro conhecido do Prisma
 */
export interface PrismaKnownRequestError extends Error {
  code: string;
  meta?: Record<string, unknown> | undefined;
  clientVersion: string;
}

/**
 * Interface para erro de validação do Prisma
 */
export interface PrismaValidationError extends Error {
  name: "PrismaClientValidationError";
}

/**
 * Verifica se é um erro conhecido do Prisma
 */
export function isPrismaKnownRequestError(
  error: unknown
): error is PrismaKnownRequestError {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const err = error as Record<string, unknown>;
  
  return (
    err.name === "PrismaClientKnownRequestError" ||
    (err.constructor as { name?: string } | undefined)?.name === "PrismaClientKnownRequestError" ||
    (typeof err.code === "string" && 
     typeof err.clientVersion === "string" &&
     err.code.startsWith("P"))
  );
}

/**
 * Verifica se é um erro de validação do Prisma
 */
export function isPrismaValidationError(
  error: unknown
): error is PrismaValidationError {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const err = error as Record<string, unknown>;
  
  return (
    err.name === "PrismaClientValidationError" ||
    (err.constructor as { name?: string } | undefined)?.name === "PrismaClientValidationError"
  );
}

/**
 * Extrai o código de erro do Prisma de forma segura
 */
export function getPrismaErrorCode(error: unknown): string | undefined {
  if (!isPrismaKnownRequestError(error)) {
    return undefined;
  }
  return error.code;
}

/**
 * Extrai os metadados do erro do Prisma de forma segura
 */
export function getPrismaErrorMeta(error: unknown): Record<string, unknown> | undefined {
  if (!isPrismaKnownRequestError(error)) {
    return undefined;
  }
  return error.meta;
}

/**
 * Extrai a versão do cliente Prisma de forma segura
 */
export function getPrismaClientVersion(error: unknown): string | undefined {
  if (!isPrismaKnownRequestError(error)) {
    return undefined;
  }
  return error.clientVersion;
}