import "dotenv/config";
import bcrypt from "bcryptjs";
import { EventStatus, EventType, UserRole } from "../src/generated/prisma/client.js";
import { prisma } from "../src/app/lib/prisma.js";

type DemoAccount = {
  email: string;
  fullName: string;
  role: UserRole;
  password: string;
};

/**
 * Accounts created/refreshed by `pnpm run seed`. The first three must match
 * `go-together-frontend/src/lib/demo-credentials.ts` (one-click login).
 */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: "admin@gmail.com", fullName: "Admin", role: UserRole.ADMIN, password: "123456" },
  { email: "host@gmail.com", fullName: "Ayesha Rahman", role: UserRole.HOST, password: "123456" },
  { email: "user@gmail.com", fullName: "Rakib Hasan", role: UserRole.USER, password: "123456" },
  { email: "nusrat@gmail.com", fullName: "Nusrat Jahan", role: UserRole.USER, password: "123456" },
];

const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY);
const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

type SeedEvent = {
  title: string;
  description: string;
  type: EventType[];
  eventDate: Date;
  location: string;
  maxParticipants: number;
  joiningFee: number;
  image: string;
  status?: EventStatus;
};

async function seedUsers() {
  const users: Record<string, { id: string }> = {};
  const userIds: string[] = [];

  for (const account of DEMO_ACCOUNTS) {
    const password = await bcrypt.hash(account.password, 10);

    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {
        fullName: account.fullName,
        role: account.role,
        password,
        status: "ACTIVE",
        deletedAt: null,
      },
      create: {
        email: account.email,
        fullName: account.fullName,
        role: account.role,
        password,
        status: "ACTIVE",
      },
    });

    if (account.role === UserRole.HOST) {
      await prisma.hostApplication.upsert({
        where: { userId: user.id },
        update: { status: "APPROVED", message: "Demo host account" },
        create: { userId: user.id, status: "APPROVED", message: "Demo host account" },
      });
    }

    users[account.role] = users[account.role] ?? { id: user.id };
    if (account.role === UserRole.USER) userIds.push(user.id);
    console.log(`✓ user ${account.role.padEnd(6)} ${account.email}`);
  }

  return { hostId: users.HOST.id, userIds };
}

/** Create (or refresh, matched by host + title) an event. */
async function ensureEvent(hostId: string, data: SeedEvent) {
  const existing = await prisma.event.findFirst({ where: { hostId, title: data.title } });

  if (existing) {
    return prisma.event.update({
      where: { id: existing.id },
      data: {
        description: data.description,
        type: data.type,
        eventDate: data.eventDate,
        location: data.location,
        maxParticipants: data.maxParticipants,
        joiningFee: data.joiningFee,
        image: data.image,
        status: data.status ?? EventStatus.OPEN,
      },
    });
  }

  return prisma.event.create({
    data: { ...data, hostId, status: data.status ?? EventStatus.OPEN, minParticipants: 2 },
  });
}

async function ensurePaidBooking(
  userId: string,
  eventId: string,
  amount: number,
  status: "CONFIRMED" | "COMPLETED",
) {
  const existing = await prisma.booking.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });
  if (existing) return existing;

  return prisma.booking.create({
    data: {
      userId,
      eventId,
      status,
      totalAmount: amount,
      payments: {
        create: {
          amount,
          status: amount > 0 ? "COMPLETED" : "FREE",
          paymentMethod: amount > 0 ? "stripe" : "free",
        },
      },
    },
  });
}

