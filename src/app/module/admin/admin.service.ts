import {
  ApplicationStatus,
  type Prisma,
  UserRole,
  UserStatus,
} from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { userPublicSelect } from "../../serializers/user.js";
import type { IPaginationOptions } from "../../types/pagination.js";
import ApiError from "../../utils/ApiError.js";
import { writeAuditLog } from "../../utils/audit.js";
import { paginationHelper } from "../../utils/pagination.js";

type Actor = { id: string; role: string; ip?: string };

const nameOrEmailSearch = (searchTerm: string): Prisma.UserWhereInput => ({
  OR: [
    { email: { contains: searchTerm, mode: "insensitive" } },
    { fullName: { contains: searchTerm, mode: "insensitive" } },
  ],
});

const getAllUsers = async (params: any, options: IPaginationOptions) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const { searchTerm, status, ...filterData } = params;

  const andConditions: Prisma.UserWhereInput[] = [];

  if (searchTerm) {
    andConditions.push(nameOrEmailSearch(String(searchTerm)));
  }

  if (status) {
    andConditions.push({ status: status as UserStatus });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: { equals: (filterData as Record<string, unknown>)[key] },
      })),
    });
  }

  const where: Prisma.UserWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy:
        options.sortBy && options.sortOrder
          ? { [options.sortBy]: options.sortOrder }
          : { createdAt: "desc" },
      select: { ...userPublicSelect, status: true },
    }),
    prisma.user.count({ where }),
  ]);

  return { meta: { page, limit, total }, data: users };
};

const getHosts = async (params: any, options: IPaginationOptions) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const { searchTerm, status } = params;

  const where: Prisma.UserWhereInput = { role: UserRole.HOST };
  if (status) {
    where.status = status as UserStatus;
  }
  if (searchTerm) {
    where.AND = [nameOrEmailSearch(String(searchTerm))];
  }

  const [hosts, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: { ...userPublicSelect, status: true },
    }),
    prisma.user.count({ where }),
  ]);

  return { meta: { page, limit, total }, data: hosts };
};

const getAllHostApplications = async (params: any, options: IPaginationOptions) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const status = (params.status as ApplicationStatus) ?? ApplicationStatus.PENDING;

  const where: Prisma.HostApplicationWhereInput = { status };

  const [applications, total] = await Promise.all([
    prisma.hostApplication.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, email: true, fullName: true, profilePhoto: true },
        },
      },
    }),
    prisma.hostApplication.count({ where }),
  ]);

  return { meta: { page, limit, total }, data: applications };
};

const approveHostApplication = async (id: string, actor: Actor) => {
  const application = await prisma.hostApplication.findUnique({ where: { id } });

  if (!application) {
    throw new ApiError(404, "Host application not found");
  }
  if (application.status === ApplicationStatus.APPROVED) {
    throw new ApiError(409, "Application is already approved");
  }
  if (application.status === ApplicationStatus.REJECTED) {
    throw new ApiError(409, "Application is already rejected");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.hostApplication.update({
      where: { id },
      data: {
        status: ApplicationStatus.APPROVED,
        reviewedBy: actor.id,
        reviewedAt: new Date(),
        rejectReason: null,
      },
    });

    await tx.user.update({
      where: { id: application.userId },
      data: { role: UserRole.HOST },
    });

    return updated;
  });

  await writeAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    action: "HOST_APPLICATION_APPROVED",
    resourceType: "HostApplication",
    resourceId: id,
    before: { status: application.status },
    after: { status: ApplicationStatus.APPROVED },
    ip: actor.ip,
  });

  return result;
};

const rejectHostApplication = async (id: string, reason: string | undefined, actor: Actor) => {
  const application = await prisma.hostApplication.findUnique({ where: { id } });

  if (!application) {
    throw new ApiError(404, "Host application not found");
  }
  if (application.status !== ApplicationStatus.PENDING) {
    throw new ApiError(409, `Application is already ${application.status.toLowerCase()}`);
  }

  const updated = await prisma.hostApplication.update({
    where: { id },
    data: {
      status: ApplicationStatus.REJECTED,
      reviewedBy: actor.id,
      reviewedAt: new Date(),
      rejectReason: reason ?? null,
    },
  });

  await writeAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    action: "HOST_APPLICATION_REJECTED",
    resourceType: "HostApplication",
    resourceId: id,
    before: { status: application.status },
    after: { status: ApplicationStatus.REJECTED, rejectReason: reason ?? null },
    ip: actor.ip,
  });

  return updated;
};

const setUserStatus = async (userId: string, status: UserStatus, action: string, actor: Actor) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true, role: true },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (user.id === actor.id) {
    throw new ApiError(400, "You cannot change your own status");
  }
  if (user.status === status) {
    throw new ApiError(409, `User is already ${status.toLowerCase()}`);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status },
    select: userPublicSelect,
  });

  // Blocking must take effect immediately — kill the user's live sessions.
  if (status === UserStatus.BLOCKED) {
    await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  await writeAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    action,
    resourceType: "User",
    resourceId: userId,
    before: { status: user.status },
    after: { status },
    ip: actor.ip,
  });

  return updated;
};

const blockUser = (userId: string, actor: Actor) =>
  setUserStatus(userId, UserStatus.BLOCKED, "USER_BLOCKED", actor);

const unblockUser = (userId: string, actor: Actor) =>
  setUserStatus(userId, UserStatus.ACTIVE, "USER_UNBLOCKED", actor);

const deleteUser = async (userId: string, actor: Actor) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, status: true, deletedAt: true },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (user.id === actor.id) {
    throw new ApiError(400, "You cannot delete your own account");
  }
  if (user.deletedAt) {
    throw new ApiError(409, "User is already deleted");
  }

  // Park the original email in deletedEmail and move `email` to a unique
  // tombstone so the address can be re-registered.
  const tombstone = `deleted+${user.id}@deleted.local`;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.BLOCKED,
        deletedAt: new Date(),
        deletedEmail: user.email,
        email: tombstone,
      },
      select: userPublicSelect,
    });

    await tx.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return result;
  });

  await writeAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    action: "USER_SOFT_DELETED",
    resourceType: "User",
    resourceId: userId,
    before: { email: user.email, status: user.status },
    after: { status: UserStatus.BLOCKED, deletedEmail: user.email },
    ip: actor.ip,
  });

  return updated;
};

export const AdminService = {
  getAllUsers,
  getHosts,
  getAllHostApplications,
  approveHostApplication,
  rejectHostApplication,
  blockUser,
  unblockUser,
  deleteUser,
};
