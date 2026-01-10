import { Prisma, EventType } from "../../../generated/prisma/client";

export interface EventSearchParams {
  type?: string;
  date?: string;
  location?: string;
  searchTerm?: string;
}

export const buildEventSearchQuery = (
  params: EventSearchParams
): Prisma.EventWhereInput => {
  const { type, date, location, searchTerm } = params;

  const where: Prisma.EventWhereInput = {};

  //  FILTER BY EVENT TYPE
  if (type && Object.values(EventType).includes(type as EventType)) {
    where.type = {
      has: type as EventType,
    };
  }

  //  FILTER BY LOCATION
  if (location && location !== "All Locations") {
    where.location = {
      contains: location.split(",")[0], // safety trim
      mode: "insensitive",
    };
  }

  //  HANDLE PREDEFINED DATE LABELS (Today, This Week, etc.)
  if (date) {
    const today = new Date();

    let start: Date | null = null;
    let end: Date | null = null;

    switch (date) {
      case "Today": {
        start = new Date(today);
        start.setHours(0, 0, 0, 0);

        end = new Date(today);
        end.setHours(23, 59, 59, 999);
        break;
      }

      case "This Week": {
        start = new Date(today);
        end = new Date(today);
        end.setDate(today.getDate() + 7);
        break;
      }

      case "This Weekend": {
        const day = today.getDay();
        start = new Date(today);
        start.setDate(today.getDate() + (6 - day));

        end = new Date(start);
        end.setDate(start.getDate() + 1);
        break;
      }

      case "Next Week": {
        start = new Date(today);
        start.setDate(today.getDate() + 7);

        end = new Date(start);
        end.setDate(start.getDate() + 7);
        break;
      }

      case "This Month": {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      }

      default: {
        const realDate = new Date(date);
        if (!isNaN(realDate.getTime())) {
          start = new Date(realDate);
          end = new Date(realDate);
          end.setDate(end.getDate() + 1);
        }
      }
    }

    if (start && end) {
      where.eventDate = {
        gte: start,
        lt: end,
      };
    }
  }

  // Search
  if (searchTerm) {
    where.OR = [
      {
        title: {
          contains: searchTerm,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: searchTerm,
          mode: "insensitive",
        },
      },
      {
        location: {
          contains: searchTerm,
          mode: "insensitive",
        },
      },
    ];
  }

  return where;
};
