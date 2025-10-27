import { PrismaClient } from "../generated/prisma/client.js";
import { config } from "./app.config.js";

/**
 * Singleton do Prisma Client
 * Garante uma única instância do cliente em toda a aplicação
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isDevelopment ? ["query", "error", "warn"] : ["error"],
  });

if (config.isDevelopment) {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});
