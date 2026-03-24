
import { db } from "../app/lib/db.server";
import { exchangeLog } from "../app/db/schema";
import { desc } from "drizzle-orm";

async function main() {
    const logs = await db.select().from(exchangeLog).orderBy(desc(exchangeLog.createdAt)).limit(5);
    console.log(JSON.stringify(logs, null, 2));
}

main().catch(console.error);
