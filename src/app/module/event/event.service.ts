import httpStatus from "http-status";
import { deleteImageFromCloudinary } from "../../../config/index.js";
import {
  type Event,
  EventStatus,
  type EventType,
  type Prisma,
} from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import type { IPaginationOptions } from "../../types/pagination.js";
import ApiError from "../../utils/ApiError.js";
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

  if (!userData?.hostApplications) {
    throw new ApiError(httpStatus.FORBIDDEN, "Only hosts can create events");
  }

  // if (userData.status === "SUSPENDED")
  //   throw new Error(
  //     "Your account has been suspended. You cannot perform this operation."
  //   );

  try {
    const createdEvent = await prisma.event.create({
      data: {
        ...payload,
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

  if (!existing) {
    throw new Error("Event not found");
  }

  // ✅ host can only edit own event, admin can edit any
  if (role !== "ADMIN" && existing.hostId !== userId) {
    throw new Error("You are not allowed to update this event");
  }

  // ✅ build update object (only fields provided)
  const updateData: any = {};

  if (payload.title !== undefined) updateData.title = payload.title;
  if (payload.description !== undefined) updateData.description = payload.description;

  if (payload.type !== undefined) {
    // type must be array and non-empty (validation already ensures)
    updateData.type = payload.type;
  }

  if (payload.location !== undefined) updateData.location = payload.location;

  if (payload.eventDate !== undefined) {
    // eventDate should be ISO string -> convert to Date
    updateData.eventDate = new Date(payload.eventDate);
  }

  if (payload.minParticipants !== undefined)
    updateData.minParticipants = Number(payload.minParticipants);
  if (payload.maxParticipants !== undefined)
    updateData.maxParticipants = Number(payload.maxParticipants);
  if (payload.joiningFee !== undefined) updateData.joiningFee = Number(payload.joiningFee);
  if (payload.status !== undefined) updateData.status = payload.status;

  // ✅ optional image update
  if (file) {
    // store file url/path based on your upload system
    // example: file.path or cloud url
    updateData.image = `/uploads/${file.filename}`;
  }

  // ✅ if maxParticipants changed, you may also want to enforce FULL/OPEN
  // optional: keep your logic here if needed

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

  if (!existing) {
    throw new Error("Event not found");
  }

  if (role !== "ADMIN" && existing.hostId !== userId) {
    throw new Error("You are not allowed to delete this event");
  }

  // Prisma will cascade bookings due to relation onDelete: Cascade
  await prisma.event.delete({ where: { id: eventId } });

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

const getAllEvents = async (params: any, options: IPaginationOptions, user: any) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const { searchTerm, category, date, status, ...filterData } = params;

  const andConditions: Prisma.EventWhereInput[] = [];

  andConditions.push({ status: EventStatus.OPEN });

  const now = new Date();
  andConditions.push({ eventDate: { gte: now } });

  if (searchTerm) {
    andConditions.push({
      OR: eventSearchableFields.map((field) => ({
        [field]: { contains: String(searchTerm), mode: "insensitive" },
      })),
    });
  }

  if (status) andConditions.push({ status: status as any });

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
    include: { host: true },
  });

  const total = await prisma.event.count({ where: whereConditions });

  console.log("total  :", total);

  console.log("u", user);

  if (user && user.role !== "ADMIN") {
    const userData = await prisma.user.findUnique({
      where: { email: user.email },
      select: { interests: true },
    });

    console.log("ud", userData);

    console.log("user interests :", user?.interests);

    // const host = await prisma.host.findUnique({
    //   where: { email: user.email },
    //   select: { interests: true },
    // });

    const userInterests = user?.interests || [];

    if (userInterests.length > 0) {
      const mindLikeEvents = [];
      const otherEvents = [];

      for (const ev of events) {
        const match = ev.type.some((c) => userInterests.includes(c as any));

        console.log("match :", match);
        console.log("user Interest :", userInterests);

        if (match) mindLikeEvents.push(ev);
        else otherEvents.push(ev);
      }

      const orderedEvents = [...mindLikeEvents, ...otherEvents];

      return {
        meta: { page, limit, total },
        events: orderedEvents,
      };
    }
  }
  return {
    meta: { page, limit, total },
    events: events,
  };
};

const getEventDetails = async (eventId: string) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      host: true,
      // participants: {
      //   include: {
      //     client: true,
      //   },
      // },
    },
  });

  if (!event) return null;

  const participantsCount = event.maxParticipants;

  // const participantsInfo = event.participants.map((p) => ({
  //   id: p.id,
  //   joinedAt: p.createdAt,
  //   clientId: p.clientId,
  //   client: {
  //     id: p.client.id,
  //     name: p.client.name,
  //     email: p.client.email,
  //     profilePhoto: p.client.profilePhoto,
  //     contactNumber: p.client.contactNumber,
  //     location: p.client.location,
  //     bio: p.client.bio,
  //     interests: p.client.interests,
  //   },
  // }));

  return {
    ...event,
    participantsCount,
    // participantsInfo,
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
export const getMyHostedEvents = async (hostId: string) => {
  const events = await prisma.event.findMany({
    where: { hostId },
    orderBy: { eventDate: "desc" },
    include: {
      _count: {
        select: { bookings: true },
      },
    },
  });

  return events;
};

export const EventService = {
  createEvent,
  updateEvent,
  // changeStatus,
  getAllEvents,
  getEventDetails,
  // getMyEvents,
  // joinEvent,
  // leaveEvent,
  deleteEvent,
  getMyHostedEvents,
};
