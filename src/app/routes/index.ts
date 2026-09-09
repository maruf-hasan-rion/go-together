import express from "express";
import { AdminRoutes } from "../module/admin/admin.route.js";
import { AuthRoutes } from "../module/auth/auth.route.js";
import { BookingRoutes } from "../module/booking/booking.route.js";
import { EventRoutes } from "../module/event/event.route.js";
import { MetaRoutes } from "../module/meta/meta.route.js";
import { PaymentRoutes } from "../module/payment/payment.route.js";
import { ReviewRoutes } from "../module/review/review.route.js";
import { UserRoutes } from "../module/user/user.route.js";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/admin",
    route: AdminRoutes,
  },
  {
    path: "/user",
    route: UserRoutes,
  },
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/event",
    route: EventRoutes,
  },
  {
    path: "/review",
    route: ReviewRoutes,
  },
  {
    path: "/bookings",
    route: BookingRoutes,
  },
  // {
  //   path: "/reviews",
  //   route: ReviewRoutes,
  // },
  {
    path: "/payments",
    route: PaymentRoutes,
  },
  // {
  //   path: "/stats",
  //   route: StatsRoutes,
  // },
  {
    path: "/meta",
    route: MetaRoutes,
  },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
