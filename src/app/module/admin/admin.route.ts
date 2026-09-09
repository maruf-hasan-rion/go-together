import { Router } from "express";
import auth from "../../middleware/auth.js";
import { UserRole } from "../user/user.interface.js";
import { AdminController } from "./admin.controller.js";

const router = Router();

// router.get("/dashboard", adminController.getDashboardStats);
// router.patch("/users/:userId/role", adminController.updateUserRole);
// router.patch("/users/:userId/toggle-status", adminController.toggleUserStatus);
// router.delete("/users/:userId", adminController.deleteUser);
// router.patch("/events/:eventId/status", adminController.updateEventStatus);

// router.get(
//   "/admin/host-requests",
//   auth(UserRole.ADMIN),
//   AdminController.hostRequests
// );

router.get("/users", auth(UserRole.ADMIN), AdminController.getAllUsers);

router.get("/host-applications", auth(UserRole.ADMIN), AdminController.getAllHostApplications);

// router.patch(
//   "/admin/host-requests/:id",
//   auth(UserRole.ADMIN),
//   AdminController.updateHostStatus
// );

// approve host application
router.patch("/host-applications/:id/approve", auth(UserRole.ADMIN), AdminController.approveHost);

// reject host application
router.patch("/host-applications/:id/reject", auth(UserRole.ADMIN), AdminController.rejectHost);

export const AdminRoutes = router;
