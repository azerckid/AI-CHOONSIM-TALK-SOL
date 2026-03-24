
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "../app/db/schema";
import * as dotenv from "dotenv";
import { eq } from "drizzle-orm";

dotenv.config({ path: ".env.development" });

async function main() {
    const client = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const db = drizzle(client, { schema });

    const logs = await db.select().from(schema.exchangeLog).where(eq(schema.exchangeLog.userId, "pQgfd2MfcDVQCVMkXTe9gfJ5TVUZWSpk"));
    console.log(JSON.stringify(logs, null, 2));
}

main().catch(console.error);
