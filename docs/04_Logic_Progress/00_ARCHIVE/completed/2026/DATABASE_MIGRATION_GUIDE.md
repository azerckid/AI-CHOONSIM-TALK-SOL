# Turso 데이터베이스 분리 및 마이그레이션 가이드 (Drizzle)

이 문서는 기존 공유 데이터베이스에서 `choonsim-chat` 전용 데이터베이스로 안전하게 이전하기 위한 절차를 정의합니다. 사용자님의 **[DATABASE INTEGRITY RULE]**에 따라 데이터 보존을 최우선으로 합니다.

---

## 1. 개요 (Overview)

### 1.1 프로젝트 컨텍스트

이 문서는 **CHAT-BOTS** 프로젝트의 Turso 데이터베이스 마이그레이션 가이드입니다.

**현재 프로젝트 상태**:
- **ORM**: Drizzle ORM (Prisma에서 전환 완료)
- **데이터베이스**: Turso (libSQL)
- **마이그레이션 도구**: Drizzle Kit
- **설정 파일**: `drizzle.config.ts`, `app/db/schema.ts`

**마이그레이션 시나리오**:
1. 기존 공유 데이터베이스에서 전용 데이터베이스로 분리
2. 새로운 데이터베이스 생성 및 스키마 적용
3. 데이터 복원 및 검증

---

## 2. 핵심 목표

- 기존 공유 DB에서 `choonsim-chat` 전용 DB로 분리하여 독립성 확보
- Drizzle ORM 및 Turso CLI를 사용한 안전한 스키마 및 데이터 이전
- 전체 과정 중 데이터 손실 방지 (백업 필수)
- 마이그레이션 후 모든 기능 정상 작동 검증

---

## 3. 준비 사항

### 3.1 필수 도구 설치

**Turso CLI 설치**:
```bash
# macOS
brew install tursodatabase/tap/turso

# Linux / Windows (WSL)
curl -sSfL https://get.turso.tech/install.sh | bash
```

**Turso CLI 로그인 확인**:
```bash
turso auth status
# 출력 예시: Logged in as: your-email@example.com
```

**Turso CLI 버전 확인**:
```bash
turso --version
# 권장: v0.90.0 이상
```

### 3.2 프로젝트 설정 확인

**Drizzle 설정 파일 확인** (`drizzle.config.ts`):
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./app/db/schema.ts",
    out: "./drizzle",
    dialect: "turso",
    dbCredentials: {
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN,
    },
});
```

**환경 변수 확인** (`.env` 파일):
```bash
# 현재 데이터베이스 정보 확인
echo $TURSO_DATABASE_URL
echo $TURSO_AUTH_TOKEN
```

**현재 데이터베이스 목록 확인**:
```bash
turso db list
# 출력 예시:
# choonsim-dev (current)
# choonsim-prod
```

### 3.3 현재 데이터베이스 정보 수집

**기존 데이터베이스 이름 확인**:
```bash
# 방법 1: 환경 변수에서 추출
echo $TURSO_DATABASE_URL | grep -oP 'libsql://\K[^-]+'
# 출력 예시: choonsim-dev

# 방법 2: Turso CLI로 확인
turso db list
```

**기존 데이터베이스 URL 확인**:
```bash
turso db show <OLD_DB_NAME> --url
# 출력 예시: libsql://choonsim-dev-username.turso.io
```

**기존 데이터베이스 크기 확인**:
```bash
turso db show <OLD_DB_NAME>
# 출력에서 "Size" 항목 확인
```

---

## 4. 마이그레이션 단계

### 4.1 1단계: 기존 데이터 백업 (Non-negotiable)

**목적**: 환경 변화 전 현재 데이터를 완벽하게 덤프하여 보관합니다.

**백업 명령어**:
```bash
# 기존 DB 명칭을 <OLD_DB_NAME>에 입력
OLD_DB_NAME="nomad-ai"  # 실제 데이터베이스 이름으로 변경
BACKUP_FILE="backup_before_migration_$(date +%Y%m%d_%H%M%S).sql"

