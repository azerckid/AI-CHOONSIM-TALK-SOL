import { db } from "../app/lib/db.server";
import * as schema from "../app/db/schema";
import { desc } from "drizzle-orm";

async function main() {
    try {
        console.log("Testing characters findMany query...");
        const characters = await db.query.character.findMany({
            with: {
                media: true,
                stats: true
            },
            orderBy: [desc(schema.character.createdAt)],
            limit: 5,
        });
        console.log("Characters fetched:", characters.length);
        if (characters.length > 0) {
            console.log("First character:", characters[0].name);
            console.log("Media Count:", characters[0].media.length);
        }
    } catch (e) {
        console.error("Query failed:", e);
    }
}

main();
