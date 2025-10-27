import { Router } from "express";
import type { Request, Response } from "express";
import userRoutes from "../modules/users/user.routes.js";
import healthRoutes from "./health.routes.js";

const routes = Router();

routes.use("/health", healthRoutes);
routes.use("/", userRoutes);

// Adicionar novas rotas aqui conforme forem criadas
// routes.use("/auth", authRoutes);
// routes.use("/accounts", accountRoutes);
// routes.use("/categories", categoryRoutes);

export default routes;