turso db dump $OLD_DB_NAME > $BACKUP_FILE
```

**백업 파일 검증**:
```bash
# 파일 크기 확인 (0 바이트가 아닌지 확인)
ls -lh $BACKUP_FILE

# 파일 내용 확인 (최소한 몇 개의 테이블이 있는지 확인)
head -n 50 $BACKUP_FILE

# SQL 문법 검증 (선택사항)
# SQLite3로 로컬에서 테스트 가능
sqlite3 test.db < $BACKUP_FILE
```

**백업 파일 안전한 위치에 보관**:
```bash
# 백업 디렉토리 생성
mkdir -p backups
mv $BACKUP_FILE backups/

# Git에 커밋하지 않도록 .gitignore 확인
echo "backups/*.sql" >> .gitignore
```

**예상 소요 시간**: 데이터베이스 크기에 따라 1-10분

---

### 4.2 2단계: 신규 데이터베이스 생성

**목적**: Turso에 전용 데이터베이스를 생성합니다.

**데이터베이스 생성**:
```bash
NEW_DB_NAME="choonsim-chat"
turso db create $NEW_DB_NAME
```

**생성 확인**:
```bash
# 데이터베이스 목록에서 확인
turso db list | grep $NEW_DB_NAME

# 데이터베이스 정보 확인
turso db show $NEW_DB_NAME
```

**리전 선택 (선택사항)**:
```bash
# 사용 가능한 리전 확인
turso db locations

# 특정 리전에 생성 (예: 서울)
turso db create $NEW_DB_NAME --location seoul
```

**예상 소요 시간**: 10-30초

---

### 4.3 3단계: 신규 연결 정보 획득

**목적**: 새 데이터베이스의 URL과 인증 토큰을 가져옵니다.

**데이터베이스 URL 획득**:
```bash
NEW_DB_NAME="choonsim-chat"
turso db show $NEW_DB_NAME --url
# 출력 예시: libsql://choonsim-chat-username.turso.io
```

**인증 토큰 생성**:
```bash
# 읽기/쓰기 토큰 생성
turso db tokens create $NEW_DB_NAME

# 출력 예시:
# Created token: eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

**토큰 권한 확인**:
```bash
# 생성된 토큰 목록 확인
turso db tokens list $NEW_DB_NAME
```

**임시 환경 변수 설정** (테스트용):
```bash
# 현재 세션에서만 유효
export TURSO_DATABASE_URL_NEW="libsql://choonsim-chat-username.turso.io"
export TURSO_AUTH_TOKEN_NEW="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9..."
```

**예상 소요 시간**: 1분

---

### 4.4 4단계: 스키마 적용 (Drizzle Push)

**목적**: 새 데이터베이스에 현재 스키마를 적용합니다.

**방법 1: 환경 변수 임시 변경 후 Push** (권장)

```bash
# 기존 환경 변수 백업
cp .env .env.backup

# 새 데이터베이스 정보로 임시 변경
cat > .env.temp << EOF
TURSO_DATABASE_URL=$TURSO_DATABASE_URL_NEW
TURSO_AUTH_TOKEN=$TURSO_AUTH_TOKEN_NEW
EOF

# 임시 .env 사용하여 스키마 적용
export $(cat .env.temp | xargs)
npx drizzle-kit push

# 원래 .env 복원
mv .env.backup .env
rm .env.temp
```

**방법 2: 직접 환경 변수 지정**

```bash
TURSO_DATABASE_URL=$TURSO_DATABASE_URL_NEW \
TURSO_AUTH_TOKEN=$TURSO_AUTH_TOKEN_NEW \
npx drizzle-kit push
```

**스키마 적용 확인**:
```bash
# 데이터베이스에 테이블이 생성되었는지 확인
turso db shell $NEW_DB_NAME "SELECT name FROM sqlite_master WHERE type='table';"
```

