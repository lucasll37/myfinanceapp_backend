import cors from "cors";
import { config } from "./app.config.js";

/**
 * Configuração de CORS
 */

export const corsConfig = cors({
  origin: (origin, callback) => {
    // Permitir requisições sem origin (mobile apps, Postman, etc)
    if (!origin) {
      return callback(null, true);
    }

    // Se CORS_ORIGINS for "*", permitir todas as origens
    if (config.cors.origins.length === 0 || config.cors.origins[0] === "*") {
      return callback(null, true);
    }

    // Verificar se a origem está na lista de permitidas
    if (config.cors.origins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: config.cors.credentials,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["X-Total-Count", "X-Page-Count"],
  maxAge: 86400, // 24 horas
});
