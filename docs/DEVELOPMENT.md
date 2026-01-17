# 개발 가이드

이 문서는 Immersive Tarot AI 프로젝트의 개발 환경 설정과 개발 가이드를 제공합니다.

## 필수 요구사항

| 도구 | 버전 | 용도 |
|------|------|------|
| Node.js | 18+ | Frontend 빌드 |
| Rust | 1.70+ | Backend 컴파일 |
| SQLite | 3.35+ | 데이터베이스 |

## 환경 설정

### 1. 저장소 클론

```bash
git clone <repository-url>
cd immersive-tarot-ai
```

### 2. Backend 설정

```bash
cd backend

# 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 DEEPSEEK_API_KEY 설정

# 의존성 확인 및 빌드
cargo build

# 개발 서버 실행
cargo run
```

### 3. Frontend 설정

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 4. 전체 스택 실행 확인

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Health Check: http://localhost:3000/health

---

## 환경 변수

### Backend (.env)

```env
# 데이터베이스 URL
DATABASE_URL=sqlite:tarot.db

# DeepSeek API 키 (필수)
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx

# 로깅 레벨
RUST_LOG=backend=debug,tower_http=debug
```

### .env.example 템플릿

```env
DATABASE_URL=sqlite:tarot.db
DEEPSEEK_API_KEY=
RUST_LOG=backend=info
```

---

## 개발 명령어

### Backend

```bash
# 개발 실행 (자동 재시작은 cargo-watch 필요)
cargo run

# 타입 체크
cargo check

# 테스트 실행
cargo test

# 포맷팅
cargo fmt

# 린트
cargo clippy

# 릴리즈 빌드
cargo build --release
```

### Frontend

```bash
# 개발 서버
npm run dev

# 타입 체크
npm run check

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview
```

### E2E 테스트

```bash
# 프로젝트 루트에서
npx playwright test

# UI 모드로 테스트
npx playwright test --ui

# 특정 테스트 파일
npx playwright test tests/tarot.spec.ts

# 리포트 확인
npx playwright show-report
```

---

## 프로젝트 구조

```
immersive-tarot-ai/
├── frontend/
│   ├── src/
│   │   ├── components/          # Svelte 컴포넌트
│   │   │   ├── App.svelte       # 최상위 앱
│   │   │   ├── Scene.svelte     # 3D 씬 루트
│   │   │   ├── CardDeck.svelte  # 카드 렌더링
│   │   │   ├── Hand.svelte      # 3D 손 커서
│   │   │   ├── Table.svelte     # 테이블 메시
│   │   │   └── UI.svelte        # HTML 오버레이
│   │   ├── lib/                 # 유틸리티 모듈
│   │   │   ├── websocket.ts     # WS 클라이언트
│   │   │   ├── cardTextures.ts  # 텍스처 생성
│   │   │   └── shuffleController.ts
│   │   ├── stores.ts            # Svelte 스토어
│   │   └── main.ts              # 엔트리포인트
│   ├── public/
│   │   └── tarot_data.json      # 카드 데이터
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── main.rs              # 서버 엔트리
│   │   ├── handlers.rs          # REST 핸들러
│   │   ├── ws_handler.rs        # WS 핸들러
│   │   ├── ai_service.rs        # AI 연동
│   │   ├── tarot_engine.rs      # 카드 로직
│   │   ├── db.rs                # DB 연산
│   │   ├── models.rs            # 데이터 모델
│   │   └── state.rs             # 앱 상태
│   ├── migrations/              # DB 마이그레이션
│   ├── Cargo.toml
│   └── .env
│
├── docs/                        # 문서
├── tests/                       # E2E 테스트
└── docker-compose.yml
```

---

## 새 기능 개발 가이드

### 새 REST 엔드포인트 추가

1. `handlers.rs`에 핸들러 함수 추가
2. `main.rs`에서 라우터에 등록
3. 필요시 `models.rs`에 요청/응답 구조체 추가

```rust
// handlers.rs
pub async fn new_endpoint(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<NewRequest>,
) -> impl IntoResponse {
    // 구현
}

// main.rs
let app = Router::new()
    .route("/api/new", post(handlers::new_endpoint))
```

### 새 WebSocket 메시지 추가

1. `ws_handler.rs`에 `ClientMessage` enum에 variant 추가
2. `ServerMessage` enum에 응답 variant 추가
3. `handle_client_message`에서 처리 로직 구현

```rust
// ws_handler.rs
pub enum ClientMessage {
    // 기존...
    NewAction { data: String },
}

pub enum ServerMessage {
    // 기존...
    NewResponse { result: String },
}
```

### 새 3D 컴포넌트 추가

1. `src/components/`에 새 `.svelte` 파일 생성
2. `Scene.svelte`에서 import 및 사용

```svelte
<!-- NewComponent.svelte -->
<script lang="ts">
    import { T } from "@threlte/core";
</script>

<T.Mesh position={[0, 0, 0]}>
    <T.BoxGeometry args={[1, 1, 1]} />
    <T.MeshStandardMaterial color="red" />
</T.Mesh>
```

### 새 Svelte Store 추가

```typescript
// stores.ts
import { writable } from 'svelte/store';

export const newStore = writable<string>('initial');
```

---

## 디버깅

### Backend 로그

```bash
# 상세 로그
RUST_LOG=debug cargo run

# 특정 모듈만
RUST_LOG=backend::ai_service=debug cargo run
```

### Frontend 디버깅

- 브라우저 DevTools Console에서 로그 확인
- Svelte DevTools 브라우저 확장 설치 권장
- Three.js 씬 검사: `window.__THREE_DEVTOOLS__`

### WebSocket 디버깅

- DevTools Network 탭에서 WS 연결 확인
- Messages 탭에서 송수신 메시지 확인

---

## 테스트 작성

### E2E 테스트

```typescript
// tests/new-feature.spec.ts
import { test, expect } from '@playwright/test';

test.describe('New Feature', () => {
    test('should do something', async ({ page }) => {
        await page.goto('http://localhost:5173');
        // 테스트 로직
    });
});
```

### 테스트 실행

```bash
# 모든 테스트
npx playwright test

# 특정 브라우저
npx playwright test --project=chromium

# 디버그 모드
npx playwright test --debug
```

---

## Docker 개발

### 개발 환경

```bash
# 전체 스택 빌드 및 실행
docker-compose up --build

# 백그라운드 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 종료
docker-compose down
```

### 이미지 재빌드

```bash
# 특정 서비스만
docker-compose build backend
docker-compose build frontend
```

---

## 코드 스타일

### Rust

- `cargo fmt`로 포맷팅
- `cargo clippy`로 린트 검사
- snake_case 사용

### TypeScript/Svelte

- Prettier 설정 적용
- camelCase 사용 (컴포넌트는 PascalCase)
- 타입 명시 권장

---

## 트러블슈팅

### "DEEPSEEK_API_KEY not set"

`.env` 파일에 API 키가 설정되어 있는지 확인

### "WebSocket connection failed"

- Backend가 실행 중인지 확인
- 포트 3000이 사용 가능한지 확인
- CORS 설정 확인

### "Canvas not rendering"

- WebGL 지원 브라우저인지 확인
- 콘솔에서 Three.js 에러 확인

### "Database locked"

- 다른 프로세스가 DB를 사용 중인지 확인
- WAL 모드가 활성화되어 있는지 확인
