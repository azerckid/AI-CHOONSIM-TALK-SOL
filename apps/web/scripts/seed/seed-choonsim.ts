import { createClient } from "@libsql/client";
import { CHARACTERS } from "../../app/lib/characters";
import path from "path";
import fs from "fs";

// Load .env.development
const envPath = path.resolve(process.cwd(), '.env.development');
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
    const char = CHARACTERS["choonsim"];
    console.log(`Seeding ${char.name}...`);

    await client.execute({
        sql: `INSERT INTO "Character" (id, name, role, bio, personaPrompt, isOnline, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
              name=excluded.name, role=excluded.role, bio=excluded.bio,
              personaPrompt=excluded.personaPrompt, isOnline=excluded.isOnline, updatedAt=excluded.updatedAt`,
        args: [
            char.id, char.name, char.role, char.bio, char.personaPrompt,
            char.isOnline ? 1 : 0,
            new Date().toISOString(), new Date().toISOString()
        ]
    });

    await client.execute({
        sql: `INSERT INTO "CharacterStat" (id, characterId, totalHearts, totalUniqueGivers, createdAt, updatedAt)
              VALUES (?, ?, 0, 0, ?, ?)
              ON CONFLICT(characterId) DO NOTHING`,
        args: [crypto.randomUUID(), char.id, new Date().toISOString(), new Date().toISOString()]
    });

    await client.execute({
        sql: `INSERT INTO "CharacterMedia" (id, characterId, url, type, sortOrder, createdAt)
              VALUES (?, ?, ?, 'AVATAR', 0, ?)
              ON CONFLICT(id) DO NOTHING`,
        args: [crypto.randomUUID(), char.id, char.avatarUrl, new Date().toISOString()]
    });

    console.log("Done! 춘심 캐릭터가 DB에 등록되었습니다.");
}

main().catch(console.error);
