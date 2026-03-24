import { db } from "./db.server";
import * as schema from "../db/schema";

export type LogLevel = "INFO" | "WARN" | "ERROR" | "AUDIT";
export type LogCategory = "SYSTEM" | "API" | "AUTH" | "PAYMENT" | "DB" | "ADMIN" | "MIGRATION";

interface LogPayload {
    level?: LogLevel;
    category?: LogCategory;
    message: string;
    stackTrace?: string;
    metadata?: Record<string, unknown>;
}

export const logger = {
    info: (payload: string | LogPayload) => log("INFO", payload),
    warn: (payload: string | LogPayload) => log("WARN", payload),
    error: (payload: string | LogPayload) => log("ERROR", payload),
    audit: (payload: string | LogPayload) => log("AUDIT", payload),
};

async function log(defaultLevel: LogLevel, payload: string | LogPayload) {
    const isString = typeof payload === "string";
    const level = isString ? defaultLevel : payload.level || defaultLevel;
    const category = isString ? "SYSTEM" : payload.category || "SYSTEM";
    const message = isString ? payload : payload.message;
    const stackTrace = isString ? undefined : payload.stackTrace;
    const metadata = isString ? undefined : payload.metadata ? JSON.stringify(payload.metadata) : undefined;

    // Log to console for dev visibility
    if (process.env.NODE_ENV !== "production") {
        const colors = { INFO: "\x1b[32m", WARN: "\x1b[33m", ERROR: "\x1b[31m", AUDIT: "\x1b[36m" };
        console.log(`${colors[level]}[${level}]\x1b[0m [${category}] ${message}`);
    }

    try {
        // Log to database asynchronously (don't await to avoid blocking response)
        db.insert(schema.systemLog).values({
            id: crypto.randomUUID(),
            level,
            category,
            message,
            stackTrace,
            metadata,
            createdAt: new Date(),
        }).catch((err: unknown) => console.error("Critical: Failed to save log to DB", err));
    } catch (err) {
        console.error("Critical: Logger infrastructure error", err);
    }
}
