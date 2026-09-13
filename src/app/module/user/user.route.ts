import express, { type NextFunction, type Request, type Response } from "express";
import auth from "../../middleware/auth.js";
import { fileUploader } from "../../utils/fileUploader.js";
import { parseMultipartJson } from "../../utils/multipartJson.js";
import { UserController } from "./user.controller.js";
import { UserRole } from "./user.interface.js";
import { UserValidation } from "./user.validation.js";

const router = express.Router();

router.post(
  "/create-user",
  fileUploader.upload.single("file"),
  (req: Request, res: Response, next: NextFunction) => {
    req.body = UserValidation.createUser.parse(parseMultipartJson(req));
    return UserController.createUser(req, res, next);
  },
);

// router.post("/become-host", auth(UserRole.USER), UserController.becomeHost);

router.patch(
  "/update-my-profile",
  auth(UserRole.ADMIN, UserRole.HOST, UserRole.USER),
  fileUploader.upload.single("file"),
  (req: Request, res: Response, next: NextFunction) => {
    // Only whitelisted fields survive the schema; role/email/password
    // and unknown keys are stripped here.
    req.body = UserValidation.updateMyProfile.parse(parseMultipartJson(req));
    return UserController.updateMyProfile(req, res, next);
  },
);

export const UserRoutes = router;
