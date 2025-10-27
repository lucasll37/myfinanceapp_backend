import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

router.get("/", (req: Request, res: Response): void => {
  res.send("Servidor Node + TypeScript funcionando! 🚀");
});

export default router;