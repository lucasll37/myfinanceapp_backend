import dotenv from "dotenv";

dotenv.config();

/**
 * Configurações gerais da aplicação
 * Centraliza todas as variáveis de ambiente e configurações
 */

// Validação de variáveis obrigatórias
const requiredEnvVars = [
  "DATABASE_URL", "PORT", "JWT_SECRET", "SERVER_HOST", "CORS_ORIGINS", "JWT_EXPIRES_IN",
  "RATE_LIMIT_WINDOW_MS", "RATE_LIMIT_MAX", "LOG_LEVEL", "NODE_ENV"] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Variável de ambiente obrigatória não definida: ${envVar}`);
  }
}

export const config = {
  // Ambiente
  env: process.env.NODE_ENV!,
  isDevelopment: process.env.NODE_ENV !== "production",
  isProduction: process.env.NODE_ENV === "production",

  // Servidor
  port: Number(process.env.PORT!),
  host: process.env.SERVER_HOST!,

  // Database
  database: {
    url: process.env.DATABASE_URL!,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN!,
  },

  // CORS
  cors: {
    origins: (process.env.CORS_ORIGINS)!
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
    credentials: true,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS!),
    max: Number(process.env.RATE_LIMIT_MAX!)
  },

  // Compressão
  compression: {
    level: 6,
    threshold: 1024 // 1KB
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL!,
  },
} as const;
