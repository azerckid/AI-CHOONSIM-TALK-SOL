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

/**
 * choonsim/illustrations/ 폴더에서 랜덤 이미지 URL을 반환합니다.
 * 폴더에 이미지가 없으면 CHOONSIM_DEFAULT_IMAGE_URI로 fallback합니다.
 */
export async function getRandomIllustration(): Promise<string> {
    try {
        const result = await cloudinary.api.resources({
            type: "upload",
            prefix: "choonsim/illustrations/",
            max_results: 200,
            resource_type: "image",
        });

        const resources: Array<{ secure_url: string }> = result.resources;
        if (!resources || resources.length === 0) {
            return process.env.CHOONSIM_DEFAULT_IMAGE_URI ||
                "https://res.cloudinary.com/dpmw96p8k/image/upload/v1774674780/choonsim/choonsim.png";
        }

        const random = resources[Math.floor(Math.random() * resources.length)];
        return random.secure_url;
    } catch (error) {
        logger.error({ category: "SYSTEM", message: "getRandomIllustration error", stackTrace: (error as Error).stack });
        return process.env.CHOONSIM_DEFAULT_IMAGE_URI ||
            "https://res.cloudinary.com/dpmw96p8k/image/upload/v1774674780/choonsim/choonsim.png";
    }
}

/**
 * Cloudinary 텍스트 오버레이를 적용한 이미지 URL을 반환합니다.
 * 별도 라이브러리 없이 URL 변환만으로 이미지 합성이 가능합니다.
 *
 * @param imageUrl  - Cloudinary 원본 이미지 URL
 * @param date      - 날짜 문자열 (예: "2026.03.28")
 * @param chatIndex - 대화 순번 (예: 42)
 */
export function buildIllustrationWithOverlay(
    imageUrl: string,
    date: string,
    chatIndex: number
): string {
    const text = `${date} - No.${chatIndex}`;
    const encoded = encodeURIComponent(text);
    const transformation = [
        `l_text:Arial_28_bold:${encoded}`,
        "co_white",
        "g_south_west",
        "x_20",
        "y_20",
        "bo_4px_solid_black",
    ].join(",");

    return imageUrl.replace("/image/upload/", `/image/upload/${transformation}/`);
}

/**
 * NFT 메타데이터 JSON을 Cloudinary raw 리소스로 업로드하고 URL을 반환합니다.
 * Base64 Data URI 대신 표준 HTTPS URL을 사용해 DAS API 호환성을 확보합니다.
 */
export async function uploadNFTMetadata(metadata: object, fileName: string): Promise<string> {
    const json = JSON.stringify(metadata);
    const dataUri = `data:application/json;base64,${Buffer.from(json).toString("base64")}`;

    const result = await cloudinary.uploader.upload(dataUri, {
        folder: "choonsim-nft-metadata",
        public_id: fileName,
        resource_type: "raw",
        overwrite: false,
    });

    return result.secure_url;
}

export { cloudinary };
