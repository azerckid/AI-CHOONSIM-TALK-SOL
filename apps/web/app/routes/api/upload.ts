import type { ActionFunctionArgs } from "react-router";
import { uploadImage } from "~/lib/cloudinary.server";
import { auth } from "~/lib/auth.server";
import { logger } from "~/lib/logger.server";
import {
    MAX_IMAGE_UPLOAD_BYTES,
    hasAllowedImageSignature,
    validateImageUploadFile,
} from "~/lib/upload-policy";

const MAX_MULTIPART_OVERHEAD_BYTES = 64 * 1024;
const UPLOAD_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const UPLOAD_RATE_LIMIT_MAX = 12;

type UploadRateBucket = {
    count: number;
    resetAt: number;
};

declare global {
    var __uploadRateLimitBuckets: Map<string, UploadRateBucket> | undefined;
}

function checkUploadRateLimit(userId: string): { allowed: true } | { allowed: false; retryAfter: number } {
    const now = Date.now();
    const buckets = globalThis.__uploadRateLimitBuckets ?? new Map<string, UploadRateBucket>();
    globalThis.__uploadRateLimitBuckets = buckets;

    const bucket = buckets.get(userId);
    if (!bucket || bucket.resetAt <= now) {
        buckets.set(userId, { count: 1, resetAt: now + UPLOAD_RATE_LIMIT_WINDOW_MS });
        return { allowed: true };
    }

    if (bucket.count >= UPLOAD_RATE_LIMIT_MAX) {
        return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
    }

    bucket.count += 1;
    return { allowed: true };
}

export async function action({ request }: ActionFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_IMAGE_UPLOAD_BYTES + MAX_MULTIPART_OVERHEAD_BYTES) {
        return Response.json({ error: "Image is too large" }, { status: 413 });
    }

    const rateLimit = checkUploadRateLimit(session.user.id);
    if (!rateLimit.allowed) {
        return Response.json(
            { error: "Too many upload attempts" },
            { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } }
        );
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return Response.json({ error: "No file uploaded" }, { status: 400 });
        }

        const validation = validateImageUploadFile(file);
        if (!validation.ok) {
            return Response.json({ error: validation.message }, { status: validation.status });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (!hasAllowedImageSignature(file.type, buffer)) {
            return Response.json({ error: "File content does not match the declared image type" }, { status: 415 });
        }

        const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

        const url = await uploadImage(base64);

        return Response.json({ url });
    } catch (error) {
        logger.error({ category: "API", message: "Image upload error", stackTrace: (error as Error).stack });
        return Response.json({ error: "Failed to upload image" }, { status: 500 });
    }
}
