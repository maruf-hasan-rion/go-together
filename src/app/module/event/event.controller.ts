import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { IJWTPayload } from "../../types/common.js";
import ApiError from "../../utils/ApiError.js";
import catchAsync from "../../utils/catchAsync.js";
import { fileUploader } from "../../utils/fileUploader.js";
import pick from "../../utils/pick.js";
import sendResponse from "../../utils/sendResponse.js";
import { eventFilterableFields } from "../admin/admin.constant.js";
import { EventService } from "./event.service.js";

// const createEvent = catchAsync(
//   async (req: Request & { user?: IJWTPayload }, res: Response) => {
//     const user = req.user;
//     const result = await EventService.createEvent(user as IJWTPayload, req);
//     sendResponse(res, {
//       statusCode: httpStatus.OK,
//       success: true,
//       message: "Event Created Successfully",
//       data: result,
//     });
//   }
// );

const createEvent = catchAsync(async (req: Request & { user?: IJWTPayload }, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
  }

  const payload = req.body;

  let imageUrl = "";
  if (req.file) {
    const uploadResult = await fileUploader.uploadToCloudinary(req.file);
    imageUrl = uploadResult.secure_url;
  }
  const result = await EventService.createEvent(userId, payload, imageUrl);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Event Created successfully!",
    data: result,
  });
});

// const updateEvent = catchAsync(
//   async (req: Request & { user?: IJWTPayload }, res: Response) => {
//     const user = req.user;
//     const result = await EventService.updateEvent(user as IJWTPayload, req);

//     sendResponse(res, {
//       statusCode: httpStatus.OK,
//       success: true,
//       message: "Event Updated Successfully!",
//       data: result,
//     });
//   }
// );
// const deleteEvent = catchAsync(
//   async (req: Request & { user?: IJWTPayload }, res: Response) => {
//     const user = req.user;
//     const result = await EventService.deleteEvent(user as IJWTPayload, req);

//     sendResponse(res, {
//       statusCode: 200,
//       success: true,
//       message: "Event deleted successfully!",
//       data: result,
//     });
//   }
// );

// const changeStatus = catchAsync(
//   async (req: Request & { user?: IJWTPayload }, res: Response) => {
//     const eventId = req.params.id;
//     const { status } = req.body;
//     const user = req.user;
//     const result = await EventService.changeStatus(
//       user as IJWTPayload,
//       eventId as string,
//       status as EventStatus
//     );

//     sendResponse(res, {
//       statusCode: httpStatus.OK,
//       success: true,
//       message: "Event status updated successfully",
//       data: result,
//     });
//   }
// );
/**
 * UPDATE EVENT
 * multipart/form-data
 * - req.body already parsed from JSON in route
 * - req.file handled by multer
 */
export const updateEvent = catchAsync(
  async (req: Request & { user?: IJWTPayload }, res: Response) => {
    const user = req.user!;

    const result = await EventService.updateEvent(
      req.params.eventId,
      user.id,
      user.role,
      req.body,
      req.file,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Event Updated Successfully!",
      data: result,
    });
  },
);

/**
 * DELETE EVENT
 */
export const deleteEvent = catchAsync(
  async (req: Request & { user?: IJWTPayload }, res: Response) => {
    const user = req.user!;

    const result = await EventService.deleteEvent(req.params.eventId, user.id, user.role);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Event Deleted Successfully!",
      data: result,
    });
  },
);

const getAllEvents = catchAsync(async (req: Request & { user?: IJWTPayload }, res: Response) => {
  const filters = pick(req.query, eventFilterableFields);
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);
  const user = req.user;

  const result = await EventService.getAllEvents(filters, options, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All Events Retrieved Successfully!",
    data: result,
  });
});

const getEventDetails = catchAsync(async (req: Request, res: Response) => {
  const eventId = req.params.eventId;
  const result = await EventService.getEventDetails(eventId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Event details fetched successfully!",
    data: result,
  });
});

// const getUserEvents = catchAsync(
//   async (req: Request & { user?: IJWTPayload }, res: Response) => {
//     const user = req.user;
//     const query = req.query;
//     const result = await EventService.getUserEvents(user as IJWTPayload, query);

//     sendResponse(res, {
//       statusCode: 200,
//       success: true,
//       message: "Upcoming events fetched successfully!",
//       data: result,
//     });
//   }
// );

// const getMyHostedEvents = catchAsync(
//   async (req: Request & { user?: IJWTPayload }, res: Response) => {
//     const user = req.user;
//     const result = await EventService.getMyHostedEvents(user as IJWTPayload);

//     sendResponse(res, {
//       statusCode: 200,
//       success: true,
//       message: "All event fetched successfully!",
//       data: result,
//     });
//   }
// );

// const getAllParticipantsOfHost = catchAsync(
//   async (req: Request & { user?: IJWTPayload }, res: Response) => {
//     const user = req.user;
//     const result = await EventService.getAllParticipantsOfHost(
//       user as IJWTPayload
//     );

//     sendResponse(res, {
//       statusCode: 200,
//       success: true,
//       message: "All participants of host fetched successfully!",
//       data: result,
//     });
//   }
// );

// const getMyHostedEventsRevenue = catchAsync(
//   async (req: Request & { user?: IJWTPayload }, res: Response) => {
//     const user = req.user;
//     const result = await EventService.getMyHostedEventsRevenue(
//       user as IJWTPayload
//     );

//     sendResponse(res, {
//       statusCode: 200,
//       success: true,
//       message: "All events revenue data fetched successfully!",
//       data: result,
//     });
//   }
// );

// const joinEvent = catchAsync(
//   async (req: Request & { user?: IJWTPayload }, res: Response) => {
//     const user = req.user;
//     const result = await EventService.joinEvent(user as IJWTPayload, req);
//     sendResponse(res, {
//       statusCode: httpStatus.OK,
//       success: true,
//       message: "Successfully joined the event",
//       data: result,
//     });
//   }
// );

// const joinEvent = catchAsync(
//   async (req: Request & { user?: IJWTPayload }, res: Response) => {
//     const { id } = req.params;
//     const user = req.user;

//     console.log(id);
//     console.log(user);
//     const result = await EventService.joinEvent(id, user);
//     sendResponse(res, {
//       statusCode: httpStatus.OK,
//       success: true,
//       message: "Your have joined  Event successfully",
//       data: result,
//     });
//   }
// );

// // leave event
// const leaveEvent = catchAsync(
//   async (req: Request & { user?: IJWTPayload }, res: Response) => {
//     const { id } = req.params;
//     const user = req.user;

//     const result = await EventService.leaveEvent(id, user);
//     sendResponse(res, {
//       statusCode: httpStatus.OK,
//       success: true,
//       message: "You have left the Event successfully",
//       data: result,
//     });
//   }
// );
export const getMyHostedEvents = catchAsync(
  async (req: Request & { user?: IJWTPayload }, res: Response) => {
    const result = await EventService.getMyHostedEvents(req.user!.id);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Hosted events fetched successfully",
      data: result,
    });
  },
);
export const EventController = {
  createEvent,
  updateEvent,
  getAllEvents,
  getEventDetails,
  // getMyEvents,
  deleteEvent,
  // joinEvent,
  // leaveEvent,
  getMyHostedEvents,
};
