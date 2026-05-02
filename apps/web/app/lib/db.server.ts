import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import * as schema from "../db/schema";

const connectionConfig = {
    url: process.env.TURSO_DATABASE_URL || "file:./dev.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
};

declare global {
    var __db__: LibSQLDatabase<typeof schema> | undefined;
    var __libsql_client__: Client | undefined;
}

let db: LibSQLDatabase<typeof schema>;

if (process.env.NODE_ENV === "production") {
    const client = createClient(connectionConfig);
    db = drizzle(client, { schema });
} else {
    if (!global.__libsql_client__) {
        global.__libsql_client__ = createClient(connectionConfig);
    }
    if (!global.__db__) {
        global.__db__ = drizzle(global.__libsql_client__, { schema });
    }
    db = global.__db__;
}

export { db };
