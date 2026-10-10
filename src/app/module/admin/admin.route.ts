import { Router } from "express";
import auth from "../../middleware/auth.js";
import { UserRole } from "../user/user.interface.js";
import { AdminController } from "./admin.controller.js";

const router = Router();

// Static paths are declared before parameterized ones.
router.get("/users", auth(UserRole.ADMIN), AdminController.getAllUsers);
router.get("/hosts", auth(UserRole.ADMIN), AdminController.getHosts);

router.patch("/users/:id/block", auth(UserRole.ADMIN), AdminController.blockUser);
router.patch("/users/:id/unblock", auth(UserRole.ADMIN), AdminController.unblockUser);
router.delete("/users/:id", auth(UserRole.ADMIN), AdminController.deleteUser);

router.get("/host-applications", auth(UserRole.ADMIN), AdminController.getAllHostApplications);

router.patch("/host-applications/:id/approve", auth(UserRole.ADMIN), AdminController.approveHost);
router.patch("/host-applications/:id/reject", auth(UserRole.ADMIN), AdminController.rejectHost);

export const AdminRoutes = router;
