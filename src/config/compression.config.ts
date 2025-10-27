import { config } from "./app.config.js";
import compression from "compression";


export const compresConfig = compression({
    level: config.compression.level,
    threshold: config.compression.threshold,
    filter: (req, res) => {
        if (req.headers["x-no-compression"]) return false;
        return compression.filter(req, res);
    }
})