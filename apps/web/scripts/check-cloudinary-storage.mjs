#!/usr/bin/env node

/**
 * Cloudinary에 저장된 이미지 개수와 총 용량을 확인하는 스크립트
 * 
 * 사용법:
 * node scripts/check-cloudinary-storage.mjs
 */

import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Cloudinary 설정
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * 바이트를 읽기 쉬운 형식으로 변환
 */
function formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

async function getStorageStats() {
    try {
        console.log("Cloudinary 저장소 정보를 가져오는 중...\n");

        let totalBytes = 0;
        let totalCount = 0;
        let nextCursor = null;
        const folderStats = new Map(); // 폴더별 통계

        do {
            const options = {
                max_results: 500, // 최대 500개씩 가져오기
                type: "upload", // 업로드된 리소스만
            };

            if (nextCursor) {
                options.next_cursor = nextCursor;
            }

            const result = await cloudinary.api.resources(options);

            // 각 리소스 처리
            for (const resource of result.resources) {
                totalCount++;
                totalBytes += resource.bytes || 0;

                // 폴더별 통계
                if (resource.folder) {
                    const folder = resource.folder;
                    if (!folderStats.has(folder)) {
                        folderStats.set(folder, { count: 0, bytes: 0 });
                    }
                    const stats = folderStats.get(folder);
                    stats.count++;
                    stats.bytes += resource.bytes || 0;
                } else {
                    // 폴더가 없는 경우 "root"로 분류
                    if (!folderStats.has("root")) {
                        folderStats.set("root", { count: 0, bytes: 0 });
                    }
                    const stats = folderStats.get("root");
                    stats.count++;
                    stats.bytes += resource.bytes || 0;
                }
            }

            nextCursor = result.next_cursor;
        } while (nextCursor);

        // 결과 출력
        console.log("=".repeat(50));
        console.log("Cloudinary 저장소 통계");
        console.log("=".repeat(50));
        console.log(`\n전체 이미지 수: ${totalCount.toLocaleString()}개`);
        console.log(`전체 용량: ${formatBytes(totalBytes)} (${totalBytes.toLocaleString()} bytes)`);
        console.log("\n폴더별 통계:");
        console.log("-".repeat(50));

        // 폴더별 통계를 정렬 (용량 기준 내림차순)
        const sortedFolders = Array.from(folderStats.entries()).sort(
            (a, b) => b[1].bytes - a[1].bytes
        );

        for (const [folder, stats] of sortedFolders) {
            const percentage = ((stats.bytes / totalBytes) * 100).toFixed(1);
            console.log(`\n📁 ${folder || "(root)"}`);
            console.log(`   이미지 수: ${stats.count.toLocaleString()}개`);
            console.log(`   용량: ${formatBytes(stats.bytes)} (${percentage}%)`);
        }

        console.log("\n" + "=".repeat(50));

    } catch (error) {
        console.error("오류 발생:", error.message);
        if (error.http_code) {
            console.error(`HTTP 코드: ${error.http_code}`);
        }
        process.exit(1);
    }
}

async function main() {
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

    await getStorageStats();
}

main();

