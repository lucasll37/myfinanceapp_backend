import express from "express";
import type { Application } from "express";

import { corsConfig, helmetConfig, compresConfig, globalRateLimiter } from "./config/index.js";
import { errorMiddleware, loggerMiddleware, notFoundMiddleware } from "./middlewares/index.js";
import routes from "./routes/index.js";


class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.configureMiddlewares();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  private configureMiddlewares(): void {
    this.app.set("trust proxy", 1);
    this.app.use(helmetConfig);
    this.app.use(corsConfig);
    this.app.use(compresConfig);
    this.app.use(express.json({ limit: "1mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "1mb" }));
    this.app.use(loggerMiddleware);
    this.app.use("/api", globalRateLimiter);
  }

  private configureRoutes(): void {
    this.app.use("/api", routes);
  }

  private configureErrorHandling(): void {
    this.app.use(notFoundMiddleware);
    this.app.use(errorMiddleware);
  }
}

export default new App().app;