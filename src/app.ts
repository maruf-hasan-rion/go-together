import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application, type Request, type Response } from "express";
import globalErrorHandler from "./app/middleware/globalErrorHandler.js";
import notFound from "./app/middleware/notFound.js";
import router from "./app/routes/index.js";
import config from "./config/index.js";

// import { PaymentController } from "./app/module/payment/payment.controller.js";

const app: Application = express();

// app.post(
//   "/webhook",
//   express.raw({ type: "application/json" }),
//   PaymentController.handleStripeWebhookEvent
// );

app.use(
  cors({
    origin: ["http://localhost:3000", "https://go-together-frontend-ten.vercel.app"],
    credentials: true,
  }),
);

//parser
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
