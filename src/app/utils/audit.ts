import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

type AuditInput = {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
};

/**
 * Best-effort audit trail. A failure here must never break the business
 * operation that triggered it, so errors are logged and swallowed.
 */
export const writeAuditLog = async (input: AuditInput) => {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorRole: input.actorRole ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        before: (input.before ?? undefined) as Prisma.InputJsonValue | undefined,
        after: (input.after ?? undefined) as Prisma.InputJsonValue | undefined,
        ip: input.ip ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
};
