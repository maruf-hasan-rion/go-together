import express from "express";
import { UserRoutes } from "../modules/user/user.routes";
import { AuthRoutes } from "../modules/auth/auth.routes";
import { EventRoutes } from "../modules/event/event.routes";
import { ReviewRoutes } from "../modules/review/review.routes";
import { AdminRoutes } from "../modules/admin/admin.routes";
import { BookingRoutes } from "../modules/booking/booking.routes";
import { MetaRoutes } from "../modules/Meta/meta.routes";
import { PaymentRoutes } from "../modules/payment/payment.routes";

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

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
