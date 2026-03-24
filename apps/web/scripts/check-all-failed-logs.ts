
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "../app/db/schema";
import * as dotenv from "dotenv";
import { and, eq, sql } from "drizzle-orm";

dotenv.config({ path: ".env.development" });

async function main() {
    const client = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const db = drizzle(client, { schema });

    const logs = await db.select().from(schema.exchangeLog).where(
        and(
            eq(schema.exchangeLog.fromChain, "LEGACY"),
            sql`${schema.exchangeLog.status} IN ('FAILED', 'PENDING_SWEEP')`
        )
    );
    console.log(`Found ${logs.length} failed/pending LEGACY sweeps:`);
    console.log(JSON.stringify(logs, null, 2));
}

main().catch(console.error);
