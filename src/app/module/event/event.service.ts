import httpStatus from "http-status";
import { deleteImageFromCloudinary } from "../../../config/index.js";
import {
  type Event,
  EventStatus,
  type EventType,
  type Prisma,
} from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { userPublicSelect } from "../../serializers/user.js";
import type { IPaginationOptions } from "../../types/pagination.js";
import ApiError from "../../utils/ApiError.js";
import { fileUploader } from "../../utils/fileUploader.js";
import { paginationHelper } from "../../utils/pagination.js";
import { eventSearchableFields } from "../admin/admin.constant.js";
import type { UserRole } from "../user/user.interface.js";

// const createEvent = async (user: IJWTPayload, req: Request) => {
//   const userInfo = await prisma.user.findUniqueOrThrow({
//     where: {
//       email: user.email,
//     },
//   });

//   const file = req.file;
//   let imageUrl = "";

//   if (file) {
//     const upload = await fileUploader.uploadToCloudinary(file);
//     if (!upload?.secure_url) {
//       throw new Error("Image upload failed");
//     }
//     imageUrl = upload.secure_url;
//   }

//   const {
//     title,
//     type,
//     description,
//     date,
//     location,
//     minParticipants = 1,
//     maxParticipants,
//     joiningFee = 0,
//     hostId,
//   } = req.body;

//   if (minParticipants > maxParticipants) {
//     throw new Error("Minimum participants cannot be greater than maximum");
//   }

//   const event = await prisma.event.create({
//     data: {
//       title,
//       type,
//       description,
//       eventDate: new Date(date),
//       location,
//       image: imageUrl,

//       minParticipants: Number(minParticipants),
//       maxParticipants: Number(maxParticipants),
//       joiningFee: Number(joiningFee),

//       status: "OPEN",
//       hostId,
//       // hostId: userInfo.id,
//     },
//   });

//   return event;
// };

const createEvent = async (userId: string, payload: any, imageUrl?: string): Promise<Event> => {
  if (!userId) throw new Error("Unauthorized");

  // let imageUrl = "";
  // if (req.file) {
  //   imageUrl = await fileUploader.uploadToCloudinary(req.file);
  // }

  const userData = await prisma.user.findUniqueOrThrow({
    where: {
      id: userId,
    },
    include: {
      hostApplications: true,
    },
  });

  if (userData.role !== "ADMIN") {
    if (!userData.hostApplications || userData.hostApplications.status !== "APPROVED") {
      throw new ApiError(httpStatus.FORBIDDEN, "Only approved hosts can create events");
    }
  }

  // if (userData.status === "SUSPENDED")
  //   throw new Error(
  //     "Your account has been suspended. You cannot perform this operation."
  //   );

  try {
    const createdEvent = await prisma.event.create({
      data: {
        title: payload.title,
        type: payload.type,
        description: payload.description,
        eventDate: new Date(payload.eventDate),
        location: payload.location,
        joiningFee: Number(payload.joiningFee),
        maxParticipants: Number(payload.maxParticipants),
        minParticipants:
          payload.minParticipants !== undefined ? Number(payload.minParticipants) : undefined,
        image: imageUrl || null,
        hostId: userId,
      },
    });

    return createdEvent;
  } catch (error) {
    if (imageUrl) await deleteImageFromCloudinary(imageUrl);
    throw error;
  }
};

// type UserRole = "HOST" | "ADMIN";

