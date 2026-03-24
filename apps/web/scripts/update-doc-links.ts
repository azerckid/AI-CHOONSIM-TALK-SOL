import * as fs from "fs";
import * as path from "path";

const DOCS_DIR = path.join(process.cwd(), "docs");

// 파일명 매핑: 구 파일명 → 새 파일명
const FILE_NAME_MAP: Record<string, string> = {
    // Foundation
    "design-system.md": "01_UI_DESIGN.md",
    "pricing-analysis.md": "02_PRICING_POLICY.md",
    "performance-strategy.md": "03_PERFORMANCE_STRATEGY.md",
    "near-multichain-signature.md": "04_NEAR_MULTICHAIN_SPEC.md", // archived
    "project-master-plan.md": "05_ROADMAP.md",
    "ai-memory-roadmap.md": "06_AI_MEMORY_ROADMAP.md",
    "voice-interaction-strategy.md": "07_VOICE_INTERACTION_STRATEGY.md",
    "document-management-plan.md": "08_DOCUMENT_MANAGEMENT_PLAN.md",
    "document-archival-strategy.md": "09_DOCUMENT_ARCHIVAL_STRATEGY.md",
    "document-consolidation-strategy.md": "10_DOCUMENT_CONSOLIDATION_STRATEGY.md",
    "NEAR_WALLET_RECOVERY_IMPLEMENTATION_PLAN.md": "11_NEAR_WALLET_RECOVERY_PLAN.md", // archived
    "NEAR_WALLET_RECOVERY_SPEC.md": "12_NEAR_WALLET_RECOVERY_SPEC.md", // archived
    "NEAR_DEPOSIT_ENGINE_FOLLOW_UP.md": "13_NEAR_DEPOSIT_ENGINE_FOLLOW_UP.md", // archived
    "NEAR_WALLET_ASYNC_CREATION_IMPLEMENTATION.md": "14_NEAR_WALLET_ASYNC_CREATION_PLAN.md", // archived
    "VERCEL_AI_SDK_ADOPTION.md": "15_VERCEL_AI_SDK_ADOPTION.md",
    "user-context-layers-implementation-plan.md": "16_USER_CONTEXT_LAYERS_PLAN.md",
    "user-context-layers-phase0-findings.md": "17_USER_CONTEXT_LAYERS_PHASE0.md",
    "user-context-layers-phase1-verification.md": "18_USER_CONTEXT_LAYERS_PHASE1.md",
    
    // Specs (features)
    "admin-choco-economy-spec.md": "02_admin-choco-economy-spec.md",
    "design-spec.md": "03_design-spec.md",
    "implementation-plan.md": "04_implementation-plan.md",
    "requirements.md": "05_requirements.md",
    "TODAYS_PICK_IMPLEMENTATION.md": "01_TODAYS_PICK_IMPLEMENTATION.md",
    "travel-media.md": "06_travel-media.md",
    "choco-exchange-rate-policy.md": "07_choco-exchange-rate-policy.md",
    "crypto-payment.md": "08_crypto-payment.md",
    "token-issuance-spec.md": "09_token-issuance-spec.md",
    "unification-proposal.md": "10_unification-proposal.md",
    "wallet-migration-strategy.md": "11_wallet-migration-strategy.md",
    "x402-strategy.md": "12_x402-strategy.md",
    "x402-ui-spec.md": "13_x402-ui-spec.md",
    "x402-workflow.md": "14_x402-workflow.md",
    "creation-proposal.md": "15_creation-proposal.md",
    "media-strategy.md": "16_media-strategy.md",
    "photos-spec.md": "17_photos-spec.md",
    "context-integration-summary.md": "18_context-integration-summary.md",
    "gift-items.md": "19_gift-items.md",
    "interrupt-strategy.md": "20_interrupt-strategy.md",
    "user-context-layers-spec.md": "21_user-context-layers-spec.md",
    
    // Test (reports + guides)
    "CHOCO_RE_DENOMINATION_COMPLETE_VERIFICATION.md": "01_CHOCO_RE_DENOMINATION_COMPLETE_VERIFICATION.md",
    "CHOCO_VALUE_ANALYSIS_REPORT.md": "02_CHOCO_VALUE_ANALYSIS_REPORT.md",
    "DOCUMENT_CONSOLIDATION_SUMMARY.md": "03_DOCUMENT_CONSOLIDATION_SUMMARY.md",
    "DOCUMENT_MANAGEMENT_REVIEW_SUMMARY.md": "04_DOCUMENT_MANAGEMENT_REVIEW_SUMMARY.md",
    "NEAR_CHAT_BALANCE_UI_COMPLETE_VERIFICATION.md": "05_NEAR_CHAT_BALANCE_UI_COMPLETE_VERIFICATION.md", // archived
    "NEAR_UX_COMPLETE_VERIFICATION.md": "06_NEAR_UX_COMPLETE_VERIFICATION.md", // archived
    "NEAR_UX_GAP_ANALYSIS.md": "07_NEAR_UX_GAP_ANALYSIS.md", // archived
    "PHASE_1_TO_5_COMPLETE_VERIFICATION.md": "08_PHASE_1_TO_5_COMPLETE_VERIFICATION.md",
    "USER_CONTEXT_LAYERS_PHASE3_VERIFICATION.md": "09_USER_CONTEXT_LAYERS_PHASE3_VERIFICATION.md",
    "USER_CONTEXT_LAYERS_PHASE4_VERIFICATION.md": "10_USER_CONTEXT_LAYERS_PHASE4_VERIFICATION.md",
    "USER_CONTEXT_LAYERS_PHASE5_VERIFICATION.md": "11_USER_CONTEXT_LAYERS_PHASE5_VERIFICATION.md",
    "USER_CONTEXT_LAYERS_PHASE6_VERIFICATION.md": "12_USER_CONTEXT_LAYERS_PHASE6_VERIFICATION.md",
    "USER_CONTEXT_LAYERS_PHASE7_VERIFICATION.md": "13_USER_CONTEXT_LAYERS_PHASE7_VERIFICATION.md",
    "USER_CONTEXT_LAYERS_PHASE8_VERIFICATION.md": "14_USER_CONTEXT_LAYERS_PHASE8_VERIFICATION.md",
    "VERCEL_AI_SDK_ADOPTION_COMPLETE_ANALYSIS.md": "15_VERCEL_AI_SDK_ADOPTION_COMPLETE_ANALYSIS.md",
    "X402_CHOCO_DEDUCTION_AND_NEAR_SWEEP_ISSUE_ANALYSIS.md": "16_X402_CHOCO_DEDUCTION_AND_NEAR_SWEEP_ISSUE_ANALYSIS.md",
    "choco-token-creation.md": "17_choco-token-creation.md",
    "NEAR_WALLET_E2E_TESTING.md": "18_NEAR_WALLET_E2E_TESTING.md",
    "user-bio-to-context-migration.md": "19_user-bio-to-context-migration.md",
    "wallet-test-guide.md": "20_wallet-test-guide.md",
    "wallet-troubleshooting.md": "21_wallet-troubleshooting.md",
    "x402-user-guide.md": "22_x402-user-guide.md",
    "zero-friction-uat.md": "23_zero-friction-uat.md",
};

