import { createClient } from "@libsql/client";
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

const MISSIONS = [
    { title: "첫 인사 건네기", description: "아이돌과 대화를 시작해보세요.", rewardCredits: 50 },
    { title: "하트 선물하기", description: "아이돌에게 하트 1개를 선물해보세요.", rewardCredits: 100 },
    { title: "데일리 채팅", description: "오늘의 대화를 5번 이상 주고받아보세요.", rewardCredits: 30 },
];

async function main() {
    console.log("Seeding missions into remote Turso DB...");

    for (const mission of MISSIONS) {
        console.log(`Seeding mission: ${mission.title}...`);

        const existing = await client.execute({
            sql: `SELECT id FROM "Mission" WHERE title = ?`,
            args: [mission.title]
        });

        if (existing.rows.length === 0) {
            await client.execute({
                sql: `INSERT INTO "Mission" (id, title, description, rewardCredits, isActive, createdAt, updatedAt) 
                      VALUES (?, ?, ?, ?, 1, ?, ?)`,
                args: [
                    crypto.randomUUID(),
                    mission.title,
                    mission.description,
                    mission.rewardCredits,
                    new Date().toISOString(),
                    new Date().toISOString()
                ]
            });
        } else {
            console.log(`Mission "${mission.title}" already exists.`);
        }
    }

    console.log("Done!");
}

main().catch(console.error);