const UPCOMING_EVENTS: SeedEvent[] = [
  {
    title: "Sunset Photography Walk",
    description:
      "Golden-hour walk around the lake with tips on composition, light and editing. Bring any camera or phone.",
    type: [EventType.OUTDOOR, EventType.ARTS, EventType.SOCIAL],
    eventDate: daysFromNow(3),
    location: "Dhanmondi Lake, Dhaka",
    maxParticipants: 15,
    joiningFee: 0,
    image: img("photo-1452587925148-ce544e77e70d"),
  },
  {
    title: "Weekend Hiking at Bandarban",
    description:
      "A guided day hike through the hills with breakfast and a shared vehicle included. Moderate difficulty.",
    type: [EventType.HIKING, EventType.OUTDOOR],
    eventDate: daysFromNow(7),
    location: "Bandarban, Chattogram",
    maxParticipants: 20,
    joiningFee: 1500,
    image: img("photo-1551632811-561732d1e306"),
  },
  {
    title: "Next.js & Prisma Meetup",
    description:
      "Talks on the App Router, server actions and Prisma 7, followed by open networking and pizza.",
    type: [EventType.TECH_MEETUP, EventType.WORKSHOP],
    eventDate: daysFromNow(12),
    location: "Banani, Dhaka",
    maxParticipants: 40,
    joiningFee: 300,
    image: img("photo-1540575467063-178a50c2df87"),
  },
  {
    title: "Rooftop Board Game Night",
    description:
      "Catan, Codenames and more — snacks included. Beginners very welcome, we'll teach the rules.",
    type: [EventType.GAMING, EventType.SOCIAL],
    eventDate: daysFromNow(18),
    location: "Gulshan, Dhaka",
    maxParticipants: 24,
    joiningFee: 500,
    image: img("photo-1606503153255-59d8b8b82176"),
  },
  {
    title: "Live Acoustic Night",
    description: "An intimate evening of acoustic sets from local artists with a small open-mic slot.",
    type: [EventType.CONCERT, EventType.SOCIAL],
    eventDate: daysFromNow(25),
    location: "Sylhet",
    maxParticipants: 60,
    joiningFee: 800,
    image: img("photo-1501386761578-eac5c94b800a"),
  },
  {
    title: "Sunrise Yoga in the Park",
    description:
      "Start your weekend with a 60-minute guided flow, suitable for all levels. Mats provided.",
    type: [EventType.SPORTS, EventType.OUTDOOR],
    eventDate: daysFromNow(5),
    location: "Ramna Park, Dhaka",
    maxParticipants: 30,
    joiningFee: 0,
    image: img("photo-1544367567-0f2fcb009e0b"),
  },
  {
    title: "Traditional Bangladeshi Cooking Class",
    description:
      "Hands-on class cooking biryani, bhuna and dessert from scratch. All ingredients included.",
    type: [EventType.WORKSHOP, EventType.DINNER],
    eventDate: daysFromNow(9),
    location: "Uttara, Dhaka",
    maxParticipants: 16,
    joiningFee: 700,
    image: img("photo-1414235077428-338989a2e8c0"),
  },
  {
    title: "Old Dhaka Street Food Crawl",
    description:
      "A guided crawl through the best street food of Old Dhaka — kebabs, fuchka and sweets.",
    type: [EventType.DINNER, EventType.SOCIAL],
    eventDate: daysFromNow(15),
    location: "Chawkbazar, Dhaka",
    maxParticipants: 25,
    joiningFee: 400,
    image: img("photo-1565299624946-b28f40a0ae38"),
  },
];

const PAST_EVENT: SeedEvent = {
  title: "Intro to Rock Climbing",
  description: "A completed beginner climbing session — thanks to everyone who joined!",
  type: [EventType.SPORTS, EventType.OUTDOOR],
  eventDate: daysFromNow(-10),
  location: "Mirpur, Dhaka",
  maxParticipants: 12,
  joiningFee: 1000,
  image: img("photo-1522163182402-834f871fd851"),
  status: EventStatus.COMPLETED,
};

async function seedContent(hostId: string, userIds: string[]) {
  const created: { id: string; joiningFee: number }[] = [];
  for (const event of UPCOMING_EVENTS) {
    const row = await ensureEvent(hostId, event);
    created.push({ id: row.id, joiningFee: row.joiningFee ? Number(row.joiningFee) : 0 });
  }
  console.log(`✓ ${created.length} upcoming events`);

  const pastEvent = await ensureEvent(hostId, PAST_EVENT);

  // Confirmed upcoming bookings for the first user.
  const primaryUser = userIds[0];
  for (const event of created.slice(0, 3)) {
    await ensurePaidBooking(primaryUser, event.id, event.joiningFee, "CONFIRMED");
  }
  // Everyone attends (and has completed) the past event.
  for (const userId of userIds) {
    await ensurePaidBooking(userId, pastEvent.id, 1000, "COMPLETED");
  }
  console.log("✓ bookings + payments");

  // Reviews on the completed event; host aggregates recomputed afterwards.
  const comments = [
    "Great session — patient instructor and a friendly group!",
    "Loved it. Well organised and beginner friendly.",
  ];
  const ratings = [5, 4];
  for (const [index, userId] of userIds.entries()) {
    await prisma.review.upsert({
      where: { userId_eventId: { userId, eventId: pastEvent.id } },
      update: { rating: ratings[index], comment: comments[index] },
      create: {
        userId,
        hostId,
        eventId: pastEvent.id,
        rating: ratings[index],
        comment: comments[index],
      },
    });
  }

  const agg = await prisma.review.aggregate({
    where: { hostId },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await prisma.user.update({
    where: { id: hostId },
    data: { averageRating: agg._avg.rating ?? 0, totalReviews: agg._count._all },
  });
  console.log(`✓ ${userIds.length} reviews (host rating updated)`);
}

async function main() {
  const { hostId, userIds } = await seedUsers();
  await seedContent(hostId, userIds);
  console.log("\nSeed complete.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
