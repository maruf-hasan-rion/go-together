import "dotenv/config";
import bcrypt from "bcryptjs";
import { UserRole } from "../src/generated/prisma/client.js";
import { prisma } from "../src/app/lib/prisma.js";

/** Shared password for every demo account (see the frontend "Demo Login" buttons). */
export const DEMO_PASSWORD = "Demo@1234";

export const DEMO_ACCOUNTS = [
  { email: "admin@gotogether.dev", fullName: "Demo Admin", role: UserRole.ADMIN },
  { email: "host@gotogether.dev", fullName: "Demo Host", role: UserRole.HOST },
  { email: "user@gotogether.dev", fullName: "Demo User", role: UserRole.USER },
] as const;

async function main() {
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const account of DEMO_ACCOUNTS) {
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

    // Give the demo host an approved application so host features are enabled.
    if (account.role === UserRole.HOST) {
      await prisma.hostApplication.upsert({
        where: { userId: user.id },
        update: { status: "APPROVED", message: "Demo host account" },
        create: { userId: user.id, status: "APPROVED", message: "Demo host account" },
      });
    }

    console.log(`✓ ${account.role.padEnd(6)} ${account.email}`);
  }

  console.log(`\nSeeded ${DEMO_ACCOUNTS.length} demo accounts — password: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
