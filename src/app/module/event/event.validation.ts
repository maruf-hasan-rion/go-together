import { z } from "zod";

// const createEvent = z.object({
//   title: z
//     .string({ error: "Title is required" })
//     .min(3, "Title must be at least 3 characters"),

//   type: z
//     .string({ error: "Event type is required" })
//     .min(2, "Type must be at least 2 characters"),

//   description: z
//     .string({ error: "Description is required" })
//     .min(10, "Description is too short"),

//   date: z.string({ error: "Date is required" }).datetime("Invalid date format"),

//   location: z
//     .string({ error: "Location is required" })
//     .min(3, "Location must be at least 3 characters"),

//   minParticipants: z.number().int().min(1).optional(),

//   maxParticipants: z.number().int().min(1, "Max participants required"),

//   joiningFee: z.number().int().min(0).optional(),
// });

// const updateEvent = z.object({
//   title: z.string().min(3, "Title must be at least 3 characters").optional(),

//   type: z.string().min(2, "Type must be at least 2 characters").optional(),

//   description: z.string().min(10, "Description is too short").optional(),

//   date: z.string("Invalid date format").datetime().optional(),

//   location: z
//     .string()
//     .min(3, "Location must be at least 3 characters")
//     .optional(),

//   minParticipants: z.number().int().min(1).optional(),

//   maxParticipants: z.number().int().min(1).optional(),

//   joiningFee: z.number().int().min(0).optional(),

//   status: z.enum(["OPEN", "FULL", "CANCELLED", "COMPLETED"]).optional(),
// });

const EventType = z.enum([
  "CONCERT",
  "SPORTS",
  "HIKING",
  "GAMING",
  "DINNER",
  "TECH_MEETUP",
  "WORKSHOP",
  "OUTDOOR",
  "ARTS",
  "SOCIAL",
  "OTHER",
]);

const createEvent = z.object({
  title: z.string({
    error: "Title is required!",
  }),

  type: z
    .array(EventType, {
      error: "Event types are required!",
    })
    .nonempty("At least one event type is required!"),

  description: z.string({
    error: "Description is required!",
  }),

  eventDate: z.coerce.date({
    error: "Valid event date is required!",
  }),

  location: z.string({
    error: "Location is required!",
  }),

  joiningFee: z.number({
    error: "Joining fee is required!",
  }),

  maxParticipants: z.number({
    error: "Event capacity is required!",
  }),
});
// const createEvent = z.object({
//   title: z.string({ message: "Title is required!" }),

//   type: z.array(EventType).min(1, "At least one event type is required!"),

//   description: z.string({ message: "Description is required!" }),

//   date: z
//     .union([z.string(), z.date()])
//     .transform((val) => new Date(val))
//     .refine((d) => !isNaN(d.getTime()), {
//       message: "Valid event date is required!",
//     }),

//   location: z.string({ message: "Location is required!" }),

//   capacity: z
//     .union([z.string(), z.number()])
//     .transform(Number)
//     .refine((v) => v > 0, {
//       message: "Event capacity is required!",
//     }),

//   joiningFee: z
//     .union([z.string(), z.number()])
//     .optional()
//     .transform((v) => (v ? Number(v) : 0)),
// });
const EventStatus = z.enum(["OPEN", "FULL", "CANCELLED", "COMPLETED"]);
// const updateEvent = z.object({
//   title: z.string().optional(),
//   type: z
//     .array(EventType)
//     .optional()
//     .refine(
//       (val) => {
//         return (
//           typeof val === "undefined" || (Array.isArray(val) && val.length > 0)
//         );
//       },
//       { message: "At least one event type is required!" }
//     ),
//   description: z.string().optional(),
//   eventDate: z.coerce.date().optional(),
//   location: z.string().optional(),
//   joiningFee: z.number().optional(),
//   image: z.string().optional(),
//   maxParticipants: z.number().optional(),
// });
const updateEvent = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  type: z.array(z.string()).min(1).optional(), // must be array when provided
  eventDate: z.iso.datetime().optional(), // frontend sends datetime-local -> make ISO before sending OR accept string and convert later
  location: z.string().min(1).optional(),
  minParticipants: z.coerce.number().int().min(1).optional(),
  maxParticipants: z.coerce.number().int().min(1).optional(),
  joiningFee: z.coerce.number().min(0).optional(),
  status: EventStatus.optional(),
});

export const EventValidation = {
  createEvent,
  updateEvent,
};
