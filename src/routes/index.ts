import { Router } from "express";
import type { Request, Response } from "express";
import userRoutes from "../modules/users/user.routes.js";

const routes = Router();

routes.use("/", userRoutes);

// Health check
routes.get('/health', (req: Request, res: Response): void => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 para rotas não mapeadas da API
routes.use((req: Request, res: Response) => res.status(404).json({ message: "Not found" }));

export default routes;