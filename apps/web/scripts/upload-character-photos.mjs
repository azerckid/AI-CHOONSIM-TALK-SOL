#!/usr/bin/env node

/**
 * 캐릭터 사진을 Cloudinary에 업로드하고 characters.ts를 업데이트하는 스크립트
 * 
 * 사용법:
 * 1. 캐릭터 사진 파일들을 준비 (예: chunsim-photo1.jpg, chunsim-photo2.jpg)
 * 2. 이 스크립트 실행: node scripts/upload-character-photos.mjs <characterId> <photoPath1> [photoPath2] ...
 * 
 * 예시:
 * node scripts/upload-character-photos.mjs chunsim ./photos/chunsim-1.jpg ./photos/chunsim-2.jpg
 */

import { v2 as cloudinary } from "cloudinary";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// Cloudinary 설정
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadPhoto(filePath, characterId) {
    try {
        const fileBuffer = readFileSync(filePath);
        const base64 = `data:image/jpeg;base64,${fileBuffer.toString("base64")}`;
        
        const result = await cloudinary.uploader.upload(base64, {
            folder: `chunsim-chat/characters/${characterId}`,
            public_id: `photo_${Date.now()}`,
            overwrite: false,
        });
        
        console.log(`✓ 업로드 완료: ${result.secure_url}`);
        return result.secure_url;
    } catch (error) {
        console.error(`✗ 업로드 실패 (${filePath}):`, error.message);
        throw error;
    }
}

async function updateCharactersFile(characterId, photoUrls) {
    const charactersPath = join(projectRoot, "app", "lib", "characters.ts");
    let content = readFileSync(charactersPath, "utf-8");
    
    // 해당 캐릭터의 photoGallery 찾기
    const characterRegex = new RegExp(
        `(${characterId}:\\s*{[^}]*photoGallery:\\s*\\[)([^\\]]*)(\\])`,
        "s"
    );
    
    const match = content.match(characterRegex);
    if (!match) {
        console.error(`✗ 캐릭터 '${characterId}'를 찾을 수 없습니다.`);
        return false;
    }
    
    // 기존 URL과 새 URL 합치기 (중복 제거)
    const existingUrls = match[2]
        .split(",")
        .map(url => url.trim().replace(/["']/g, ""))
        .filter(url => url && url.startsWith("http"));
    
    const allUrls = [...new Set([...existingUrls, ...photoUrls])];
    const photoGalleryContent = allUrls.map(url => `"${url}"`).join(",\n            ");
    
    // 파일 업데이트
    const newContent = content.replace(
        characterRegex,
        `$1\n            ${photoGalleryContent}\n        $3`
    );
    
    writeFileSync(charactersPath, newContent, "utf-8");
    console.log(`✓ characters.ts 파일이 업데이트되었습니다.`);
    return true;
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log(`
사용법: node scripts/upload-character-photos.mjs <characterId> <photoPath1> [photoPath2] ...

예시:
  node scripts/upload-character-photos.mjs chunsim ./photos/chunsim-1.jpg ./photos/chunsim-2.jpg
  node scripts/upload-character-photos.mjs mina ./photos/mina-1.jpg

캐릭터 ID:
  - chunsim
  - mina
  - yuna
  - sora
  - rina
  - hana
        `);
        process.exit(1);
    }
    
    const characterId = args[0];
    const photoPaths = args.slice(1);
    
    console.log(`\n캐릭터: ${characterId}`);
    console.log(`업로드할 사진: ${photoPaths.length}개\n`);
    
    // 환경 변수 확인
    if (!process.env.CLOUDINARY_CLOUD_NAME || 
        !process.env.CLOUDINARY_API_KEY || 
        !process.env.CLOUDINARY_API_SECRET) {
        console.error("✗ Cloudinary 환경 변수가 설정되지 않았습니다.");
        console.error("   .env 파일에 다음을 추가하세요:");
        console.error("   CLOUDINARY_CLOUD_NAME=your_cloud_name");
        console.error("   CLOUDINARY_API_KEY=your_api_key");
        console.error("   CLOUDINARY_API_SECRET=your_api_secret");
        process.exit(1);
    }
    
    try {
        const photoUrls = [];
        
        for (const photoPath of photoPaths) {
            const url = await uploadPhoto(photoPath, characterId);
            photoUrls.push(url);
        }
        
        console.log(`\n✓ 총 ${photoUrls.length}개의 사진이 업로드되었습니다.`);
        
        // characters.ts 업데이트
        await updateCharactersFile(characterId, photoUrls);
        
        console.log(`\n✓ 완료! 이제 AI가 [PHOTO:0], [PHOTO:1] 등을 사용하여 사진을 보낼 수 있습니다.`);
    } catch (error) {
        console.error("\n✗ 오류 발생:", error.message);
        process.exit(1);
    }
}

main();

