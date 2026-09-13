import bcrypt from "bcryptjs";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import httpStatus from "http-status";
import type { JwtPayload, Secret } from "jsonwebtoken";
import { OAuth2Client, type TokenPayload } from "google-auth-library";
import config from "../../../config/index.js";
import { UserStatus } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { userPublicSelect } from "../../serializers/user.js";
import ApiError from "../../utils/ApiError.js";
import { jwtHelper } from "../../utils/jwt.js";
import { kv } from "../../utils/kvStore.js";
import { sendMail } from "../../utils/mailer.js";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

const refreshTtlDays = (expiresIn: string) => {
  const match = /^(\d+)\s*d/i.exec(expiresIn);
  return match ? Number(match[1]) : 90;
};

/**
 * Concurrent frontend requests can present the same refresh token at the
 * same moment (Next proxy + parallel data fetches). The rotated session
 * therefore stays usable for a short grace period instead of being
 * revoked instantly; a duplicate refresh inside the window simply mints
 * another session instead of logging the user out.
 */
const ROTATION_GRACE_MS = 30_000;

/**
 * Creates a Session row and returns the signed refresh token for it.
 * The token carries jti = session id; the row stores only the token hash,
 * so a stolen database cannot be used to forge refresh tokens.
 */
const issueRefreshSession = async (user: { id: string; email: string; role: string }) => {
  const sessionId = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + refreshTtlDays(config.jwt.refresh_token_expires_in));

  const token = jwtHelper.generateToken(
    { id: user.id, email: user.email, role: user.role, jti: sessionId },
    config.jwt.refresh_token_secret as Secret,
    config.jwt.refresh_token_expires_in,
  );

  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      refreshTokenHash: sha256(token),
      expiresAt,
    },
  });

  return token;
};

const login = async (payload: { email: string; password: string }) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
    select: {
      id: true,
      email: true,
      password: true,
      role: true,
      status: true,
      deletedAt: true,
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid email or password!");
  }
  if (user.status !== UserStatus.ACTIVE || user.deletedAt) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Your account is not active. Contact support.",
    );
  }

  const isCorrectPassword = await bcrypt.compare(payload.password, user.password);
  if (!isCorrectPassword) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid email or password!");
  }

  const accessToken = jwtHelper.generateToken(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_secret_expires_in,
  );

  const refreshToken = await issueRefreshSession(user);

  return {
    accessToken,
    refreshToken,
  };
};

const refreshToken = async (token: string) => {
  if (!token) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "You are not authorized!");
  }

  let decoded: JwtPayload;
  try {
    decoded = jwtHelper.verifyToken(token, config.jwt.refresh_token_secret as Secret);
  } catch (_err) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "You are not authorized!");
  }

  const sessionId = decoded.jti;
  if (!sessionId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "You are not authorized!");
  }

  const session = await prisma.session.findUnique({ where: { id: sessionId } });

  if (
    !session ||
    (session.revokedAt && session.revokedAt.getTime() <= Date.now()) ||
    session.expiresAt <= new Date() ||
    session.refreshTokenHash !== sha256(token)
  ) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "You are not authorized!");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, role: true, status: true, deletedAt: true },
  });

  if (!user || user.status !== UserStatus.ACTIVE || user.deletedAt) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "You are not authorized!");
  }

  // Rotate: the presented session is scheduled for revocation after the
  // grace window, and a fresh session is issued.
  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date(Date.now() + ROTATION_GRACE_MS) },
  });

  const accessToken = jwtHelper.generateToken(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_secret_expires_in,
  );
  const newRefreshToken = await issueRefreshSession(user);

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
};

const logout = async (refreshToken: string) => {
  if (!refreshToken) return;

  let decoded: JwtPayload;
  try {
    decoded = jwtHelper.verifyToken(refreshToken, config.jwt.refresh_token_secret as Secret);
  } catch (_err) {
    return; // already invalid — nothing to revoke
  }

  if (decoded.jti) {
    await prisma.session.updateMany({
      where: { id: decoded.jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
};

const changePassword = async (
  userId: string,
  payload: { oldPassword: string; newPassword: string },
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "You are not authorized!");
  }

  const isCorrectPassword = await bcrypt.compare(payload.oldPassword, user.password);
  if (!isCorrectPassword) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Old password is incorrect!");
  }

  const hashedPassword = await bcrypt.hash(payload.newPassword, config.salt_round);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    }),
    // Revoke every session so the user signs in again with the new password
    prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
};

