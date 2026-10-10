import "dotenv/config";
import { defineConfig } from "prisma/config";

// `prisma generate` runs during install (postinstall) and only needs the schema.
// Database commands (migrate/db) require DATABASE_URL; it is read from the
// environment at that point via the literal below. We deliberately avoid
// prisma/config's `env()` helper here so a missing DATABASE_URL during a
// schema-only generate does not throw.
export default defineConfig({
  schema: "prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
