import type { ActionFunctionArgs } from "react-router";
import { uploadImage } from "~/lib/cloudinary.server";
import { auth } from "~/lib/auth.server";
import { logger } from "~/lib/logger.server";

export async function action({ request }: ActionFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
    }

    try {
        // React Router v7 request to Node.js IncomingMessage if needed
        // But since we are likely in a standard Node adapter, we might need a workaround or use request.arrayBuffer()

        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return Response.json({ error: "No file uploaded" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

        const url = await uploadImage(base64);

        return Response.json({ url });
    } catch (error) {
        logger.error({ category: "API", message: "Image upload error", stackTrace: (error as Error).stack });
        return Response.json({ error: "Failed to upload image" }, { status: 500 });
    }
}