const getMeById = async (userId: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: userPublicSelect,
  });

  return user;
};

const RESET_KEY_PREFIX = "go-together:reset:";

/**
 * Starts the password-reset flow. Always resolves successfully so the
 * endpoint cannot be used to enumerate registered emails.
 */
const forgotPassword = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, status: true, deletedAt: true },
  });

  if (!user || user.status !== UserStatus.ACTIVE || user.deletedAt) {
    return;
  }

  const token = randomBytes(32).toString("hex");
  const ttlSeconds = config.reset_token_ttl_minutes * 60;
  await kv.set(`${RESET_KEY_PREFIX}${token}`, user.id, ttlSeconds);

  const resetUrl = `${config.frontend_url}/reset-password?token=${token}`;
  await sendMail({
    to: user.email,
    subject: "Reset your Go Together password",
    text: `Use this link to reset your password (valid for ${config.reset_token_ttl_minutes} minutes): ${resetUrl}`,
    html: `<p>Use the link below to reset your password (valid for ${config.reset_token_ttl_minutes} minutes):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
};

const resetPassword = async (token: string, newPassword: string) => {
  const userId = await kv.get(`${RESET_KEY_PREFIX}${token}`);
  if (!userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Reset link is invalid or has expired");
  }

  const hashedPassword = await bcrypt.hash(newPassword, config.salt_round);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    }),
    // Force a fresh login everywhere after a reset
    prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await kv.del(`${RESET_KEY_PREFIX}${token}`);
};

/**
 * Google (GCP) sign-in: verifies the ID token issued by Google Identity
 * Services, links/creates the local account, then issues the same
 * session-backed token pair as a password login.
 */
const googleLogin = async (idToken: string) => {
  if (!config.google_client_id) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Google login is not configured");
  }
  if (!idToken) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Google credential is required");
  }

  const client = new OAuth2Client(config.google_client_id);

  let payload: TokenPayload | undefined;
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: config.google_client_id,
    });
    payload = ticket.getPayload();
  } catch {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid Google credential");
  }

  if (!payload?.email || !payload.sub) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Google account has no email");
  }

  let user = await prisma.user.findUnique({
    where: { email: payload.email },
    select: { id: true, email: true, role: true, status: true, deletedAt: true, googleId: true },
  });

  if (user && (user.status !== UserStatus.ACTIVE || user.deletedAt)) {
    throw new ApiError(httpStatus.FORBIDDEN, "Your account is not active. Contact support.");
  }

  let isNewUser = false;

  if (!user) {
    // No password is ever used for Google-only accounts; store a random hash.
    const randomPassword = await bcrypt.hash(randomBytes(32).toString("hex"), config.salt_round);
    user = await prisma.user.create({
      data: {
        email: payload.email,
        fullName: payload.name || payload.email.split("@")[0],
        password: randomPassword,
        googleId: payload.sub,
        profilePhoto: payload.picture ?? null,
      },
      select: { id: true, email: true, role: true, status: true, deletedAt: true, googleId: true },
    });
    isNewUser = true;
  } else if (!user.googleId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { googleId: payload.sub },
    });
  }

  const accessToken = jwtHelper.generateToken(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_secret_expires_in,
  );
  const refreshToken = await issueRefreshSession(user);

  return { accessToken, refreshToken, isNewUser };
};

const applyHost = async (userId: string | undefined, data: { message: string } | undefined) => {
  if (!userId) throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
  if (!data?.message) throw new ApiError(httpStatus.BAD_REQUEST, "Message is required");

  const existing = await prisma.hostApplication.findUnique({
    where: { userId },
  });

  if (existing) {
    return {
      success: false,
      message: `Application already ${existing.status.toLowerCase()}`,
      data: existing,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role === "HOST") {
    return { success: false, message: "You are already a host", data: null };
  }

  const application = await prisma.hostApplication.create({
    data: { userId, message: data.message, status: "PENDING" },
  });

  return {
    success: true,
    message: "Application submitted successfully. We will review within 24-48 hours.",
    data: application,
  };
};

export const AuthService = {
  login,
  googleLogin,
  refreshToken,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
  getMeById,
  applyHost,
};
