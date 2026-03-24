import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import * as schema from "../db/schema";
import { initCronJobs } from "./cron.server";

const connectionConfig = {
    url: process.env.TURSO_DATABASE_URL || "file:./dev.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
};

declare global {
    var __db__: LibSQLDatabase<typeof schema> | undefined;
    var __libsql_client__: Client | undefined;
    var __cron_initialized__: boolean | undefined;
}

let db: LibSQLDatabase<typeof schema>;

if (process.env.NODE_ENV === "production") {
    const client = createClient(connectionConfig);
    db = drizzle(client, { schema });
    // Vercel serverless 환경에서는 node-cron이 작동하지 않으므로 크론 잡 비활성화
    // initCronJobs();
} else {
    if (!global.__libsql_client__) {
        global.__libsql_client__ = createClient(connectionConfig);
    }
    if (!global.__db__) {
        global.__db__ = drizzle(global.__libsql_client__, { schema });
    }
    db = global.__db__;

    if (!global.__cron_initialized__) {
        initCronJobs();
        global.__cron_initialized__ = true;
    }
}

export { db };
