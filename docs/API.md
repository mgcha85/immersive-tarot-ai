# API 명세서

이 문서는 Immersive Tarot AI의 REST API 및 WebSocket API를 설명합니다.

## 기본 정보

| 항목 | 값 |
|------|-----|
| Base URL | `http://localhost:3000` |
| WebSocket | `ws://localhost:3000/ws` |
| Content-Type | `application/json` |

---

## REST API

### 헬스 체크

서버 상태를 확인합니다.

```http
GET /health
```

**응답**

```
200 OK
Body: "OK"
```

---

### 카드 드로우

질문에 대해 타로 카드를 뽑고 해석을 받습니다.

```http
POST /api/draw
Content-Type: application/json
```

**요청 본문**

```json
{
  "user_query": "오늘 나의 운세는 어떨까요?",
  "count": 3
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `user_query` | string | 사용자의 질문 |
| `count` | number | 뽑을 카드 수 (1-10) |

**응답**

```json
{
  "cards": [
    {
      "card": {
        "id": "major_0",
        "name": "The Fool",
        "arcana": "major",
        "suit": null,
        "number": 0,
        "archetype": "The Innocent",
        "keywords": {
          "upright": ["새로운 시작", "순수", "모험"],
          "reversed": ["무모함", "위험 무시", "어리석음"]
        },
        "situational_tags": ["start", "adventure", "risk"]
      },
      "is_reversed": false,
      "position_index": 0
    }
  ],
  "interpretation_prompt": "The cards have spoken..."
}
```

---

## WebSocket API

실시간 타로 세션을 위한 양방향 통신 API입니다.

### 연결

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');
```

### 메시지 형식

모든 메시지는 JSON 형식이며 `type` 필드로 구분됩니다.

---

## 클라이언트 → 서버 메시지

### StartSession

새 타로 세션을 시작합니다.

```json
{
  "type": "start_session",
  "query": "나의 연애운은 어떨까요?"
}
```

### SelectCard

카드를 선택합니다.

```json
{
  "type": "select_card",
  "card_index": 15
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `card_index` | number | 카드 인덱스 (0-77) |

### RequestInterpretation

선택된 카드에 대한 AI 해석을 요청합니다.

```json
{
  "type": "request_interpretation"
}
```

### Shuffle

덱을 셔플합니다.

```json
{
  "type": "shuffle"
}
```

### Ping

연결 유지를 위한 핑입니다.

```json
{
  "type": "ping"
}
```

---

## 서버 → 클라이언트 메시지

### SessionStarted

세션이 시작되었습니다.

```json
{
  "type": "session_started",
  "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### DeckState

현재 덱의 카드 위치 정보입니다.

```json
{
  "type": "deck_state",
  "card_positions": [
    {
      "card_id": "major_0",
      "x": 0.0,
      "y": 0.0,
      "rotation": 0.0,
      "is_face_up": false,
      "z_index": 0
    }
  ]
}
```

### CardSelected

카드가 선택되었습니다.

```json
{
  "type": "card_selected",
  "card_id": "major_6",
  "is_reversed": true
}
```

### InterpretationChunk

AI 해석의 일부입니다 (스트리밍).

```json
{
  "type": "interpretation_chunk",
  "text": "The Lovers reversed suggests..."
}
```

### InterpretationComplete

AI 해석이 완료되었습니다.

```json
{
  "type": "interpretation_complete"
}
```

### ShuffleAnimation

셔플 애니메이션 시퀀스입니다.

```json
{
  "type": "shuffle_animation",
  "sequence": [
    {
      "card_id": "major_0",
      "from": { "x": 0, "y": 0, "rotation": 0 },
      "to": { "x": 100, "y": 50, "rotation": 15 },
      "duration_ms": 300
    }
  ]
}
```

### Error

오류가 발생했습니다.

```json
{
  "type": "error",
  "message": "No cards selected"
}
```

### Pong

Ping에 대한 응답입니다.

```json
{
  "type": "pong"
}
```

---

## 에러 코드

| 상황 | 메시지 |
|------|--------|
| 카드 인덱스 범위 초과 | `Invalid card index: {n}` |
| 이미 선택된 카드 | `Card already selected` |
| 세션 없이 해석 요청 | `No session started - please start a session first` |
| 카드 선택 없이 해석 요청 | `No cards selected` |

---

## 사용 예시

### JavaScript 클라이언트

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'start_session',
    query: '내일 면접 결과는 어떨까요?'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'session_started':
      console.log('Session ID:', message.session_id);
      break;
    case 'interpretation_chunk':
      document.body.innerText += message.text;
      break;
    case 'interpretation_complete':
      console.log('해석 완료');
      break;
  }
};
```

### cURL (REST)

```bash
curl -X POST http://localhost:3000/api/draw \
  -H "Content-Type: application/json" \
  -d '{"user_query": "오늘의 운세", "count": 3}'
```

---

## 타입 정의

### Card

```typescript
interface Card {
  id: string;
  name: string;
  arcana: 'major' | 'minor';
  suit: 'wands' | 'cups' | 'swords' | 'pentacles' | null;
  number: number;
  archetype: string;
  keywords: {
    upright: string[];
    reversed: string[];
  };
  situational_tags: string[];
}
```

### DrawnCard

```typescript
interface DrawnCard {
  card: Card;
  is_reversed: boolean;
  position_index: number;
}
```

### CardPosition

```typescript
interface CardPosition {
  card_id: string;
  x: number;
  y: number;
  rotation: number;
  is_face_up: boolean;
  z_index: number;
}
```
