export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_UPLOAD_LABEL = "5 MB";

export const ALLOWED_IMAGE_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
] as const;

const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

export type ImageUploadValidation =
    | { ok: true }
    | { ok: false; message: string; status: 400 | 413 | 415 };

export function validateImageUploadFile(file: Pick<File, "name" | "size" | "type">): ImageUploadValidation {
    if (file.size <= 0) {
        return { ok: false, message: "Empty files cannot be uploaded.", status: 400 };
    }

    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
        return {
            ok: false,
            message: `Image must be ${MAX_IMAGE_UPLOAD_LABEL} or smaller.`,
            status: 413,
        };
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
        return { ok: false, message: "Only JPEG, PNG, WebP, and GIF images are supported.", status: 415 };
    }

    const lowerName = file.name.toLowerCase();
    const hasAllowedExtension = ALLOWED_IMAGE_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
    if (!hasAllowedExtension) {
        return { ok: false, message: "Image file extension is not supported.", status: 415 };
    }

    return { ok: true };
}

export function hasAllowedImageSignature(mimeType: string, bytes: Uint8Array): boolean {
    if (mimeType === "image/jpeg") {
        return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    }

    if (mimeType === "image/png") {
        const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
        return signature.every((byte, index) => bytes[index] === byte);
    }

    if (mimeType === "image/gif") {
        const header = String.fromCharCode(...bytes.slice(0, 6));
        return header === "GIF87a" || header === "GIF89a";
    }

    if (mimeType === "image/webp") {
        const riff = String.fromCharCode(...bytes.slice(0, 4));
        const webp = String.fromCharCode(...bytes.slice(8, 12));
        return bytes.length >= 12 && riff === "RIFF" && webp === "WEBP";
    }

    return false;
}
