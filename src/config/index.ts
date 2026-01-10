import dotenv from "dotenv";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  node_env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  database_url: process.env.DATABASE_URL,
  cloudinary: {
    api_secret: process.env.CLOUDINARY_API_SECRET,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
  },
  jwt: {
    jwt_secret: process.env.JWT_SECRET,
    jwt_secret_expires_in: process.env.JWT_SECRET_EXPIRES_IN,
    refresh_token_secret: process.env.REFRESH_TOKEN_SECRET,
    refresh_token_expires_in: process.env.REFRESH_TOKEN_EXPIRES_IN,
  },
  salt_round: process.env.SALT_ROUND,

  stripe_secret_key: process.env.STRIPE_SECRET_KEY,
  webhook_secret_key: process.env.WEBHOOK_SECRET,
};

// export const deleteImageFromCloudinary = async (url: string) => {
//   try {
//     // const regex = /\/v\d+\/(.*?)\.(jpg|jpeg|png|gif|webp)$/i;
//     const regex = /\/v\d+\/(.*?)(\.[^/.]+)?$/;
//     const match = url.match(regex);

//     console.log({ match });
//     if (match && match[1]) {
//       const public_id = match[1];
//       await cloudinary.uploader.destroy(public_id);
//       console.log(`File ${public_id} is deleted from cloudinary`);
//     }
//   } catch (error: any) {
//     throw new Error(`Cloudinary image deletion failed ${error.message}`);
//   }
// };

type CloudinaryUploadResultLike = {
  secure_url?: string;
  url?: string;
  public_id?: string;
};

export const deleteImageFromCloudinary = async (
  input: string | CloudinaryUploadResultLike | null | undefined
) => {
  try {
    if (!input) return;

    // ✅ if object and has public_id, best option
    if (typeof input === "object" && input.public_id) {
      await cloudinary.uploader.destroy(input.public_id);
      console.log(`File ${input.public_id} deleted from cloudinary`);
      return;
    }

    // ✅ otherwise resolve to URL string
    const url =
      typeof input === "string" ? input : input.secure_url || input.url || "";

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
