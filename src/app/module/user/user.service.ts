import bcrypt from "bcryptjs";
import type { Request } from "express";
import httpStatus from "http-status";
import { prisma } from "../../lib/prisma.js";
import { userPublicSelect } from "../../serializers/user.js";
import type { IJWTPayload } from "../../types/common.js";
import ApiError from "../../utils/ApiError.js";
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
    select: userPublicSelect,
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
  const file = req.file;
  if (file) {
    const uploadToCloudinary = await fileUploader.uploadToCloudinary(file);
    req.body.profilePhoto = uploadToCloudinary?.secure_url;
  }

  // req.body arrives whitelisted by UserValidation.updateMyProfile; the
  // destructure below is the second guard so role/email/password can
  // never reach Prisma even if validation is bypassed.
  const { fullName, bio, location, profilePhoto, interests } = req.body;

  const data = { fullName, bio, location, profilePhoto, interests };
  if (Object.values(data).every((value) => value === undefined)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No fields to update");
  }

  const profileInfo = await prisma.user.update({
    where: {
      id: user.id,
    },
    data,
    select: userPublicSelect,
  });

  return profileInfo;
};

export const UserService = {
  createUser,
  // becomeHost,
  updateMyProfile,
};
