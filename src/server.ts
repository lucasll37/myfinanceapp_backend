import app from "./app.js";
import { config, prisma } from "./config/index.js";
import { logger } from "./utils/index.js";


const startServer = (): void => {
  const server = app.listen(config.port, config.host, () => {
    logger.info(`🚀 Server started successfully`);
    logger.info(`📍 Environment: ${config.env}`);
    logger.info(`🌐 Server running at http://${config.host}:${config.port}`);
    logger.info(`💚 Health check: http://${config.host}:${config.port}/api/health`);
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    server.close(async () => {
      logger.info("HTTP server closed");

      try {
        await prisma.$disconnect();
        logger.info("Database connection closed");
        process.exit(0);

      }
      
      catch (error) {
        logger.error("Error during graceful shutdown", error);
        process.exit(1);
      }
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  // Handlers para shutdown graceful
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  // Handler para erros não tratados
  process.on("unhandledRejection", (reason: unknown) => {
    logger.error("Unhandled Rejection", reason);
    // Em produção, considere fazer graceful shutdown aqui
  });

  process.on("uncaughtException", (error: Error) => {
    logger.error("Uncaught Exception", error);
    gracefulShutdown("UNCAUGHT_EXCEPTION");
  });
};

startServer();
