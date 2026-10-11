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
 * Accounts created/refreshed by `pnpm run seed`. These must match
 * `go-together-frontend/src/lib/demo-credentials.ts` (one-click login).
 */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: "admin@gmail.com", fullName: "Admin", role: UserRole.ADMIN, password: "123456" },
  { email: "host@gmail.com", fullName: "Ayesha Rahman", role: UserRole.HOST, password: "123456" },
  { email: "user@gmail.com", fullName: "Rakib Hasan", role: UserRole.USER, password: "123456" },
];

const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY);

async function seedUsers() {
  const users: Record<string, { id: string; email: string }> = {};

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

    users[account.role] = { id: user.id, email: user.email };
    console.log(`✓ user ${account.role.padEnd(6)} ${account.email}`);
  }

  return users;
}

/** Create an event once (matched by host + title) and return its id. */
async function ensureEvent(
  hostId: string,
  data: {
    title: string;
    description: string;
    type: EventType[];
    eventDate: Date;
    location: string;
    maxParticipants: number;
    joiningFee: number;
    status?: EventStatus;
  },
) {
  const existing = await prisma.event.findFirst({ where: { hostId, title: data.title } });
  if (existing) return existing;

  return prisma.event.create({
    data: {
      ...data,
      hostId,
      status: data.status ?? EventStatus.OPEN,
      minParticipants: 2,
    },
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

async function seedContent(hostId: string, userId: string) {
  const upcoming = [
    {
      title: "Sunset Photography Walk",
      description:
        "Golden-hour walk around the lake with tips on composition, light and editing. Bring any camera or phone.",
      type: [EventType.OUTDOOR, EventType.ARTS, EventType.SOCIAL],
      eventDate: daysFromNow(3),
      location: "Dhanmondi Lake, Dhaka",
      maxParticipants: 15,
      joiningFee: 0,
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
    },
    {
      title: "Live Acoustic Night",
      description:
        "An intimate evening of acoustic sets from local artists with a small open-mic slot.",
      type: [EventType.CONCERT, EventType.SOCIAL],
      eventDate: daysFromNow(25),
      location: "Sylhet",
      maxParticipants: 60,
      joiningFee: 800,
    },
  ];

  const created: { id: string; joiningFee: number }[] = [];
  for (const event of upcoming) {
    const row = await ensureEvent(hostId, event);
    created.push({ id: row.id, joiningFee: row.joiningFee ? Number(row.joiningFee) : 0 });
  }
  console.log(`✓ ${created.length} upcoming events`);

  const pastEvent = await ensureEvent(hostId, {
    title: "Intro to Rock Climbing",
    description: "A completed beginner climbing session — thanks to everyone who joined!",
    type: [EventType.SPORTS, EventType.OUTDOOR],
    eventDate: daysFromNow(-10),
    location: "Mirpur, Dhaka",
    maxParticipants: 12,
    joiningFee: 1000,
    status: EventStatus.COMPLETED,
  });

  // A couple of confirmed upcoming bookings + the completed one.
  for (const event of created.slice(0, 2)) {
    await ensurePaidBooking(userId, event.id, event.joiningFee, "CONFIRMED");
  }
  await ensurePaidBooking(userId, pastEvent.id, 1000, "COMPLETED");
  console.log("✓ bookings + payments");

  // A review on the completed event + recomputed host aggregates.
  await prisma.review.upsert({
    where: { userId_eventId: { userId, eventId: pastEvent.id } },
    update: { rating: 5, comment: "Great session — patient instructor and a friendly group!" },
    create: {
      userId,
      hostId,
      eventId: pastEvent.id,
      rating: 5,
      comment: "Great session — patient instructor and a friendly group!",
    },
  });

  const agg = await prisma.review.aggregate({
    where: { hostId },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await prisma.user.update({
    where: { id: hostId },
    data: { averageRating: agg._avg.rating ?? 0, totalReviews: agg._count._all },
  });
  console.log("✓ review (host rating updated)");
}

async function main() {
  const users = await seedUsers();
  await seedContent(users.HOST.id, users.USER.id);
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