**예상 소요 시간**: 30초-2분

---

### 4.5 5단계: 데이터 복원 (Data Import)

**목적**: 백업된 데이터를 새 데이터베이스에 삽입합니다.

**주의사항**:
- `_drizzle_migrations` 테이블이 이미 존재할 수 있음
- 외래키 제약조건으로 인한 순서 문제 발생 가능
- 중복 데이터로 인한 UNIQUE 제약조건 위반 가능

**데이터 복원 전 준비**:
```bash
# 백업 파일에서 마이그레이션 테이블 제거 (선택사항)
BACKUP_FILE="backups/backup_before_migration_YYYYMMDD_HHMMSS.sql"
CLEANED_BACKUP="backups/backup_cleaned.sql"

# _drizzle_migrations 테이블 관련 SQL 제거
grep -v "_drizzle_migrations" $BACKUP_FILE > $CLEANED_BACKUP
```

**데이터 복원 실행**:
```bash
# 방법 1: Turso Shell 사용
turso db shell $NEW_DB_NAME < $BACKUP_FILE

# 방법 2: 정리된 백업 파일 사용
turso db shell $NEW_DB_NAME < $CLEANED_BACKUP
```

**복원 중 오류 처리**:
```bash
# 오류 발생 시 로그 확인
turso db shell $NEW_DB_NAME < $BACKUP_FILE 2>&1 | tee restore.log

# 일반적인 오류:
# 1. UNIQUE constraint failed: 이미 존재하는 데이터
#    → 무시하거나 기존 데이터 삭제 후 재시도
# 2. FOREIGN KEY constraint failed: 참조 무결성 오류
#    → 외래키 제약조건 일시 비활성화 후 복원
```

**외래키 제약조건 일시 비활성화** (필요시):
```bash
# 복원 전
turso db shell $NEW_DB_NAME "PRAGMA foreign_keys = OFF;"

# 복원 실행
turso db shell $NEW_DB_NAME < $BACKUP_FILE

# 복원 후
turso db shell $NEW_DB_NAME "PRAGMA foreign_keys = ON;"
```

**복원 검증**:
```bash
# 테이블 개수 확인
turso db shell $NEW_DB_NAME "SELECT COUNT(*) FROM sqlite_master WHERE type='table';"

# 주요 테이블 데이터 개수 확인
turso db shell $NEW_DB_NAME "SELECT COUNT(*) FROM User;"
turso db shell $NEW_DB_NAME "SELECT COUNT(*) FROM Message;"
turso db shell $NEW_DB_NAME "SELECT COUNT(*) FROM Conversation;"

# 기존 DB와 비교
turso db shell $OLD_DB_NAME "SELECT COUNT(*) FROM User;"
```

**예상 소요 시간**: 데이터베이스 크기에 따라 5-30분

---

### 4.6 6단계: 환경 변수 최종 업데이트

**목적**: 프로젝트의 `.env` 파일을 새 정보로 업데이트합니다.

**환경 변수 업데이트**:
```bash
# .env 파일 백업
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# 새 정보로 업데이트
cat > .env << EOF
TURSO_DATABASE_URL=$TURSO_DATABASE_URL_NEW
TURSO_AUTH_TOKEN=$TURSO_AUTH_TOKEN_NEW

# 기타 환경 변수 유지
$(grep -v "TURSO_" .env.backup.* | head -1)
EOF
```

**또는 수동 편집**:
```env
# .env 파일
TURSO_DATABASE_URL=libsql://choonsim-chat-username.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

**환경 변수 확인**:
```bash
# 새 환경 변수 로드
source .env  # 또는 export $(cat .env | xargs)

# 확인
echo $TURSO_DATABASE_URL
echo $TURSO_AUTH_TOKEN
```

**예상 소요 시간**: 1분

---

### 4.7 7단계: 애플리케이션 검증

**목적**: 새 데이터베이스에서 모든 기능이 정상 작동하는지 확인합니다.

**연결 테스트**:
```bash
# Drizzle 연결 테스트 스크립트 실행
node -e "
const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
    url: process.env.TURSO_DATABASE_URL || '',
    authToken: process.env.TURSO_AUTH_TOKEN || '',
});

