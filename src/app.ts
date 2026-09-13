import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application, type Request, type Response } from "express";
import helmet from "helmet";
import globalErrorHandler from "./app/middleware/globalErrorHandler.js";
import { globalLimiter } from "./app/middleware/rateLimiter.js";
import notFound from "./app/middleware/notFound.js";
import router from "./app/routes/index.js";
import config from "./config/index.js";

const app: Application = express();

// Reverse proxy (Render/Vercel) so rate limiting sees the real client IP
app.set("trust proxy", 1);

// Security headers
app.use(helmet());

app.use(
  cors({
    origin: config.cors_origins,
    credentials: true,
  }),
);

// Cookie secret enables signed-cookie parsing. The auth cookies are
// intentionally unsigned: they are JWTs verified on every request, and the
// frontend proxy re-issues them verbatim.
app.use(cookieParser(config.cookie_secret));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Coarse abuse guard for the whole API
app.use(globalLimiter);

app.use("/api/v1", router);

app.get("/", (_req: Request, res: Response) => {
  res.send({
    message: "Server is running..",
    environment: config.node_env,
    uptime: `${process.uptime().toFixed(2)} sec`,
    timeStamp: new Date().toISOString(),
  });
});

app.use(globalErrorHandler);

app.use(notFound);

export default app;
