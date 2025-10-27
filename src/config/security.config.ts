import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./app.config.js";

/**
 * Configurações de segurança da aplicação
 */

// Helmet - Headers de segurança
export const helmetConfig = helmet({
  contentSecurityPolicy: config.isProduction
    ? {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      }
    : false, // Desabilita CSP em desenvolvimento
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

// Rate Limiting - Global
export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: "draft-7", // Retorna RateLimit-* headers
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limit para health check
    return req.path === "/health" || req.path === "/api/health";
  },
});

// Rate Limiting - Strict (para endpoints sensíveis como auth)
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Não conta requisições bem-sucedidas
});
