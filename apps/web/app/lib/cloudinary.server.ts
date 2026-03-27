import { v2 as cloudinary } from "cloudinary";
import { logger } from "./logger.server";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(file: string) {
    try {
        const result = await cloudinary.uploader.upload(file, {
            folder: "choonsim-chat",
        });
        return result.secure_url;
    } catch (error) {
        logger.error({ category: "SYSTEM", message: "Cloudinary upload error", stackTrace: (error as Error).stack });
        throw new Error("Failed to upload image");
    }
}

export async function deleteImage(url: string) {
    try {
        // URL에서 public_id 추출
        // 예: https://res.cloudinary.com/cloudname/image/upload/v12345678/folder/public_id.jpg
        const parts = url.split("/");
        const filename = parts[parts.length - 1]; // public_id.jpg
        const folder = parts[parts.length - 2];   // folder
        const publicId = `${folder}/${filename.split(".")[0]}`;

        await cloudinary.uploader.destroy(publicId);
        logger.info({ category: "SYSTEM", message: `Deleted from Cloudinary: ${publicId}` });
    } catch (error) {
        logger.error({ category: "SYSTEM", message: "Cloudinary delete error", stackTrace: (error as Error).stack });
    }
}

export { cloudinary };
