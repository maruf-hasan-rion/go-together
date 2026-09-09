import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: path.join(process.cwd(), ".env") });

/**
 * Environment schema — the ONLY place process.env is read.
 * The app refuses to boot with missing/invalid required variables.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_SECRET_EXPIRES_IN: z.string().min(1).default("1h"),
  REFRESH_TOKEN_SECRET: z.string().min(1, "REFRESH_TOKEN_SECRET is required"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().min(1).default("90d"),

  SALT_ROUND: z.coerce.number().int().positive().default(10),

  CLOUDINARY_CLOUD_NAME: z.string().default(""),
  CLOUDINARY_API_KEY: z.string().default(""),
  CLOUDINARY_API_SECRET: z.string().default(""),

  STRIPE_SECRET_KEY: z.string().default(""),
  WEBHOOK_SECRET_KEY: z.string().default(""),

  // Comma-separated list of allowed CORS origins
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000,https://go-together-frontend-ten.vercel.app"),
  COOKIE_SECRET: z.string().default("go-together-dev-cookie-secret"),
  DEMO_MODE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const details = parsedEnv.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  // eslint-disable-next-line no-console
  console.error(`Invalid environment variables:\n${details}`);
  process.exit(1);
}

const env = parsedEnv.data;

export default {
  node_env: env.NODE_ENV,
  port: env.PORT,
  database_url: env.DATABASE_URL,

  cloudinary: {
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  },

  jwt: {
    jwt_secret: env.JWT_SECRET,
    jwt_secret_expires_in: env.JWT_SECRET_EXPIRES_IN,
    refresh_token_secret: env.REFRESH_TOKEN_SECRET,
    refresh_token_expires_in: env.REFRESH_TOKEN_EXPIRES_IN,
  },

  salt_round: env.SALT_ROUND,

  stripe_secret_key: env.STRIPE_SECRET_KEY,
  webhook_secret_key: env.WEBHOOK_SECRET_KEY,

  cors_origins: env.CORS_ORIGINS.split(",").map((origin) => origin.trim()),
  cookie_secret: env.COOKIE_SECRET,
  demo_mode: env.DEMO_MODE,
};

type CloudinaryUploadResultLike = {
  secure_url?: string;
  url?: string;
  public_id?: string;
};

export const deleteImageFromCloudinary = async (
  input: string | CloudinaryUploadResultLike | null | undefined,
) => {
  try {
    if (!input) return;

    // if object and has public_id, best option
    if (typeof input === "object" && input.public_id) {
      await cloudinary.uploader.destroy(input.public_id);
      console.log(`File ${input.public_id} deleted from cloudinary`);
      return;
    }

    // otherwise resolve to URL string
    const url = typeof input === "string" ? input : input.secure_url || input.url || "";

    if (!url) return;

    // remove query string
    const cleanUrl = url.split("?")[0];

    // must contain /upload/
    const parts = cleanUrl.split("/upload/");
    if (parts.length < 2) return;

    // remove version
    const withoutVersion = parts[1].replace(/^v\d+\//, "");

    // remove extension
    const public_id = withoutVersion.replace(/\.[^/.]+$/, "");

    if (!public_id) return;

    await cloudinary.uploader.destroy(public_id);
    console.log(`File ${public_id} deleted from cloudinary`);
  } catch (error: any) {
    throw new Error(`Cloudinary image deletion failed ${error.message}`);
  }
};
