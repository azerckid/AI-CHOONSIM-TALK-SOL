import { createClient } from "@libsql/client";
import { CHARACTERS } from "../app/lib/characters";
import path from "path";
import fs from "fs";

// Load .env manually
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) return;
    const [key, ...valueParts] = trimmedLine.split('=');
    if (key && valueParts.length > 0) {
        let value = valueParts.join('=').trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        env[key] = value;
    }
});

const client = createClient({
    url: env.TURSO_DATABASE_URL!,
    authToken: env.TURSO_AUTH_TOKEN!,
});

async function main() {
    console.log("Seeding characters into remote Turso DB...");

    for (const char of Object.values(CHARACTERS)) {
        console.log(`Seeding ${char.name}...`);

        // 1. Character table
        await client.execute({
            sql: `INSERT INTO "Character" (id, name, role, bio, personaPrompt, isOnline, createdAt, updatedAt) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                  ON CONFLICT(id) DO UPDATE SET 
                  name=excluded.name, role=excluded.role, bio=excluded.bio, 
                  personaPrompt=excluded.personaPrompt, isOnline=excluded.isOnline, updatedAt=excluded.updatedAt`,
            args: [
                char.id,
                char.name,
                char.role,
                char.bio,
                char.personaPrompt,
                char.isOnline ? 1 : 0,
                new Date().toISOString(),
                new Date().toISOString()
            ]
        });

        // 2. CharacterStat (initial)
        await client.execute({
            sql: `INSERT INTO "CharacterStat" (id, characterId, totalHearts, totalUniqueGivers, createdAt, updatedAt)
                  VALUES (?, ?, 0, 0, ?, ?)
                  ON CONFLICT(characterId) DO NOTHING`,
            args: [
                crypto.randomUUID(),
                char.id,
                new Date().toISOString(),
                new Date().toISOString()
            ]
        });

        // 3. Media (Avatar)
        await client.execute({
            sql: `INSERT INTO "CharacterMedia" (id, characterId, url, type, sortOrder, createdAt)
                  VALUES (?, ?, ?, 'AVATAR', 0, ?)
                  ON CONFLICT(id) DO NOTHING`,
            args: [
                crypto.randomUUID(),
                char.id,
                char.avatarUrl,
                new Date().toISOString()
            ]
        });
    }

    console.log("Done!");
}

main().catch(console.error);
