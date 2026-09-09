import bcrypt from "bcryptjs";
import type { Request } from "express";
import { prisma } from "../../lib/prisma.js";
// import { prisma } from "../../lib/prisma.js";
import type { IJWTPayload } from "../../types/common.js";
import { fileUploader } from "../../utils/fileUploader.js";

const createUser = async (req: Request) => {
  if (req.file) {
    const uploadResult = await fileUploader.uploadToCloudinary(req.file);
    req.body.profilePhoto = uploadResult?.secure_url;
  }

  const hashPassword = await bcrypt.hash(req.body.password, 10);

  const result = await prisma.user.create({
    data: {
      fullName: req.body.fullName,
      email: req.body.email,
      password: hashPassword,
      profilePhoto: req.body.profilePhoto || null,
    },
  });
  return result;
};

// const becomeHost = async (user: IJWTPayload) => {
//   const userInfo = await prisma.user.findUniqueOrThrow({
//     where: {
//       email: user.email,
//     },
//   });

//   const existing = await prisma.hostApplication.findUnique({
//     where: { userId: userInfo.id },
//   });

//   if (existing) {
//     throw new ApiError(400, "You already submitted a host request");
//   }

//   const result = await prisma.hostApplication.create({
//     data: {
//       userId: userInfo.id,
//     },
//   });

//   return result;
// };

const updateMyProfile = async (user: IJWTPayload, req: Request) => {
  const userInfo = await prisma.user.findUniqueOrThrow({
    where: {
      email: user?.email,
    },
  });

  const file = req.file;
  if (file) {
    const uploadToCloudinary = await fileUploader.uploadToCloudinary(file);
    req.body.profilePhoto = uploadToCloudinary?.secure_url;
  }

  let profileInfo: Awaited<ReturnType<typeof prisma.user.update>> | undefined;

  // console.log(userInfo);

  if (userInfo) {
    profileInfo = await prisma.user.update({
      where: {
        email: userInfo.email,
      },
      data: req.body,
    });
    // } else if (userInfo.role === UserRole.DOCTOR) {
    //   profileInfo = await prisma.doctor.update({
    //     where: {
    //       email: userInfo.email,
    //     },
    //     data: req.body,
    //   });
    // } else if (userInfo.role === UserRole.PATIENT) {
    // profileInfo = await prisma.patient.update({
    //   where: {
    //     email: userInfo.email,
    //   },
    //   data: req.body,
    // });
  }

  return { ...profileInfo };
};

export const UserService = {
  createUser,
  // becomeHost,
  updateMyProfile,
};
