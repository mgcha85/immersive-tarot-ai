# 프론트엔드 컴포넌트 문서

이 문서는 Immersive Tarot AI의 3D 및 UI 컴포넌트를 설명합니다.

## 기술 스택

| 기술 | 버전 | 용도 |
|------|------|------|
| Svelte | 5.x | UI 프레임워크 |
| Threlte | 8.x | Three.js Svelte 래퍼 |
| Three.js | 0.182 | 3D 렌더링 |
| Rapier | 0.19 | 물리 엔진 |
| Tailwind CSS | 3.4 | 스타일링 |

---

## 컴포넌트 계층

```
App.svelte
├── Canvas (Threlte)
│   └── Scene.svelte
│       ├── World (Rapier Physics)
│       │   ├── Environment
│       │   ├── Camera + OrbitControls
│       │   ├── Lights
│       │   ├── Table.svelte
│       │   ├── CardDeck.svelte
│       │   └── Hand.svelte
└── UI.svelte (HTML Overlay)
```

---

## 3D 컴포넌트

### Scene.svelte

메인 3D 씬 컨테이너입니다.

**역할:**
- Rapier 물리 월드 초기화
- 카메라 및 조명 설정
- 환경맵 (HDRI) 적용
- 자식 컴포넌트 렌더링

**주요 설정:**

```svelte
<World>
    <Environment preset="city" />
    <T.PerspectiveCamera
        makeDefault
        position={[0, 10, 10]}
        fov={50}
    />
    <OrbitControls maxPolarAngle={1.5} />
</World>
```

---

### CardDeck.svelte

78장 타로 카드를 렌더링합니다.

**역할:**
- `tarot_data.json`에서 카드 데이터 로드
- 각 카드에 RigidBody 물리 적용
- Procedural 텍스처 생성 및 적용
- 호버/선택 인터랙션 처리

**주요 상태:**

```typescript
let deckData: TarotCard[] = $state([]);
let bodies: RigidBody[] = [];
let selectedCardId: string | null = $state(null);
let hoveredCardId: string | null = $state(null);
```

**카드 구조:**

```svelte
<RigidBody colliders="hull">
    <AutoColliders shape="cuboid">
        <T.Mesh>
            <T.BoxGeometry args={[1.4, 2.4, 0.02]} />
            <!-- 6면 Material: 앞면, 뒷면, 4개 모서리 -->
        </T.Mesh>
    </AutoColliders>
</RigidBody>
```

**텍스처:**
- 뒷면: 신비로운 보라색 + 금색 신성기하학 패턴
- 앞면: 카드 이름 + 슈트 아이콘 (Minor) 또는 별 (Major)

---

### Hand.svelte

마우스를 따라다니는 3D 손 커서입니다.

**역할:**
- 마우스 위치를 3D 공간으로 변환
- Raycasting으로 카드 호버 감지
- 손 포즈 애니메이션 (idle, pointing, grabbing)
- 카드 선택 이벤트 발생

**포즈 상태:**

| 상태 | 조건 | 손 모양 |
|------|------|---------|
| `idle` | 카드 위에 없음 | 손가락 살짝 굽힘 |
| `pointing` | 카드 호버 | 검지만 펴고 나머지 굽힘 |
| `grabbing` | 마우스 클릭 | 모든 손가락 강하게 굽힘 |

**Raycasting:**

```typescript
raycaster.setFromCamera(mouse, $camera);
const interacts = raycaster.intersectObjects(scene.children, true);
const cardHit = interacts.find(hit => hit.object.userData.isCard);
```

**손 구조:**
- BoxGeometry로 손바닥
- CylinderGeometry + BoxGeometry로 손가락 5개
- 각 손가락 관절에 회전 그룹 적용

---

### Table.svelte

테이블 메시 및 충돌체입니다.

```svelte
<AutoColliders shape="cuboid">
    <T.Mesh receiveShadow position={[0, -0.5, 0]}>
        <T.BoxGeometry args={[10, 1, 6]} />
        <T.MeshStandardMaterial color="#3E2723" roughness={0.8} />
    </T.Mesh>
</AutoColliders>
```

---

## 유틸리티 모듈

### cardTextures.ts

Canvas API로 Procedural 텍스처를 생성합니다.

**함수:**

| 함수 | 설명 |
|------|------|
| `createCardBackTexture()` | 신비로운 카드 뒷면 텍스처 |
| `createCardFrontTexture(card)` | 카드별 앞면 텍스처 |

**카드 뒷면 요소:**
- 방사형 그라디언트 배경 (보라색)
- 이중 금색 테두리
- 중앙 만다라 패턴 (원 + 다이아몬드 + 헥사그램)
- 방사형 광선
- 노이즈 오버레이

