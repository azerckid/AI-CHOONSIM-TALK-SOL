import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config();

const client = createClient({
    url: process.env.TURSO_DATABASE_URL || "",
    authToken: process.env.TURSO_AUTH_TOKEN || "",
});

async function main() {
    const args = process.argv.slice(2);
    const userIdentifier = args[0] || "choonsim";

    try {
        // Find user
        let user;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (emailRegex.test(userIdentifier)) {
            const { rows } = await client.execute({
                sql: "SELECT id, email, name, provider, image, avatarUrl FROM User WHERE email = ?",
                args: [userIdentifier],
            });
            user = rows[0];
        } else {
            const { rows } = await client.execute({
                sql: "SELECT id, email, name, provider, image, avatarUrl FROM User WHERE id = ? OR name = ?",
                args: [userIdentifier, userIdentifier],
            });
            user = rows[0];
        }

        if (!user) {
            console.error(`❌ User not found.`);
            process.exit(1);
        }

        console.log(`\n📊 현재 User 정보:`);
        console.log(`   Name: ${user.name || "NULL"}`);
        console.log(`   Provider: ${user.provider || "NULL"}`);
        console.log(`   Image: ${user.image ? user.image.substring(0, 80) + "..." : "NULL"}`);
        console.log(`   AvatarUrl: ${user.avatarUrl ? user.avatarUrl.substring(0, 80) + "..." : "NULL"}`);

        // Twitter provider인 경우에만 업데이트
        if (user.provider !== "twitter") {
            console.log(`\n⚠️  User의 provider가 "twitter"가 아닙니다 (현재: ${user.provider}).`);
            console.log(`   Twitter provider가 아닌 경우 이 스크립트를 사용하지 않습니다.`);
            process.exit(0);
        }

        // Twitter 이미지 URL을 더 큰 해상도로 변환
        const updateFields = {};
        
        if (user.image && user.image.includes("pbs.twimg.com")) {
            const highResImage = user.image.replace(/_normal|_bigger|_mini/g, "_400x400");
            if (highResImage !== user.image) {
                updateFields.image = highResImage;
                console.log(`\n🔄 Image URL 변환:`);
                console.log(`   Before: ${user.image.substring(0, 80)}...`);
                console.log(`   After:  ${highResImage.substring(0, 80)}...`);
            } else {
                console.log(`\nℹ️  Image URL이 이미 고해상도이거나 변환이 필요 없습니다.`);
            }
        }

        if (user.avatarUrl && user.avatarUrl.includes("pbs.twimg.com")) {
            const highResAvatarUrl = user.avatarUrl.replace(/_normal|_bigger|_mini/g, "_400x400");
            if (highResAvatarUrl !== user.avatarUrl) {
                updateFields.avatarUrl = highResAvatarUrl;
                console.log(`\n🔄 AvatarUrl 변환:`);
                console.log(`   Before: ${user.avatarUrl.substring(0, 80)}...`);
                console.log(`   After:  ${highResAvatarUrl.substring(0, 80)}...`);
            } else {
                console.log(`\nℹ️  AvatarUrl이 이미 고해상도이거나 변환이 필요 없습니다.`);
            }
        }

        if (Object.keys(updateFields).length === 0) {
            console.log(`\n✅ 업데이트할 항목이 없습니다.`);
            process.exit(0);
        }

        // 업데이트 실행
        console.log(`\n⚠️  User 테이블의 이미지 URL을 업데이트합니다...`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        const updateSql = `UPDATE User SET ${Object.keys(updateFields).map(k => `${k} = ?`).join(", ")} WHERE id = ?`;
        const updateArgs = [...Object.values(updateFields), user.id];

        await client.execute({
            sql: updateSql,
            args: updateArgs,
        });

        console.log(`\n✅ 성공적으로 업데이트되었습니다.`);

        // 확인
        const { rows: updatedRows } = await client.execute({
            sql: "SELECT image, avatarUrl FROM User WHERE id = ?",
            args: [user.id],
        });

        console.log(`\n📊 업데이트된 정보:`);
        console.log(`   Image: ${updatedRows[0].image ? updatedRows[0].image.substring(0, 80) + "..." : "NULL"}`);
        console.log(`   AvatarUrl: ${updatedRows[0].avatarUrl ? updatedRows[0].avatarUrl.substring(0, 80) + "..." : "NULL"}`);

    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }

    process.exit(0);
}

main();

