import express, { type NextFunction, type Request, type Response } from "express";
import auth from "../../middleware/auth.js";
import { fileUploader } from "../../utils/fileUploader.js";
import { parseMultipartJson } from "../../utils/multipartJson.js";
import { UserRole } from "../user/user.interface.js";
import { EventController } from "./event.controller.js";
import { EventValidation } from "./event.validation.js";

const router = express.Router();

// Public routes
router.get("/", EventController.getAllEvents);

// Static path must be declared before the parameterized one
router.get(
  "/my-hosted-events",
  auth(UserRole.HOST, UserRole.ADMIN),
  EventController.getMyHostedEvents,
);

router.get("/:eventId", EventController.getEventDetails);
// router.get("/featured", EventController.getFeaturedEvents);

// Protected routes - HOST only
router.post(
  "/create-event",
  auth(UserRole.HOST, UserRole.ADMIN),
  fileUploader.upload.single("file"),
  (req: Request, res: Response, next: NextFunction) => {
    req.body = EventValidation.createEvent.parse(parseMultipartJson(req));
    return EventController.createEvent(req, res, next);
  },
);

/**
 * UPDATE EVENT
 * expects multipart/form-data:
 * - data: JSON string
 * - file: image (optional)
 */
router.patch(
  "/:eventId",
  auth(UserRole.HOST, UserRole.ADMIN),
  fileUploader.upload.single("file"),
  (req: Request, res: Response, next: NextFunction) => {
    const parsed = parseMultipartJson(req);

    // Handle both keys (some clients send date, some send eventDate)
    const dt = parsed.eventDate ?? parsed.date;

    // Convert datetime-local -> ISO (with Z) for the datetime validator
    if (typeof dt === "string" && dt) {
      parsed.eventDate = dt.endsWith("Z") ? dt : new Date(dt).toISOString();
      delete parsed.date;
    }

    req.body = parsed;
    return EventController.updateEvent(req, res, next);
  },
);

/**
 * DELETE EVENT
 */
router.delete("/:eventId", auth(UserRole.HOST, UserRole.ADMIN), EventController.deleteEvent);

// router.get(
//   "/host/my-events",
//   auth(UserRole.HOST, UserRole.ADMIN),
//   EventController.getMyHostedEvents
// );

// router.get(
//   "/:eventId/statistics",
//   AuthMiddleware.authenticate,
//   AuthMiddleware.authorize("HOST", "ADMIN"),
//   eventController.getEventStatistics
// );
// router.patch(
//     "/status/:id",
//     auth(UserRole.HOST, UserRole.ADMIN),
//     EventController.changeStatus
// )

// router.get(
//     "/user/upcoming-events",
//     auth(UserRole.USER),
//     EventController.getUserEvents
// )

// router.get(
//     "/host/participants",
//     auth(UserRole.HOST),
//     EventController.getAllParticipantsOfHost
// )

// router.get(
//     "/host/events-revenue",
//     auth(UserRole.HOST),
//     EventController.getMyHostedEventsRevenue
// )

// router.post(
//     "/:id/join",
//     auth(UserRole.USER),
//     EventController.joinEvent
// )

// // join event
// router.post("/join/:id", auth(UserRole.USER), EventController.joinEvent);

// // leave events
// router.post("/leave/:id", auth(UserRole.USER), EventController.leaveEvent);

export const EventRoutes = router;
