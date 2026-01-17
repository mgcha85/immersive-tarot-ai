# 🔮 Immersive Tarot AI

3D 인터랙티브 타로 점술 서비스입니다. WebGL 기반의 몰입형 3D 환경에서 AI가 타로 카드를 해석해드립니다.

## ✨ 주요 기능

- **3D 손 커서**: 마우스를 따라다니는 3D 손이 카드를 가리키고 잡는 제스처를 표현
- **78장 타로 덱**: Rider-Waite-Smith 기반의 전체 타로 카드 (Major 22장 + Minor 56장)
- **물리 기반 셔플**: Rapier 물리 엔진을 활용한 리얼한 카드 셔플 애니메이션
- **AI 해석**: DeepSeek API를 통한 신비로운 타로 마스터 페르소나의 해석
- **실시간 통신**: WebSocket 기반 실시간 카드 선택 및 스트리밍 응답
- **Context-Aware 선택**: 사용자의 질문을 분석하여 관련 카드의 출현 확률 조정

## 🛠️ 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | Svelte 5, Threlte (Three.js), Rapier Physics, TypeScript |
| **Backend** | Rust, Axum, SQLx, Tokio |
| **Database** | SQLite (WAL mode, FTS5) |
| **AI** | DeepSeek API (OpenAI compatible) |

## 📁 프로젝트 구조

```
immersive-tarot-ai/
├── frontend/                 # Svelte 5 + Threlte 프론트엔드
│   ├── src/
│   │   ├── components/       # 3D 컴포넌트 (Scene, Hand, CardDeck, etc.)
│   │   ├── lib/              # 유틸리티 (WebSocket, 텍스처, 셔플)
│   │   └── stores.ts         # Svelte 스토어
│   └── public/               # 정적 파일
├── backend/                  # Rust + Axum 백엔드
│   ├── src/
│   │   ├── main.rs           # 엔트리포인트
│   │   ├── handlers.rs       # REST API 핸들러
│   │   ├── ws_handler.rs     # WebSocket 핸들러
│   │   ├── ai_service.rs     # DeepSeek API 연동
│   │   ├── tarot_engine.rs   # 카드 선택 로직
│   │   └── db.rs             # 데이터베이스 연산
│   └── migrations/           # SQL 마이그레이션
├── docs/                     # 문서
├── tests/                    # Playwright E2E 테스트
└── docker-compose.yml        # Docker 구성
```

## 🚀 빠른 시작

### 필수 요구사항

- Node.js 18+
- Rust 1.70+
- DeepSeek API Key

### 설치 및 실행

```bash
# 저장소 클론
git clone <repository-url>
cd immersive-tarot-ai

# Backend 설정
cd backend
echo "DEEPSEEK_API_KEY=your_api_key_here" >> .env
cargo run

# Frontend 설정 (새 터미널)
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

### Docker로 실행

```bash
docker-compose up --build
```

- Frontend: `http://localhost:8085`
- Backend: `http://localhost:3000`

## 📖 문서

| 문서 | 설명 |
|------|------|
| [API.md](./docs/API.md) | REST 및 WebSocket API 명세 |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 시스템 아키텍처 개요 |
| [DEVELOPMENT.md](./docs/DEVELOPMENT.md) | 개발 가이드 및 환경 설정 |
| [DATABASE.md](./docs/DATABASE.md) | 데이터베이스 스키마 및 쿼리 |
| [FRONTEND.md](./docs/FRONTEND.md) | 3D/UI 컴포넌트 문서 |

## 🎮 사용 방법

1. **질문 입력**: 하단 입력창에 타로에게 물어볼 질문을 입력
2. **Ask 클릭**: 버튼을 클릭하거나 Enter 키로 질문 전송
3. **카드 확인**: AI가 선택한 3장의 카드와 방향(Upright/Reversed) 확인
4. **해석 읽기**: 스트리밍으로 표시되는 타로 마스터의 해석 확인
5. **새 리딩**: "New Reading" 버튼으로 덱을 셔플하고 새로운 질문 시작

## 🔧 환경 변수

### Backend (.env)

```env
DATABASE_URL=sqlite:tarot.db
DEEPSEEK_API_KEY=your_api_key_here
RUST_LOG=backend=debug,tower_http=debug
```

## 📜 라이선스

ISC License

## 🙏 크레딧

- 타로 카드 의미: Rider-Waite-Smith 전통 해석 기반
- 물리 엔진: [Rapier](https://rapier.rs/)
- 3D 렌더링: [Three.js](https://threejs.org/) via [Threlte](https://threlte.xyz/)