(async () => {
    try {
        console.log('Testing database connection...');
        const result = await client.execute('SELECT 1 as test');
        console.log('✅ Database connection successful');
        console.log('✅ Test query result:', result.rows);
        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
})();
"
```

**애플리케이션 실행 및 테스트**:
```bash
# 개발 서버 실행
npm run dev

# 주요 기능 테스트:
# 1. 사용자 로그인
# 2. 채팅 내역 조회
# 3. 메시지 전송
# 4. 캐릭터 정보 조회
# 5. 결제 내역 조회 (해당되는 경우)
```

**데이터 무결성 검증**:
```bash
# 주요 테이블 데이터 일치 확인
# User 테이블
turso db shell $NEW_DB_NAME "SELECT COUNT(*) as count FROM User;"
turso db shell $OLD_DB_NAME "SELECT COUNT(*) as count FROM User;"

# Message 테이블
turso db shell $NEW_DB_NAME "SELECT COUNT(*) as count FROM Message;"
turso db shell $OLD_DB_NAME "SELECT COUNT(*) as count FROM Message;"

# Conversation 테이블
turso db shell $NEW_DB_NAME "SELECT COUNT(*) as count FROM Conversation;"
turso db shell $OLD_DB_NAME "SELECT COUNT(*) as count FROM Conversation;"
```

**예상 소요 시간**: 10-30분

---

## 5. 주의 사항 및 보안 규칙

### 5.1 데이터 보존 규칙

- **삭제 지연**: 새 환경에서 모든 기능이 정상 작동(사용자 로그인, 채팅 내역 조회 등)하는 것을 확인하기 전까지 기존 공유 DB의 데이터를 절대 삭제하지 마십시오.
- **백업 보관**: 백업 파일을 최소 30일간 보관하고, 클라우드 스토리지에도 추가 백업을 권장합니다.
- **단계별 검증**: 각 단계 완료 후 반드시 검증을 수행하고, 문제가 발견되면 즉시 중단합니다.

### 5.2 격리 및 안전성

- **Isolate Logic**: 마이그레이션 스크립트 작성 시 다른 서비스의 테이블에 영향을 주지 않도록 조건부 체크를 철저히 관리하십시오.
- **트랜잭션 사용**: 데이터 복원 시 트랜잭션을 사용하여 원자성을 보장합니다.
- **롤백 준비**: 각 단계에서 롤백 방법을 미리 준비합니다.

### 5.3 개발 워크플로우

- **Safe Checkpoint**: 각 단계 완료 후 프로젝트 상태를 `git commit` 하십시오.
- **문서화**: 마이그레이션 과정에서 발생한 문제와 해결 방법을 문서화합니다.
- **팀 공유**: 마이그레이션 진행 상황을 팀과 공유합니다.

---

## 6. 문제 해결 (Troubleshooting)

### 6.1 일반적인 오류

#### 오류 1: "database is locked"
**원인**: 다른 프로세스가 데이터베이스에 접근 중

**해결 방법**:
```bash
# 활성 연결 확인
turso db show $NEW_DB_NAME

# 잠시 대기 후 재시도
sleep 5
turso db shell $NEW_DB_NAME < $BACKUP_FILE
```

#### 오류 2: "UNIQUE constraint failed"
**원인**: 중복 데이터 삽입 시도

**해결 방법**:
```bash
# 기존 데이터 삭제 후 재시도
turso db shell $NEW_DB_NAME "DELETE FROM User WHERE id IN (SELECT id FROM User);"

# 또는 INSERT OR IGNORE 사용하도록 백업 파일 수정
sed 's/INSERT INTO/INSERT OR IGNORE INTO/g' $BACKUP_FILE > $CLEANED_BACKUP
```

#### 오류 3: "FOREIGN KEY constraint failed"
**원인**: 참조 무결성 위반

**해결 방법**:
```bash
# 외래키 제약조건 일시 비활성화
turso db shell $NEW_DB_NAME << EOF
PRAGMA foreign_keys = OFF;
.read $BACKUP_FILE
PRAGMA foreign_keys = ON;
EOF
```

#### 오류 4: "no such table: _drizzle_migrations"
**원인**: Drizzle 마이그레이션 테이블이 없음

**해결 방법**:
```bash
# 스키마를 먼저 적용
npx drizzle-kit push

# 그 다음 데이터 복원
turso db shell $NEW_DB_NAME < $BACKUP_FILE
```

### 6.2 성능 문제

#### 느린 데이터 복원
**원인**: 대용량 데이터베이스

**해결 방법**:
```bash
# 배치 크기 조정
# 백업 파일을 작은 청크로 나누어 순차적으로 복원
split -l 1000 $BACKUP_FILE backup_chunk_
for chunk in backup_chunk_*; do
    turso db shell $NEW_DB_NAME < $chunk
done
```

---

## 7. 롤백 절차 (Rollback Procedure)

### 7.1 롤백 시나리오

**시나리오 1: 마이그레이션 중단**
```bash
# 환경 변수를 원래대로 복원
cp .env.backup .env

# 새 데이터베이스 삭제 (선택사항)
turso db destroy $NEW_DB_NAME
```

**시나리오 2: 데이터 불일치 발견**
```bash
# 새 데이터베이스에서 백업 복원
turso db shell $NEW_DB_NAME < $BACKUP_FILE

# 또는 새 데이터베이스 삭제 후 재생성
turso db destroy $NEW_DB_NAME
turso db create $NEW_DB_NAME
# 4-6단계 재실행
```

**시나리오 3: 애플리케이션 오류**
```bash
# 환경 변수 롤백
cp .env.backup .env

# 애플리케이션 재시작
npm run dev
```

### 7.2 롤백 결정 기준

- **Critical 버그 발생**: 즉시 롤백
- **데이터 불일치**: 즉시 롤백
- **성능 저하**: 20% 이상 저하 시 롤백 검토
- **사용자 영향**: 사용자 로그인 불가 시 즉시 롤백

---

## 8. 검증 체크리스트

마이그레이션 완료 후 다음 항목을 확인하세요:

- [ ] 백업 파일이 생성되었고 비어있지 않음
- [ ] 새 데이터베이스가 생성되었고 접근 가능함
- [ ] 스키마가 정상적으로 적용되었음
- [ ] 데이터가 정상적으로 복원되었음
- [ ] 테이블 개수가 기존과 일치함
- [ ] 주요 테이블의 데이터 개수가 기존과 일치함
- [ ] 환경 변수가 올바르게 업데이트되었음
- [ ] 애플리케이션이 정상적으로 실행됨
- [ ] 사용자 로그인이 정상 작동함
- [ ] 채팅 기능이 정상 작동함
- [ ] 데이터 조회가 정상 작동함
- [ ] Git 커밋이 완료되었음

---

## 9. 마이그레이션 후 작업

### 9.1 모니터링

**첫 24시간 모니터링**:
- 데이터베이스 연결 오류 모니터링
- 쿼리 성능 모니터링
- 에러 로그 확인

**모니터링 명령어**:
```bash
# 데이터베이스 상태 확인
turso db show $NEW_DB_NAME

# 연결 테스트
node -e "..." # 4.7절의 연결 테스트 스크립트
```

### 9.2 최적화

**인덱스 확인**:
```bash
# 인덱스 목록 확인
turso db shell $NEW_DB_NAME "SELECT name FROM sqlite_master WHERE type='index';"

# 쿼리 성능 분석
turso db shell $NEW_DB_NAME "EXPLAIN QUERY PLAN SELECT * FROM User WHERE email = 'test@example.com';"
```

### 9.3 문서 업데이트

- 마이그레이션 완료 일시 기록
- 발생한 문제 및 해결 방법 문서화
- 팀에 마이그레이션 완료 알림

---

## 10. 추가 리소스

### 10.1 유용한 명령어

```bash
# 데이터베이스 목록
turso db list

# 데이터베이스 정보
turso db show <db-name>

# 데이터베이스 삭제 (주의!)
turso db destroy <db-name>

# 데이터베이스 복제
turso db replicate <source-db> <target-db>

# 데이터베이스 백업 (전체)
turso db dump <db-name> > backup.sql

# 데이터베이스 복원
turso db shell <db-name> < backup.sql
```

### 10.2 참고 문서

- [Turso 공식 문서](https://docs.turso.tech/)
- [Drizzle ORM 문서](https://orm.drizzle.team/)
- [Drizzle Kit 문서](https://orm.drizzle.team/kit-docs/overview)
- [libSQL 문서](https://libsql.org/docs/)

---

## 11. 마이그레이션 스크립트 예시

전체 마이그레이션을 자동화하는 스크립트 예시:

```bash
#!/bin/bash
# migrate-database.sh

set -e  # 오류 발생 시 중단

OLD_DB_NAME="${1:-choonsim-dev}"
NEW_DB_NAME="${2:-choonsim-chat}"
BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_before_migration_$TIMESTAMP.sql"

echo "🚀 Starting database migration..."
echo "Old DB: $OLD_DB_NAME"
echo "New DB: $NEW_DB_NAME"

# 1. 백업 디렉토리 생성
mkdir -p $BACKUP_DIR

# 2. 백업
echo "📦 Step 1: Backing up old database..."
turso db dump $OLD_DB_NAME > $BACKUP_FILE
echo "✅ Backup completed: $BACKUP_FILE"

# 3. 새 데이터베이스 생성
echo "📦 Step 2: Creating new database..."
turso db create $NEW_DB_NAME
echo "✅ New database created: $NEW_DB_NAME"

# 4. 연결 정보 획득
echo "📦 Step 3: Getting connection info..."
NEW_DB_URL=$(turso db show $NEW_DB_NAME --url)
NEW_DB_TOKEN=$(turso db tokens create $NEW_DB_NAME | grep -oP 'Created token: \K.+')
echo "✅ Connection info retrieved"

# 5. 스키마 적용
echo "📦 Step 4: Applying schema..."
TURSO_DATABASE_URL=$NEW_DB_URL TURSO_AUTH_TOKEN=$NEW_DB_TOKEN npx drizzle-kit push
echo "✅ Schema applied"

# 6. 데이터 복원
echo "📦 Step 5: Restoring data..."
turso db shell $NEW_DB_NAME < $BACKUP_FILE
echo "✅ Data restored"

# 7. 검증
echo "📦 Step 6: Verifying migration..."
OLD_COUNT=$(turso db shell $OLD_DB_NAME "SELECT COUNT(*) FROM User;" | tail -1)
NEW_COUNT=$(turso db shell $NEW_DB_NAME "SELECT COUNT(*) FROM User;" | tail -1)

if [ "$OLD_COUNT" -eq "$NEW_COUNT" ]; then
    echo "✅ Verification passed: User count matches ($OLD_COUNT)"
else
    echo "❌ Verification failed: User count mismatch (Old: $OLD_COUNT, New: $NEW_COUNT)"
    exit 1
fi

echo "🎉 Migration completed successfully!"
echo ""
echo "Next steps:"
echo "1. Update .env file with new database URL and token"
echo "2. Test the application"
echo "3. Verify all functionality"
echo "4. Delete old database (only after verification)"
```

**사용 방법**:
```bash
chmod +x migrate-database.sh
./migrate-database.sh <old-db-name> <new-db-name>
```

---

**문서 버전**: 1.0  
**최종 업데이트**: 2026-01-20  
**작성자**: AI Assistant
