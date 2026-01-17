# 시스템 아키텍처

이 문서는 Immersive Tarot AI의 전체 시스템 아키텍처를 설명합니다.

## 개요

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              사용자 브라우저                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Frontend (Svelte 5 + Threlte)                 │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                   │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌─────────────────────┐   │   │
│  │  │   3D Scene    │  │   Card Deck   │  │     UI Overlay      │   │   │
│  │  │   (Threlte)   │  │   (Rapier)    │  │   (HTML/Tailwind)   │   │   │
│  │  └───────┬───────┘  └───────┬───────┘  └──────────┬──────────┘   │   │
│  │          │                  │                     │               │   │
│  │          └──────────────────┼─────────────────────┘               │   │
│  │                             │                                     │   │
│  │                    ┌────────┴────────┐                           │   │
│  │                    │   Svelte Stores │                           │   │
│  │                    └────────┬────────┘                           │   │
│  │                             │                                     │   │
│  │              ┌──────────────┴──────────────┐                     │   │
│  │              │     WebSocket Client        │                     │   │
│  │              │     (+ REST Fallback)       │                     │   │
│  │              └──────────────┬──────────────┘                     │   │
│  │                             │                                     │   │
│  └─────────────────────────────┼─────────────────────────────────────┘   │
│                                │                                         │
└────────────────────────────────┼─────────────────────────────────────────┘
                                 │
                    WebSocket / HTTP (JSON)
                                 │
┌────────────────────────────────┼─────────────────────────────────────────┐
│                                │                                         │
│  ┌─────────────────────────────┴─────────────────────────────────────┐   │
│  │                     Backend (Rust + Axum)                         │   │
│  ├───────────────────────────────────────────────────────────────────┤   │
│  │                                                                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐     │   │
│  │  │  WebSocket  │  │    REST     │  │    Tarot Engine         │     │   │
│  │  │   Handler   │  │   Handler   │  │  (Context-Aware Draw)   │     │   │
│  │  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘     │   │
│  │         │                │                     │                   │   │
│  │         └────────────────┼─────────────────────┘                   │   │
│  │                          │                                         │   │
│  │              ┌───────────┴───────────┐                            │   │
│  │              │      AI Service       │                            │   │
│  │              │    (DeepSeek API)     │                            │   │
│  │              └───────────┬───────────┘                            │   │
│  │                          │                                         │   │
│  │              ┌───────────┴───────────┐                            │   │
│  │              │    Database Layer     │                            │   │
│  │              │      (SQLx/SQLite)    │                            │   │
│  │              └───────────────────────┘                            │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│                              Backend Server                             │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ HTTPS
                                 ▼
                    ┌─────────────────────────┐
                    │      DeepSeek API       │
                    │   (ai.deepseek.com)     │
                    └─────────────────────────┘
