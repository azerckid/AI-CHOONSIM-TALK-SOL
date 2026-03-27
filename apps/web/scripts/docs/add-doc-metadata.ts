import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const DOCS_DIR = path.join(process.cwd(), "docs");

interface DocInfo {
    filePath: string;
    title: string;
    layer: string;
    createdDate?: string;
    lastUpdated?: string;
}

function getGitDate(filePath: string, type: "created" | "updated"): string {
    try {
        const cmd = type === "created"
            ? `git log --diff-filter=A --format="%ai" -- "${filePath}" | tail -1`
            : `git log -1 --format="%ai" -- "${filePath}"`;
        const result = execSync(cmd, { encoding: "utf-8", cwd: process.cwd() }).trim();
        if (result) {
            const date = new Date(result);
            return date.toISOString().replace("T", " ").substring(0, 16);
        }
    } catch (e) {
        // Git history 없으면 현재 날짜 사용
    }
    const now = new Date();
    return now.toISOString().replace("T", " ").substring(0, 16);
}

function extractTitle(content: string): string {
    // 첫 번째 # 제목 추출
    const match = content.match(/^#\s+(.+)$/m);
    if (match) {
        return match[1].trim();
    }
    return "Untitled Document";
}

function addMetadataHeader(filePath: string, title: string, created: string, updated: string): string {
    const content = fs.readFileSync(filePath, "utf-8");
    
    // 이미 메타데이터가 있으면 스킵
    if (content.match(/^> Created:/m)) {
        return content;
    }
    
    // 첫 번째 # 제목 찾기
    const titleMatch = content.match(/^(#\s+.+)$/m);
    if (!titleMatch) {
        return content;
    }
    
    const titleLine = titleMatch[1];
    const metadata = `# ${title}\n> Created: ${created}\n> Last Updated: ${updated}\n`;
    
    // 제목 라인을 메타데이터로 교체
    return content.replace(/^#\s+.+$/m, metadata);
}

function addRelatedDocuments(filePath: string, layer: string): string {
    let content = fs.readFileSync(filePath, "utf-8");
    
    // 이미 Related Documents 섹션이 있으면 스킵
    if (content.match(/##\s+.*Related Documents/i)) {
        return content;
    }
    
    // 파일 끝에 Related Documents 섹션 추가
    const relatedSection = `\n\n## Related Documents\n- **${layer}**: [Document Management Plan](./08_DOCUMENT_MANAGEMENT_PLAN.md) - 문서 관리 규칙 및 구조\n`;
    
    return content + relatedSection;
}

function processFile(filePath: string, layer: string): void {
    const content = fs.readFileSync(filePath, "utf-8");
    const title = extractTitle(content);
    const created = getGitDate(filePath, "created");
    const updated = getGitDate(filePath, "updated");
    
    let newContent = addMetadataHeader(filePath, title, created, updated);
    newContent = addRelatedDocuments(filePath, layer);
    
    fs.writeFileSync(filePath, newContent, "utf-8");
    console.log(`✓ Processed: ${path.basename(filePath)}`);
}

function main() {
    const layers = [
        { dir: "01_Foundation", name: "Foundation" },
        { dir: "03_Specs", name: "Specs" },
        { dir: "05_Test", name: "Test" },
    ];
    
    for (const layer of layers) {
        const layerDir = path.join(DOCS_DIR, layer.dir);
        if (!fs.existsSync(layerDir)) continue;
        
        const files = fs.readdirSync(layerDir)
            .filter(f => f.endsWith(".md"))
            .map(f => path.join(layerDir, f));
        
        console.log(`\nProcessing ${layer.name} layer (${files.length} files)...`);
        for (const file of files) {
            processFile(file, layer.name);
        }
    }
    
    console.log("\n✅ Metadata and Related Documents sections added!");
}

main();