**카드 앞면 요소:**
- Major: 어두운 배경, 금색 테두리, 별 심볼
- Minor: 파치먼트 배경, 슈트별 컬러 아이콘
  - Wands: 빨강 (불)
  - Cups: 파랑 (물)
  - Swords: 회색 (공기)
  - Pentacles: 초록 (땅)

---

### shuffleController.ts

물리 기반 셔플 애니메이션을 제어합니다.

**셔플 타입:**

| 타입 | 설명 |
|------|------|
| `Scatter` | 카드를 폭발시킨 후 중앙으로 자력 수집 |
| `Riffle` | 덱을 반으로 나눠 인터리브 |
| `Overhand` | 위에서 청크 단위로 떨어뜨림 |

**사용법:**

```typescript
import { performShuffle, ShuffleType } from '$lib/shuffleController';

await performShuffle(bodies, ShuffleType.Scatter);
```

**애니메이션 순서:**
1. 모든 카드를 Dynamic 모드로 전환
2. 선택한 셔플 타입 실행
3. `stackNeatly()`로 정돈된 스택 생성
4. 카드를 Sleep 상태로 전환

---

### websocket.ts

WebSocket 클라이언트 클래스입니다.

**기능:**
- 자동 재연결 (exponential backoff)
- 메시지 큐잉 (연결 끊김 시)
- Keep-alive ping (30초 간격)

**사용법:**

```typescript
import { createWebSocketClient } from '$lib/websocket';

const ws = createWebSocketClient({
    onOpen: () => console.log('Connected'),
    onMessage: (msg) => handleServerMessage(msg),
});

ws.connect();
ws.startSession('나의 연애운은?');
ws.selectCard(15);
ws.requestInterpretation();
ws.shuffle();
ws.disconnect();
```

---

## UI 컴포넌트

### UI.svelte

HTML 오버레이 인터페이스입니다.

**영역:**

| 영역 | 기능 |
|------|------|
| 헤더 | 타이틀, 연결 상태 표시, 모드 토글 |
| 입력 | 질문 입력, Ask 버튼 |
| 에러 | WebSocket 에러 표시 |
| 결과 | 선택된 카드 목록 |
| 해석 | 스트리밍 AI 해석 |
| 새 리딩 | 덱 셔플 및 리셋 버튼 |

**연결 상태 표시:**

```svelte
<span class="w-2 h-2 rounded-full {$wsConnected ? 'bg-green-400' : 'bg-red-400'}"></span>
<span>{$wsConnected ? "Live" : "Offline"}</span>
```

---

## Svelte Stores

### stores.ts

```typescript
// 카드 관련
export const drawnCards = writable<DrawnCard[]>([]);
export const isDrawing = writable(false);

// WebSocket 관련
export const wsConnected = writable(false);
export const sessionId = writable<string | null>(null);
export const interpretation = writable('');
export const isInterpreting = writable(false);
export const wsError = writable<string | null>(null);
export const cardPositions = writable<CardPosition[]>([]);

// Derived
export const hasActiveSession = derived(sessionId, $id => $id !== null);
```

### handleServerMessage()

서버 메시지를 처리하여 스토어를 업데이트합니다.

```typescript
export function handleServerMessage(message: ServerMessage): void {
    switch (message.type) {
        case 'session_started':
            sessionId.set(message.session_id);
            break;
        case 'interpretation_chunk':
            interpretation.update(text => text + message.text);
            break;
        // ... 기타 케이스
    }
}
```

---

## 스타일링

### Tailwind 사용

```svelte
<div class="bg-black/50 backdrop-blur-md p-4 rounded-lg text-white">
    <h1 class="text-xl font-bold">Immersive Tarot</h1>
</div>
```

### 글로벌 스타일 (app.css)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 성능 고려사항

| 항목 | 최적화 |
|------|--------|
| 카드 78장 렌더링 | 개별 RigidBody (Rapier 최적화됨) |
| 텍스처 | Procedural 생성, 캐싱 |
| 손 애니메이션 | Lerp/Slerp 보간 |
| Raycasting | 매 프레임, 최적화된 필터링 |
| WebSocket | 자동 재연결, 메시지 큐 |

---

## 트러블슈팅

### "Canvas not visible"

- Threlte Canvas가 올바르게 마운트되었는지 확인
- 부모 요소에 width/height 설정 확인

### "Cards falling through table"

- AutoColliders shape이 올바른지 확인
- RigidBody position이 테이블 위인지 확인

### "Hand not following mouse"

- camera store가 정상적으로 구독되는지 확인
- mouse 좌표가 정규화되었는지 확인 (-1 ~ 1)

### "Textures not loading"

- CanvasTexture가 올바르게 생성되었는지 확인
- material.map에 할당되었는지 확인
- texture.needsUpdate = true 호출 확인
