import { db } from "../app/lib/db.server";
import * as schema from "../app/db/schema";
import { desc } from "drizzle-orm";

async function main() {
    try {
        console.log("Testing user findMany query...");
        const users = await db.query.user.findMany({
            orderBy: [desc(schema.user.createdAt)],
            limit: 5,
        });
        console.log("Users fetched:", users.length);
        console.log("First user:", users[0]);
    } catch (e) {
        console.error("Query failed:", e);
    }
}

main();
