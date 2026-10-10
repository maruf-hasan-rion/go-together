import type { Server } from "node:http";
import cron from "node-cron";
import app from "./app.js";
import { expireStalePendingBookings } from "./app/module/booking/booking.service.js";
import config from "./config/index.js";

async function bootstrap() {
  // This variable will hold our server instance
  let server: Server;

  try {
    // Start the server
    server = app.listen(config.port, () => {
      console.log(`🚀 Server is running on http://localhost:${config.port}`);
    });

    // Release seats held by abandoned PENDING bookings (belt-and-braces on
    // top of the per-request lazy expiry in createBookingService).
    cron.schedule("0 * * * *", async () => {
      try {
        const count = await expireStalePendingBookings();
        if (count > 0) {
          console.log(`Sweeper cancelled ${count} stale PENDING booking(s).`);
        }
      } catch (error) {
        console.error("Booking expiry sweep failed:", error);
      }
    });

    // Function to gracefully shut down the server
    const exitHandler = (code: number) => {
      const shutdown = () => {
        console.log("Server closed gracefully.");
        process.exit(code);
      };
      if (server) {
        server.close(shutdown);
        // Force-exit if open connections keep the server from closing
        setTimeout(() => process.exit(code), 10_000).unref();
      } else {
        process.exit(code);
      }
    };

    process.on("SIGINT", () => exitHandler(0));
    process.on("SIGTERM", () => exitHandler(0));

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (error) => {
      console.log("Unhandled Rejection is detected, we are closing our server...", error);
      exitHandler(1);
    });
  } catch (error) {
    console.error("Error during server startup:", error);
    process.exit(1);
  }
}

bootstrap();
