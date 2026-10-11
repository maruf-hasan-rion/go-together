import "dotenv/config";
import bcrypt from "bcryptjs";
import { UserRole } from "../src/generated/prisma/client.js";
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
  { email: "host@gmail.com", fullName: "Demo Host", role: UserRole.HOST, password: "123456" },
  { email: "user@gmail.com", fullName: "Demo User", role: UserRole.USER, password: "123456" },
];

async function main() {
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

    // Give the demo host an approved application so host features are enabled.
    if (account.role === UserRole.HOST) {
      await prisma.hostApplication.upsert({
        where: { userId: user.id },
        update: { status: "APPROVED", message: "Demo host account" },
        create: { userId: user.id, status: "APPROVED", message: "Demo host account" },
      });
    }

    console.log(`✓ ${account.role.padEnd(6)} ${account.email}  (password: ${account.password})`);
  }

  console.log(`\nSeeded ${DEMO_ACCOUNTS.length} demo accounts.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
