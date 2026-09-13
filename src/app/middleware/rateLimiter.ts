import { rateLimit } from "express-rate-limit";

/** Brute-force protection for credential endpoints. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again later.",
  },
});

/**
 * Coarse abuse guard for the whole API.
 *
 * NOTE: the Next.js frontend calls this API server-to-server, so all of
 * its users share one source IP. The limit therefore has to be generous;
 * per-user protection belongs to the route-level limiters (authLimiter)
 * and the auth middleware.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});