```

---

## 컴포넌트 상세

### Frontend

#### 3D 렌더링 레이어

| 컴포넌트 | 역할 |
|----------|------|
| `Scene.svelte` | 메인 3D 씬, 조명, 카메라, 물리 월드 설정 |
| `CardDeck.svelte` | 78장 타로 카드 렌더링, 물리 시뮬레이션 |
| `Hand.svelte` | 3D 손 커서, Raycasting 기반 카드 감지 |
| `Table.svelte` | 테이블 메시 및 충돌체 |

#### UI 레이어

| 컴포넌트 | 역할 |
|----------|------|
| `UI.svelte` | 채팅 인터페이스, 입력, 결과 표시 |
| `App.svelte` | 최상위 레이아웃, Canvas + Overlay 구성 |

#### 유틸리티

| 모듈 | 역할 |
|------|------|
| `websocket.ts` | WebSocket 클라이언트, 재연결 로직 |
| `cardTextures.ts` | Procedural 카드 텍스처 생성 |
| `shuffleController.ts` | 3가지 셔플 애니메이션 |
| `stores.ts` | Svelte 반응형 스토어 |

---

### Backend

#### 요청 처리 레이어

| 모듈 | 역할 |
|------|------|
| `handlers.rs` | REST API 엔드포인트 (`/api/draw`) |
| `ws_handler.rs` | WebSocket 세션 관리, 실시간 메시지 처리 |

#### 비즈니스 로직 레이어

| 모듈 | 역할 |
|------|------|
| `tarot_engine.rs` | Context-Aware 카드 선택 알고리즘 |
| `ai_service.rs` | DeepSeek API 연동, 프롬프트 구성 |

#### 데이터 레이어

| 모듈 | 역할 |
|------|------|
| `db.rs` | SQLite 연결, CRUD 연산 |
| `models.rs` | 데이터 구조체 정의 |
| `state.rs` | 애플리케이션 공유 상태 |

---

## 데이터 흐름

### 1. 카드 드로우 (REST)

```
사용자 입력 → UI.svelte → fetch('/api/draw')
    → handlers.rs::draw_cards()
    → tarot_engine.rs::draw_with_context()
    → ai_service.rs::generate_interpretation()
    → db.rs::save_reading()
    → JSON 응답 → UI.svelte → 화면 표시
```

### 2. 실시간 세션 (WebSocket)

```
사용자 입력 → UI.svelte → WebSocket.send()
    → ws_handler.rs::handle_socket()
    → SessionState 업데이트
    → ServerMessage 전송
    → stores.ts::handleServerMessage()
    → UI 업데이트
```

### 3. AI 해석 스트리밍

```
RequestInterpretation 수신
    → ai_service.rs::generate_interpretation()
    → 문장 단위로 분할
    → InterpretationChunk × N 전송 (100ms 간격)
    → InterpretationComplete 전송
```

---

## Context-Aware 카드 선택

사용자의 질문을 분석하여 관련 카드의 선택 확률을 높입니다.

### 알고리즘

```
1. 질문에서 키워드 추출 (예: "사랑", "직장", "돈")
2. 각 카드의 situational_tags와 매칭
3. 매칭되는 카드에 가중치 부여 (기본 1.0 → 3.0)
4. 가중치 기반 랜덤 선택 (중복 없음)
5. 30% 확률로 역방향(Reversed) 설정
```

### 예시

| 질문 키워드 | 부스트되는 카드 |
|-------------|----------------|
| "사랑", "연애" | The Lovers, Ace of Cups, 2 of Cups |
| "직장", "승진" | The Emperor, 8 of Pentacles, Chariot |
| "이별", "헤어짐" | 3 of Swords, Tower, Death |

---

## 보안 고려사항

| 영역 | 조치 |
|------|------|
| API Key | 환경 변수로 관리, 클라이언트 노출 없음 |
| SQL Injection | SQLx 파라미터 바인딩 사용 |
| XSS | Svelte 자동 이스케이프 |
| CORS | 개발 환경에서만 permissive, 프로덕션은 제한 |

---

## 성능 최적화

### Frontend

- **Procedural Textures**: 외부 이미지 로드 없이 Canvas로 생성
- **Physics Pooling**: Rapier RigidBody 재사용
- **Lerp/Slerp**: 부드러운 애니메이션을 위한 보간

### Backend

- **Connection Pooling**: SQLx 연결 풀 (max 5)
- **WAL Mode**: SQLite 동시성 향상
- **Tokio Runtime**: 비동기 I/O 처리

---

## 확장 포인트

| 기능 | 확장 방법 |
|------|----------|
| 다른 AI 모델 | `ai_service.rs`에 새 프로바이더 추가 |
| 다른 DB | SQLx 드라이버 변경 (PostgreSQL, MySQL) |
| 사용자 인증 | Axum middleware로 JWT 추가 |
| 실제 카드 이미지 | `cardTextures.ts`에서 이미지 로더로 교체 |
| 다국어 지원 | i18n 라이브러리 적용 |
