import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";
import { ApplicationStatus, Prisma, UserRole } from "../../../generated/prisma";
import { IPaginationOptions } from "../../types/pagination";
import { paginationHelper } from "../../helper/paginationHelper";
import { userSearchableFields } from "./admin.constant";

const getAllUsers = async (params: any, options: IPaginationOptions) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const { searchTerm, status, ...filterData } = params;

  const andConditions: Prisma.UserWhereInput[] = [];

  andConditions.push({
    role: { in: [UserRole.USER, UserRole.ADMIN, UserRole.HOST] },
  });

  // andConditions.push({
  //   user: { isNot: null },
  // });

  if (searchTerm) {
    andConditions.push({
      OR: [
        { email: { contains: searchTerm, mode: "insensitive" } },
        // { user: { name: { contains: searchTerm, mode: "insensitive" } } },
      ],
    });
  }

  // if (status) {
  //   andConditions.push({ status: status as UserStatus });
  // }

  if (Object.keys(filterData).length > 0) {
    const extraFilters: Prisma.UserWhereInput[] = [];

    for (const key of Object.keys(filterData)) {
      const value = (filterData as any)[key];

      // if (userSearchableFields.includes(key)) {
      //   extraFilters.push({
      //     user: { [key]: { equals: value } },
      //   });
      // } else {
      extraFilters.push({
        [key]: { equals: value },
      });
      // }
    }

    if (extraFilters.length) {
      andConditions.push({ AND: extraFilters });
    }
  }

  const whereConditions: Prisma.UserWhereInput =
    andConditions.length > 0 ? { AND: andConditions as any } : {};

  const users = await prisma.user.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: "desc" },
    include: {
      // user: true,
    },
  });

  const total = await prisma.user.count({ where: whereConditions });

  return {
    meta: { page, limit, total },
    users,
  };
};

const getAllHostApplications = async () => {
  const requests = await prisma.hostApplication.findMany({
    where: {
      status: "PENDING",
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          profilePhoto: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!requests.length) {
    throw new ApiError(404, "No pending host requests found");
  }

  return requests;
};

// const updateHostStatus = async (
//   id: string,
//   status: "APPROVED" | "REJECTED"
// ) => {
//   const req = await prisma.hostApplication.findUnique({
//     where: { id },
//   });

//   if (!req) throw new ApiError(404, "Request not found");

//   const result = await prisma.hostApplication.update({
//     where: { id },
//     data: { status },
//   });

//   if (status === "APPROVED") {
//     const result = await prisma.user.update({
//       where: { id: req.userId },
//       data: { role: "HOST" },
//     });
//   }

//   return result;
// };

// approve host application
const approveHostApplication = async (id: string) => {
  const isHostApplicationExist = await prisma.hostApplication.findUniqueOrThrow(
    {
      where: { id },
      include: { user: true },
    }
  );

  const user = await prisma.user.findUnique({
    where: { email: isHostApplicationExist.user.email },
  });

  if (!user) {
    throw new Error("User info not found");
  }

  if (isHostApplicationExist.status === ApplicationStatus.REJECTED) {
    throw new Error("This host application is already rejected.");
  }

  if (isHostApplicationExist.status === ApplicationStatus.APPROVED) {
    throw new Error(
      "This application is already approved and cannot be rejected."
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.hostApplication.update({
      where: { id },
      data: { status: ApplicationStatus.APPROVED },
    });

    await tx.user.update({
      where: { id: isHostApplicationExist.userId },
      data: {
        role: UserRole.HOST,
      },
    });

    // if (isHostApplicationExist.status === "APPROVED") {
    //   await tx.user.update({
    //     where: { id: isHostApplicationExist.userId },
    //     data: { role: "HOST" },
    //   });
    // }
  });
  return result;
};

// reject host application
const rejectHostApplication = async (id: string) => {
  const isHostApplicationExist = await prisma.hostApplication.findUniqueOrThrow(
    {
      where: { id },
      include: { user: true },
    }
  );

  if (isHostApplicationExist.status === ApplicationStatus.REJECTED) {
    throw new Error("This host application is already rejected.");
  }

  if (isHostApplicationExist.status === ApplicationStatus.APPROVED) {
    throw new Error(
      "This application is already approved and cannot be rejected."
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: isHostApplicationExist.user.email },
  });

  if (!user) {
    throw new Error("User info not found");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedApplication = await tx.hostApplication.update({
      where: { id },
      data: { status: ApplicationStatus.REJECTED },
    });

    // await tx.user.update({
    //     where: { id: isHostApplicationExist.userId },
    //     data: { status: UserStatus.ACTIVE }
    // });

    // return {
    //     message: "Host application rejected successfully",
    //     application: updatedApplication
    // };
  });

  return result;
};
export const AdminService = {
  // hostRequests,
  getAllUsers,
  getAllHostApplications,
  // updateHostStatus,
  approveHostApplication,
  rejectHostApplication,
};
