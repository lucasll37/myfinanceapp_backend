import { Router } from "express";
import type { Request, Response } from "express";
import { prisma } from "../config/index.js";

const router = Router();

/**
 * Health check básico
 * GET /health
 */
router.get("/", (req: Request, res: Response): void => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

/**
 * Health check detalhado (com verificação de banco)
 * GET /health/detailed
 */
router.get("/detailed", async (req: Request, res: Response): Promise<void> => {
  try {
    // Verifica conexão com o banco
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      services: {
        database: "connected",
      },
      uptime: process.uptime(),
      memory: {
        used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
      },
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      services: {
        database: "disconnected",
      },
    });
  }
});

export default router;