// 경로 매핑 규칙
function mapOldPathToNew(oldPath: string): string {
    // 상대 경로에서 파일명 추출
    const fileName = path.basename(oldPath);
    const dirName = path.dirname(oldPath);
    
    // 경로 패턴 매칭
    if (oldPath.includes("docs/core/")) {
        const newFileName = FILE_NAME_MAP[fileName] || fileName;
        return `docs/01_Concept_Design/${newFileName}`;
    }
    if (oldPath.includes("docs/features/")) {
        const newFileName = FILE_NAME_MAP[fileName] || fileName;
        return `docs/03_Technical_Specs/${newFileName}`;
    }
    if (oldPath.includes("docs/roadmap/")) {
        const newFileName = FILE_NAME_MAP[fileName] || fileName;
        return `docs/01_Concept_Design/${newFileName}`;
    }
    if (oldPath.includes("docs/reports/")) {
        const newFileName = FILE_NAME_MAP[fileName] || fileName;
        return `docs/05_QA_Validation/${newFileName}`;
    }
    if (oldPath.includes("docs/guides/")) {
        const newFileName = FILE_NAME_MAP[fileName] || fileName;
        return `docs/05_QA_Validation/${newFileName}`;
    }
    if (oldPath.includes("docs/stitch/")) {
        return oldPath.replace("docs/stitch/", "docs/02_UI_Screens/");
    }
    
    // 새로운 폴더명으로 변경된 경로 업데이트
    if (oldPath.includes("docs/01_Foundation/")) {
        return oldPath.replace("docs/01_Foundation/", "docs/01_Concept_Design/");
    }
    if (oldPath.includes("docs/02_Prototype/")) {
        return oldPath.replace("docs/02_Prototype/", "docs/02_UI_Screens/");
    }
    if (oldPath.includes("docs/03_Specs/")) {
        return oldPath.replace("docs/03_Specs/", "docs/03_Technical_Specs/");
    }
    if (oldPath.includes("docs/04_Logic/")) {
        return oldPath.replace("docs/04_Logic/", "docs/04_Logic_Progress/");
    }
    if (oldPath.includes("docs/05_Test/")) {
        return oldPath.replace("docs/05_Test/", "docs/05_QA_Validation/");
    }
    
    return oldPath;
}

