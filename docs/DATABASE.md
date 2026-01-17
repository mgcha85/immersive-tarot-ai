# 데이터베이스 스키마

이 문서는 Immersive Tarot AI의 데이터베이스 구조와 쿼리를 설명합니다.

## 개요

| 항목 | 값 |
|------|-----|
| DBMS | SQLite 3.35+ |
| 모드 | WAL (Write-Ahead Logging) |
| ORM | SQLx (Rust) |

## 설정

```sql
-- WAL 모드 활성화 (성능 향상)
PRAGMA journal_mode = WAL;

-- 동기화 모드 (성능과 안정성 균형)
PRAGMA synchronous = NORMAL;
```

---

## 테이블

### sessions

사용자 세션 정보를 저장합니다.

```sql
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_metadata JSON
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | TEXT | 세션 UUID (Primary Key) |
| `created_at` | DATETIME | 생성 시간 |
| `user_metadata` | JSON | 사용자 메타데이터 (선택) |

---

### cards

타로 카드 정적 데이터입니다. 서버 시작시 `tarot_data.json`에서 로드됩니다.

```sql
CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    arcana TEXT NOT NULL,
    suit TEXT,
    number INTEGER,
    archetype TEXT,
    keywords JSON,
    situational_tags JSON
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | TEXT | 카드 ID (예: "major_0", "cups_ace") |
| `name` | TEXT | 카드 이름 (예: "The Fool") |
| `arcana` | TEXT | "major" 또는 "minor" |
| `suit` | TEXT | Minor Arcana의 슈트 (wands/cups/swords/pentacles) |
| `number` | INTEGER | 카드 번호 |
| `archetype` | TEXT | 융 심리학적 원형 |
| `keywords` | JSON | `{"upright": [...], "reversed": [...]}` |
| `situational_tags` | JSON | 상황 태그 배열 (예: ["love", "career"]) |

---

### readings

타로 리딩(점술) 기록입니다.

```sql
CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    user_query TEXT NOT NULL,
    ai_interpretation TEXT,
    drawn_cards JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(session_id) REFERENCES sessions(id)
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INTEGER | 자동 증가 ID |
| `session_id` | TEXT | 세션 ID (FK) |
| `user_query` | TEXT | 사용자 질문 |
| `ai_interpretation` | TEXT | AI 해석 텍스트 |
| `drawn_cards` | JSON | 뽑힌 카드 배열 |
| `created_at` | DATETIME | 생성 시간 |

**drawn_cards 형식:**

```json
[
  {"id": "major_0", "reversed": false},
  {"id": "cups_ace", "reversed": true}
]
```

---

### messages

리딩별 대화 기록입니다.

```sql
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reading_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(reading_id) REFERENCES readings(id) ON DELETE CASCADE
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INTEGER | 자동 증가 ID |
| `reading_id` | INTEGER | 리딩 ID (FK, CASCADE DELETE) |
| `role` | TEXT | "user", "assistant", "system" 중 하나 |
| `content` | TEXT | 메시지 내용 |
| `created_at` | DATETIME | 생성 시간 |

---

### readings_fts

리딩 전문 검색을 위한 FTS5 가상 테이블입니다.

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS readings_fts USING fts5(
    user_query,
    ai_interpretation,
    content='readings',
    content_rowid='id'
);
```

---

## 인덱스

```sql
-- 메시지 조회 최적화
CREATE INDEX IF NOT EXISTS idx_messages_reading ON messages(reading_id);

-- 세션별 리딩 조회 최적화
CREATE INDEX IF NOT EXISTS idx_readings_session ON readings(session_id);
```

---

## 트리거

### FTS 자동 업데이트

```sql
CREATE TRIGGER readings_ai AFTER INSERT ON readings BEGIN
  INSERT INTO readings_fts(rowid, user_query, ai_interpretation) 
  VALUES (new.id, new.user_query, new.ai_interpretation);
END;
```

---

## 주요 쿼리

### 세션 생성 또는 무시

```sql
INSERT INTO sessions (id, user_metadata) 
VALUES (?1, '{}') 
ON CONFLICT(id) DO NOTHING;
```

### 리딩 저장

```sql
INSERT INTO readings (session_id, user_query, drawn_cards, ai_interpretation)
VALUES (?1, ?2, ?3, ?4);
```

### 메시지 저장

```sql
INSERT INTO messages (reading_id, role, content)
VALUES (?1, ?2, ?3);
```

### 리딩별 메시지 조회

```sql
SELECT id, reading_id, role, content, created_at
FROM messages
WHERE reading_id = ?1
ORDER BY created_at ASC;
```

### 전문 검색

```sql
SELECT r.id, r.user_query, r.ai_interpretation, r.created_at
FROM readings r
JOIN readings_fts fts ON r.id = fts.rowid
WHERE readings_fts MATCH ?1
ORDER BY r.created_at DESC
LIMIT 20;
```

---

## Rust 모델

```rust
// models.rs

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TarotCard {
    pub id: String,
    pub name: String,
    pub arcana: String,
    pub suit: Option<String>,
    pub number: i32,
    pub archetype: String,
    pub keywords: Keywords,
    pub situational_tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Keywords {
    pub upright: Vec<String>,
    pub reversed: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DrawnCard {
    pub card: TarotCard,
    pub is_reversed: bool,
    pub position_index: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: i64,
    pub reading_id: i64,
    pub role: String,
    pub content: String,
    pub created_at: String,
}
```

---

## 마이그레이션

### 초기 스키마 (20260115_0001_initial.sql)

- sessions, cards, readings 테이블
- readings_fts 가상 테이블
- FTS 트리거

### 대화 기록 추가 (20260117_0002_conversation.sql)

- messages 테이블
- idx_messages_reading 인덱스

---

## 백업 및 복원

### 백업

```bash
sqlite3 tarot.db ".backup 'tarot_backup.db'"
```

### 복원

```bash
cp tarot_backup.db tarot.db
```

### WAL 파일 포함 백업

```bash
sqlite3 tarot.db "PRAGMA wal_checkpoint(TRUNCATE);"
cp tarot.db tarot_backup.db
```

---

## 성능 팁

| 설정 | 값 | 효과 |
|------|-----|------|
| `journal_mode` | WAL | 읽기/쓰기 동시성 향상 |
| `synchronous` | NORMAL | 쓰기 성능 향상 (약간의 위험) |
| `cache_size` | -2000 (2MB) | 메모리 캐시 증가 |

```sql
PRAGMA cache_size = -2000;
PRAGMA temp_store = MEMORY;
```