export const updateEvent = async (
  eventId: string,
  userId: string,
  role: UserRole,
  payload: any,
  file?: Express.Multer.File,
) => {
  const existing = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!existing || existing.deletedAt) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found");
  }

  // host can only edit own event, admin can edit any
  if (role !== "ADMIN" && existing.hostId !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, "You are not allowed to update this event");
  }

  if (existing.status === EventStatus.COMPLETED) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Completed events cannot be edited");
  }

  // build update object (only fields provided)
  const updateData: any = {};

  if (payload.title !== undefined) updateData.title = payload.title;
  if (payload.description !== undefined) updateData.description = payload.description;

  if (payload.type !== undefined) {
    updateData.type = payload.type;
  }

  if (payload.location !== undefined) updateData.location = payload.location;

  if (payload.eventDate !== undefined) {
    updateData.eventDate = new Date(payload.eventDate);
  }

  if (payload.minParticipants !== undefined)
    updateData.minParticipants = Number(payload.minParticipants);
  if (payload.joiningFee !== undefined) updateData.joiningFee = Number(payload.joiningFee);

  if (payload.maxParticipants !== undefined) {
    const nextMax = Number(payload.maxParticipants);
    const activeBookings = await prisma.booking.count({
      where: { eventId, status: { in: ["PENDING", "CONFIRMED"] } },
    });

    if (nextMax < activeBookings) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Capacity cannot be lower than the ${activeBookings} active booking(s)`,
      );
    }

    updateData.maxParticipants = nextMax;

    if (activeBookings >= nextMax) updateData.status = EventStatus.FULL;
    else if (existing.status === EventStatus.FULL) updateData.status = EventStatus.OPEN;
  }

  // optional image update -> Cloudinary (never store a local /uploads path)
  if (file) {
    const uploadResult = await fileUploader.uploadToCloudinary(file);
    updateData.image = uploadResult.secure_url;
    if (existing.image) await deleteImageFromCloudinary(existing.image);
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: updateData,
  });

  return updated;
};

const deleteEvent = async (eventId: string, userId: string, role: UserRole) => {
  const existing = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!existing || existing.deletedAt) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found");
  }

  if (role !== "ADMIN" && existing.hostId !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, "You are not allowed to delete this event");
  }

  // Refuse to delete an event that already has paid attendees.
  const confirmedBookings = await prisma.booking.count({
    where: { eventId, status: "CONFIRMED" },
  });
  if (confirmedBookings > 0) {
    throw new ApiError(
      httpStatus.CONFLICT,
      `Cannot delete an event with ${confirmedBookings} confirmed booking(s)`,
    );
  }

  // Soft delete: keep the row + its bookings, hide it everywhere.
  await prisma.event.update({
    where: { id: eventId },
    data: { deletedAt: new Date(), status: EventStatus.CANCELLED },
  });

  return { deleted: true };
};

// const changeStatus = async (
//   user: IJWTPayload,
//   eventId: string,
//   status: EventStatus
// ) => {
//   const userInfo = await prisma.user.findUniqueOrThrow({
//     where: { email: user.email },
//   });

//   const existingEvent = await prisma.event.findUnique({
//     where: { id: eventId },
//   });

//   if (!existingEvent) {
//     throw new Error("Event not found");
//   }

//   if (
//     existingEvent.hostId !== userInfo.id &&
//     userInfo.role !== UserRole.ADMIN
//   ) {
//     throw new Error("You are not allowed to update this event status");
//   }

//   if (existingEvent.status === EventStatus.COMPLETED) {
//     throw new Error("Completed event status cannot be changed");
//   }

//   const result = await prisma.event.update({
//     where: { id: eventId },
//     data: {
//       status,
//     },
//   });

//   return result;
// };

// const getAllEvents = async (query: EventSearchParams) => {
//   const where = buildEventSearchQuery(query);

//   console.log(query);

//   const events = await prisma.event.findMany({
//     where,
//     orderBy: {
//       createdAt: "desc",
//     },
//     include: {
//       host: {
//         select: {
//           id: true,
//           email: true,
//           fullName: true,
//           profilePhoto: true,
//         },
//       },
//       _count: {
//         select: {
//           bookings: true,
//         },
//       },
//     },
//   });

//   return events;
// };

const getAllEvents = async (params: any, options: IPaginationOptions, _user: any) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const { searchTerm, category, date, status, ...filterData } = params;

  const andConditions: Prisma.EventWhereInput[] = [];

  andConditions.push({ deletedAt: null });

  const now = new Date();

  // Default public browse = OPEN + future. An explicit status/date filter overrides the default.
  if (status) {
    andConditions.push({ status: status as EventStatus });
  } else {
    andConditions.push({ status: EventStatus.OPEN });
  }

  if (searchTerm) {
    andConditions.push({
      OR: eventSearchableFields.map((field) => ({
        [field]: { contains: String(searchTerm), mode: "insensitive" },
      })),
    });
  }

  if (category) {
    andConditions.push({
      type: { has: category as EventType },
    });
  }

  if (date) {
    const parsed = new Date(String(date));
    if (!Number.isNaN(parsed.getTime())) {
      const start = new Date(parsed);
      start.setHours(0, 0, 0, 0);

      const end = new Date(parsed);
      end.setHours(23, 59, 59, 999);

      andConditions.push({ eventDate: { gte: start, lte: end } });
    }
  } else if (!status) {
    andConditions.push({ eventDate: { gte: now } });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: { equals: (filterData as any)[key] },
      })),
    });
  }

  const whereConditions: Prisma.EventWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const events = await prisma.event.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: "desc" },
    include: { host: { select: userPublicSelect } },
  });

  const total = await prisma.event.count({ where: whereConditions });

  return {
    meta: { page, limit, total },
    data: events,
  };
};

const getEventDetails = async (eventId: string) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      host: { select: userPublicSelect },
      bookings: { select: { id: true, userId: true, status: true } },
    },
  });

  if (!event || event.deletedAt) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found");
  }

  const participantsCount = event.bookings.filter((b) => b.status === "CONFIRMED").length;

  return {
    ...event,
    participantsCount,
  };
};

// const getUserEvents = async (user: IJWTPayload, query: MyEventQuery) => {
//   const userInfo = await prisma.user.findUniqueOrThrow({
//     where: { email: user.email },
//   });

//   const today = new Date();

//   let dateFilter = {};

//   if (query.type === "past") {
//     dateFilter = {
//       lt: today,
//     };
//   } else {
//     dateFilter = {
//       gte: today,
//     };
//   }

//   const upcomingEvents = await prisma.booking.findMany({
//     where: {
//       userId: userInfo.id,

//       event: {
//         eventDate: dateFilter,
//       },

//       OR: [{ paymentStatus: "FREE" }, { paymentStatus: "PAID" }],
//     },

//     include: {
//       event: {
//         include: {
//           host: {
//             select: {
//               id: true,
//               email: true,
//               profile: true,
//             },
//           },
//           _count: {
//             select: {
//               participants: true,
//             },
//           },
//         },
//       },
//     },
//     orderBy: {
//       event: {
//         date: "asc",
//       },
//     },
//   });
//   return upcomingEvents.map((p: { event: any }) => p.event);
// };

// const getMyEvents = async (user: IJWTPayload) => {
//   const userInfo = await prisma.user.findUniqueOrThrow({
//     where: { email: user.email },
//   });

//   console.log("id", userInfo.id);

//   const events = await prisma.event.findMany({
//     where: {
//       hostId: userInfo.id,
//     },
//     orderBy: {
//       createdAt: "desc",
//     },
//     include: {
//       host: {
//         select: {
//           id: true,
//           email: true,
//           profile: {
//             select: {
//               fullName: true,
//               image: true,
//             },
//           },
//         },
//       },
//       _count: {
//         select: {
//           participants: true,
//         },
//       },
//     },
//   });

//   return events;
// };

// const getAllParticipantsOfHost = async (user: IJWTPayload) => {
//   const userInfo = await prisma.user.findUniqueOrThrow({
//     where: { email: user.email },
//   });

//   const participants = await prisma.participant.findMany({
//     where: {
//       event: {
//         hostId: userInfo.id,
//       },
//     },
//     include: {
//       user: {
//         select: {
//           profile: {
//             select: {
//               fullName: true,
//               image: true,
//               location: true,
//             },
//           },
//         },
//       },
//       event: {
//         select: {
//           id: true,
//           title: true,
//           type: true,
//           image: true,
//           date: true,
//           status: true,
//         },
//       },
//     },
//     orderBy: {
//       joinedAt: "desc",
//     },
//   });

//   return participants;
// };

// const getMyHostedEventsRevenue = async (user: IJWTPayload) => {
//   const userInfo = await prisma.user.findUniqueOrThrow({
//     where: { email: user.email },
//   });

//   const events = await prisma.event.findMany({
//     where: { hostId: userInfo.id },
//     select: {
//       id: true,
//       title: true,
//       type: true,
//       image: true,
//       date: true,
//       status: true,
//       joiningFee: true,
//       participants: {
//         where: { paymentStatus: "PAID" },
//         select: { id: true },
//       },
//     },
//   });

//   const revenueData = events.map(
//     (event: {
//       participants: string | any[];
//       joiningFee: number;
//       id: any;
//       title: any;
//       type: any;
//       image: any;
//       status: any;
//       date: any;
//     }) => {
//       const participantsCount = event.participants.length;
//       const pricePerPerson = event.joiningFee || 0;
//       const totalRevenue = participantsCount * pricePerPerson;

//       return {
//         eventId: event.id,
//         eventTitle: event.title,
//         eventType: event.type,
//         eventImage: event.image,
//         eventStatus: event.status,
//         eventDate: event.date,
//         participantsCount,
//         pricePerPerson,
//         totalRevenue,
//       };
//     }
//   );

//   const totalRevenue = revenueData.reduce(
//     (sum: any, e: { totalRevenue: any }) => sum + e.totalRevenue,
//     0
//   );

//   return { revenueData, totalRevenue };
// };
// join event

// export const joinEvent = async (eventId: string, user: any) => {
//   const client = await prisma.user.findUnique({
//     where: { email: user.email },
//     // include: { user: true },
//   });
//   if (!user) throw new Error("Client not found");
//   if (user?.user.status === "SUSPENDED")
//     throw new Error(
//       "Your account has been suspended. You cannot perform this operation."
//     );
//   if (user.isDeleted) throw new Error("Client account is deleted");
//   if (user.user.status !== "ACTIVE")
//     throw new Error("Client account is not active");

//   const event = await prisma.event.findUnique({
//     where: { id: eventId },
//     include: { host: true },
//   });

//   if (!event) throw new Error("Event not found");
//   if (event.status !== EventStatus.OPEN) throw new Error("Event is not open");
//   if (event.eventDate < new Date()) throw new Error("Event date has passed");

//   const existing = await prisma.eventParticipant.findFirst({
//     where: {
//       eventId,
//       userId: user.id,
//       participantStatus: { not: ParticipantStatus.LEFT },
//     },
//   });

//   if (existing) throw new Error("You have already joined this event");

//   const transactionId = getTransactionId();

//   const result = await prisma.$transaction(async (tx) => {
//     const eventForUpdate = await tx.event.findUnique({
//       where: { id: eventId },
//     });

//     if (!eventForUpdate) throw new Error("Event not found");

//     if (eventForUpdate.maxParticipants < 1) {
//       throw new Error("No seats available");
//     }

//     const newParticipant = await tx.eventParticipant.create({
//       data: {
//         eventId,
//         userId: user.id,
//         participantStatus: ParticipantStatus.PENDING,
//         transactionId,
//       },
//     });

//     const payment = await tx.payment.create({
//       data: {
//         transactionId,
//         amount: eventForUpdate.joiningFee,
//         participantId: newParticipant.id,
//         eventId,
//         userId: user.id,
//         hostId: eventForUpdate.hostId,
//         paymentStatus: PaymentStatus.PENDING,
//       },
//     });

//     const newCapacity = eventForUpdate.maxParticipants - 1;
//     if (newCapacity < 0) {
//       throw new Error("No seats available");
//     }

//     const eventUpdateData: any = { maxParticipants: newCapacity };
//     if (newCapacity === 0) {
//       eventUpdateData.status = EventStatus.FULL;
//     }

//     const updatedEvent = await tx.event.update({
//       where: { id: eventId },
//       data: eventUpdateData,
//     });

//     const sslPayload: ISSLCommerz = {
//       address: user.location,
//       email: user.email,
//       phoneNumber: user.contactNumber,
//       name: user.name,
//       amount: eventForUpdate.joiningFee,
//       transactionId: transactionId,
//     };

//     const sslPayment = await SSLService.sslPaymentInit(sslPayload);

//     return {
//       paymentUrl: sslPayment.GatewayPageURL,
//       newParticipant,
//       payment,
//       updatedEvent,
//     };
//   });

//   return result;
// };

// leave event
// export const leaveEvent = async (eventId: string, user: any) => {
//   const client = await prisma.user.findUnique({
//     where: { email: user.email },
//     include: { user: true },
//   });

//   if (!client) throw new Error("Client not found");

//   if (client?.user.status === "SUSPENDED")
//     throw new Error(
//       "Your account has been suspended. You cannot perform this operation."
//     );

//   if (client.isDeleted) throw new Error("Client account is deleted");
//   if (client.user.status !== "ACTIVE")
//     throw new Error("Client account is not active");

//   const participation = await prisma.eventParticipant.findFirst({
//     where: {
//       eventId,
//       clientId: client.id,
//       participantStatus: { not: ParticipantStatus.LEFT },
//     },
//     include: {
//       event: true,
//       client: true,
//     },
//   });
//   if (!participation)
//     throw new Error("You have not joined this event or already left");
//   if (participation.event.date < new Date())
//     throw new Error("Event date has passed, you cannot leave now");

//   const result = await prisma.$transaction(async (tx) => {
//     const updatedParticipation = await tx.eventParticipant.update({
//       where: { id: participation.id },
//       data: { participantStatus: ParticipantStatus.LEFT },
//     });

//     const eventCurrent = await tx.event.findUnique({
//       where: { id: participation.eventId },
//       select: { capacity: true, status: true },
//     });

//     if (!eventCurrent) throw new Error("Event not found");

//     const eventUpdateData: any = { capacity: eventCurrent.capacity + 1 };

//     if (eventCurrent.status === EventStatus.FULL) {
//       eventUpdateData.status = EventStatus.OPEN;
//     }

//     const updatedEvent = await tx.event.update({
//       where: { id: participation.eventId },
//       data: eventUpdateData,
//     });

//     return { updatedParticipation, updatedEvent };
//   });
//   return result;
// };
// const deleteEvent = async (user: IJWTPayload, req: Request) => {
//   const { id } = req.params;

//   const userInfo = await prisma.user.findUniqueOrThrow({
//     where: { email: user.email },
//   });

//   const existingEvent = await prisma.event.findUniqueOrThrow({
//     where: { id },
//   });

//   if (
//     existingEvent.hostId !== userInfo.id &&
//     userInfo.role !== UserRole.ADMIN
//   ) {
//     throw new Error("You are not allowed to delete this event");
//   }

//   if (existingEvent.status === "COMPLETED") {
//     throw new Error("Completed events cannot be deleted");
//   }

//   // await prisma.participant.deleteMany({
//   //   where: { eventId: id },
//   // });

//   const deletedEvent = await prisma.event.delete({
//     where: { id },
//   });

//   return deletedEvent;
// };
export const getMyHostedEvents = async (hostId: string, options: IPaginationOptions = {}) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);

  const where: Prisma.EventWhereInput = { hostId, deletedAt: null };

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      skip,
      take: limit,
      orderBy: { eventDate: "desc" },
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    }),
    prisma.event.count({ where }),
  ]);

  return { meta: { page, limit, total }, data: events };
};

export const getRecentEvents = async (limit = 6) => {
  return prisma.event.findMany({
    where: { status: EventStatus.OPEN, eventDate: { gte: new Date() }, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { host: { select: userPublicSelect } },
  });
};

export const getMyEvents = async (userId: string, options: IPaginationOptions = {}) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);

  const where: Prisma.BookingWhereInput = {
    userId,
    status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] },
    event: { deletedAt: null },
  };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take: limit,
      orderBy: { bookedAt: "desc" },
      include: {
        event: { include: { host: { select: userPublicSelect } } },
      },
    }),
    prisma.booking.count({ where }),
  ]);

  return { meta: { page, limit, total }, data: bookings.map((b) => b.event) };
};

export const getEventParticipants = async (
  eventId: string,
  userId: string,
  role: string,
  options: IPaginationOptions = {},
) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { hostId: true, deletedAt: true },
  });

  if (!event || event.deletedAt) throw new ApiError(httpStatus.NOT_FOUND, "Event not found");
  if (role !== "ADMIN" && event.hostId !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, "You are not allowed to view participants");
  }

  const { page, limit, skip } = paginationHelper.calculatePagination(options);

  const where: Prisma.BookingWhereInput = {
    eventId,
    status: { in: ["CONFIRMED", "COMPLETED"] },
  };

  const [participants, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take: limit,
      orderBy: { bookedAt: "asc" },
      include: { user: { select: userPublicSelect } },
    }),
    prisma.booking.count({ where }),
  ]);

  return { meta: { page, limit, total }, data: participants };
};

export const completeEvent = async (eventId: string, userId: string, role: string) => {
  const existing = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!existing || existing.deletedAt) throw new ApiError(httpStatus.NOT_FOUND, "Event not found");
  if (role !== "ADMIN" && existing.hostId !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, "You are not allowed to complete this event");
  }
  if (existing.status === EventStatus.COMPLETED) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Event is already completed");
  }
  if (existing.status === EventStatus.CANCELLED) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Cancelled events cannot be completed");
  }

  return prisma.$transaction(async (tx) => {
    await tx.booking.updateMany({
      where: { eventId, status: { in: ["PENDING", "CONFIRMED"] } },
      data: { status: "COMPLETED" },
    });

    const updated = await tx.event.update({
      where: { id: eventId },
      data: { status: EventStatus.COMPLETED },
    });

    return updated;
  });
};

export const EventService = {
  createEvent,
  updateEvent,
  getAllEvents,
  getEventDetails,
  getRecentEvents,
  getMyEvents,
  getEventParticipants,
  completeEvent,
  deleteEvent,
  getMyHostedEvents,
};
