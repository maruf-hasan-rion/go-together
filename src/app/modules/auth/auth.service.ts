import { prisma } from "../../shared/prisma";
import bcrypt from "bcryptjs";
import { jwtHelper } from "../../helper/jwtHelper";
import { Secret } from "jsonwebtoken";
import config from "../../../config";
import ApiError from "../../errors/ApiError";
import httpStatus from "http-status";

const login = async (payload: { email: string; password: string }) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: {
      email: payload.email,
    },
  });

  const isCorrectPassword = await bcrypt.compare(
    payload.password,
    user.password
  );
  if (!isCorrectPassword) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Password is incorrect!");
  }

  const accessToken = jwtHelper.generateToken(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_secret_expires_in as string
  );

  const refreshToken = jwtHelper.generateToken(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.refresh_token_secret as Secret,
    config.jwt.refresh_token_expires_in as string
  );

  return {
    accessToken,
    refreshToken,
  };
};

const refreshToken = async (token: string) => {
  let decodedData;
  try {
    decodedData = jwtHelper.verifyToken(
      token,
      config.jwt.refresh_token_secret as Secret
    );
  } catch (err) {
    throw new Error("You are not authorized!");
  }

  const userData = await prisma.user.findUniqueOrThrow({
    where: {
      email: decodedData.email,
    },
  });

  const accessToken = jwtHelper.generateToken(
    {
      id: userData.id,
      email: userData.email,
      role: userData.role,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_secret_expires_in as string
  );

  return {
    accessToken,
  };
};

const getMe = async (session: any) => {
  const accessToken = session.accessToken;
  const decodedData = jwtHelper.verifyToken(
    accessToken,
    config.jwt.jwt_secret as Secret
  );

  const userData = await prisma.user.findUniqueOrThrow({
    where: {
      email: decodedData.email,
    },
  });

  // const { id, email, role } = userData;

  return userData;
};

// const applyHost = async (user: any) => {
//   const accessToken = user.accessToken;

//   const decodedData = jwtHelper.verifyToken(
//     accessToken,
//     config.jwt.jwt_secret as Secret
//   );
//   const userData = await prisma.user.findUniqueOrThrow({
//     where: {
//       id: decodedData.userId,
//     },
//     include: {
//       client: true,
//     },
//   });

//   if (!userData) {
//     throw new ApiError(httpStatus.NOT_FOUND, "User not found");
//   }

//   if (userData.status === UserStatus.SUSPENDED) {
//     throw new ApiError(
//       httpStatus.FORBIDDEN,
//       "Your account has been suspended. You cannot perform this operation."
//     );
//   }

//   if (!userData.client) {
//     throw new ApiError(httpStatus.BAD_REQUEST, "Client profile not found");
//   }

//   const existingApplication = await prisma.hostApplication.findFirst({
//     where: {
//       userId: userData.id,
//       status: HostApplicationStatus.PENDING,
//     },
//   });
//   if (existingApplication) {
//     throw new ApiError(
//       httpStatus.BAD_REQUEST,
//       "You have already applied to be a host. Please wait for approval."
//     );
//   }

//   const result = await prisma.$transaction(async (transactionClient) => {
//     const application = await transactionClient.hostApplication.create({
//       data: {
//         userId: userData.id,
//         name: userData.client!.name,
//         email: userData.client!.email,
//       },
//     });

//     const userUpdate = await transactionClient.user.update({
//       where: {
//         id: userData.id,
//       },
//       data: {
//         status: UserStatus.PENDING,
//       },
//     });

//     const clientData = await transactionClient.client.findFirst({
//       where: {
//         email: userData.email,
//       },
//     });

//     await sendEmail({
//       to: userData.email,
//       subject: "Your Host Application Submitted",
//       templateName: "host-application-submitted",
//       templateData: {
//         name: clientData ? clientData.name : userData.email.split("@")[0],
//         applicationId: application.id,
//       },
//     });

//     return { ...application, ...userUpdate };
//   });

//   return result;
// };

// const applyHost = async (user: any) => {
//   const accessToken = user.accessToken;

//   const decodedData = jwtHelper.verifyToken(
//     accessToken,
//     config.jwt.jwt_secret as Secret
//   );
//   const userData = await prisma.user.findUniqueOrThrow({

const applyHost = async (
  userId: any,
  data: {
    message: string;
    // bio: string;
    // experience?: string;
    // eventTypes: string[];
  }
) => {
  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
  }
  const existing = await prisma.hostApplication.findUnique({
    where: { userId },
  });

  if (existing) {
    return {
      success: false,
      message: `Application already ${existing.status.toLowerCase()}`,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (user?.role === "HOST") {
    return {
      success: false,
      message: "You are already a host",
    };
  }

  const application = await prisma.hostApplication.create({
    data: {
      userId,
      message: data.message,
      // bio: data.bio,
      // experience: data.experience,
      // eventTypes: data.eventTypes,
      status: "PENDING",
    },
  });

  return { application };
};
export const AuthService = {
  login,
  refreshToken,
  getMe,
  applyHost,
};