// 경로 변환 함수
function convertPath(oldPath: string, currentFile: string): string {
    // 구 경로 패턴 확인
    const oldPathPatterns = [
        /docs\/core\//,
        /docs\/features\//,
        /docs\/roadmap\//,
        /docs\/reports\//,
        /docs\/guides\//,
        /docs\/stitch\//,
        /docs\/01_Foundation\//,
        /docs\/02_Prototype\//,
        /docs\/03_Specs\//,
        /docs\/04_Logic\//,
        /docs\/05_Test\//,
    ];
    
    const needsUpdate = oldPathPatterns.some(pattern => pattern.test(oldPath));
    
    if (!needsUpdate) {
        return oldPath;
    }
    
    // 새 경로로 변환
    const newPath = mapOldPathToNew(oldPath);
    
    // 현재 파일 위치에 맞게 상대 경로 계산
    const currentLayer = currentFile.match(/docs\/(\d+_[^/]+)\//)?.[1];
    const targetLayer = newPath.match(/docs\/(\d+_[^/]+)\//)?.[1];
    
    if (currentLayer && targetLayer) {
        if (currentLayer === targetLayer) {
            // 같은 레이어: ./filename
            return `./${path.basename(newPath)}`;
        } else {
            // 다른 레이어: ../layer/filename
            return `../${targetLayer}/${path.basename(newPath)}`;
        }
    }
    
    return newPath;
}

// 마크다운 링크 패턴: [text](path) 또는 [text](./path) 또는 [text](../path)
function updateLinks(content: string, currentFile: string): string {
    let updated = content;
    
    // 1. 마크다운 링크 패턴: [text](path)
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    updated = updated.replace(linkPattern, (match, text, linkPath) => {
        // 외부 링크나 앵커 링크는 건너뛰기
        if (linkPath.startsWith("http") || linkPath.startsWith("#") || linkPath.startsWith("mailto:")) {
            return match;
        }
        
        const newPath = convertPath(linkPath, currentFile);
        return newPath !== linkPath ? `[${text}](${newPath})` : match;
    });
    
    // 2. 백틱으로 감싸진 경로: `docs/core/file.md` 또는 `docs/features/chat/file.md`
    const backtickPattern = /`([^`]*docs\/(?:core|features|roadmap|reports|guides|stitch|01_Foundation|02_Prototype|03_Specs|04_Logic|05_Test)\/[^`]+\.md[^`]*)`/g;
    updated = updated.replace(backtickPattern, (match, oldPath) => {
        const newPath = convertPath(oldPath, currentFile);
        return newPath !== oldPath ? `\`${newPath}\`` : match;
    });
    
    // 3. 일반 텍스트 경로 (백틱 없이): docs/core/file.md
    const textPathPattern = /(^|[^`])(docs\/(?:core|features|roadmap|reports|guides|stitch|01_Foundation|02_Prototype|03_Specs|04_Logic|05_Test)\/[^\s\)\`]+\.md)(?=[\s\)]|$)/gm;
    updated = updated.replace(textPathPattern, (match, prefix, oldPath) => {
        const newPath = convertPath(oldPath, currentFile);
        return newPath !== oldPath ? `${prefix}${newPath}` : match;
    });
    
    return updated;
}

function processFile(filePath: string): void {
    const content = fs.readFileSync(filePath, "utf-8");
    const updated = updateLinks(content, filePath);
    
    if (content !== updated) {
        fs.writeFileSync(filePath, updated, "utf-8");
        console.log(`✓ Updated: ${path.relative(process.cwd(), filePath)}`);
    }
}

function getAllMarkdownFiles(dir: string): string[] {
    const files: string[] = [];
    
    function walk(currentPath: string) {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            
            if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "archive") {
                walk(fullPath);
            } else if (entry.isFile() && entry.name.endsWith(".md")) {
                files.push(fullPath);
            }
        }
    }
    
    walk(dir);
    return files;
}

function main() {
    console.log("Updating document links...\n");
    
    const layers = ["01_Concept_Design", "02_UI_Screens", "03_Technical_Specs", "04_Logic_Progress", "05_QA_Validation"];
    
    for (const layer of layers) {
        const layerDir = path.join(DOCS_DIR, layer);
        if (!fs.existsSync(layerDir)) continue;
        
        const files = getAllMarkdownFiles(layerDir);
        console.log(`Processing ${layer} (${files.length} files)...`);
        
        for (const file of files) {
            processFile(file);
        }
    }
    
    // AGENTS.md도 업데이트
    const agentsPath = path.join(process.cwd(), "AGENTS.md");
    if (fs.existsSync(agentsPath)) {
        console.log("\nProcessing AGENTS.md...");
        processFile(agentsPath);
    }
    
    console.log("\n✅ Link update completed!");
}

main();
