import express from "express";
import helmet from "helmet";
import cors from "cors";
import routes from "@/routes"
import compression from "compression";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

// --- helpers de env ---
const ORIGINS = (process.env.CORS_ORIGINS ?? "*")
  .split(",")
  .map(v => v.trim())
  .filter(Boolean);
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS);
const MAX_REQS = Number(process.env.RATE_LIMIT_MAX);

const app = express();

// se roda atrás de proxy (nginx, render, dokku, heroku...), habilite:
app.set("trust proxy", 1);

// Helmet: cabeçalhos de segurança
app.use(
  helmet({
    // em dev, pode desativar CSP para facilitar front local; em prod, ajuste sua policy
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// CORS: restringe domínios em prod
app.use(
  cors({
    origin: ORIGINS.length ? ORIGINS : "*",
    credentials: true,
  })
);

// compressão gzip
app.use(
  compression({
    level: 6,            // nível de compressão (0–9)
    threshold: 1024,     // só comprime respostas > 1 KB
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  })
);

// body parsers
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limit básico (por IP)
const limiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQS,
  standardHeaders: "draft-7", // retorna RateLimit-* headers
  legacyHeaders: false,
});

app.use("/api", limiter);
app.use("/api", routes);

export default app;