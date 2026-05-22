# 플래너 타임테이블 그리드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 플래너의 시간 계획 섹션을 시간 슬롯 텍스트 입력 방식에서, 드래그 기반 12×24 정사각형 그리드 블록 방식으로 교체하고 DB에 영구 저장한다.

**Architecture:** 새 테이블 `timetable_blocks`를 추가하고, 기존 `PlannerRepository/Service/Controller`에 블록 CRUD 메서드를 추가한다. 프론트엔드는 `planner.js`의 시간표 관련 함수를 전면 교체하고 `planner.css`에 그리드/모달 스타일을 추가한다.

**Tech Stack:** Spring Boot 3.5 · Java 25 · Spring JDBC · MariaDB · Vanilla JS

---

## 파일 변경 목록

| 파일 | 변경 |
|---|---|
| MariaDB | `timetable_blocks` 테이블 DDL 실행 |
| `src/main/java/com/watchman/domain/TimetableBlock.java` | 신규 도메인 클래스 |
| `src/main/java/com/watchman/repository/PlannerRepository.java` | 블록 CRUD 인터페이스 메서드 추가 |
| `src/main/java/com/watchman/repository/PlannerRepositoryImpl.java` | 블록 CRUD SQL 구현 추가 |
| `src/main/java/com/watchman/service/PlannerService.java` | 블록 CRUD 인터페이스 메서드 추가 |
| `src/main/java/com/watchman/service/PlannerServiceImpl.java` | 블록 CRUD 비즈니스 로직 추가 |
| `src/main/java/com/watchman/controller/PlannerController.java` | 블록 4개 엔드포인트 추가 |
| `src/main/resources/static/js/planner.js` | 시간표 섹션 전면 교체 |
| `src/main/resources/static/css/planner.css` | 그리드·블록·모달 스타일 추가 |

---

### Task 1: DB 테이블 생성

**Files:**
- DB: `timetable_blocks` 테이블

- [ ] **Step 1: MariaDB에 테이블 생성**

MariaDB에 접속하여 아래 DDL을 실행한다.

```sql
CREATE TABLE timetable_blocks (
  block_id    BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT       NOT NULL,
  block_date  DATE         NOT NULL,
  start_time  TIME         NOT NULL,
  end_time    TIME         NOT NULL,
  color       VARCHAR(7)   NOT NULL DEFAULT '#bfdbfe',
  label       VARCHAR(200) NOT NULL DEFAULT '',
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
```

- [ ] **Step 2: 테이블 생성 확인**

```sql
DESCRIBE timetable_blocks;
```

Expected: block_id, user_id, block_date, start_time, end_time, color, label 컬럼이 모두 보임.

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "feat: timetable_blocks 테이블 생성 (DDL)"
```

---

### Task 2: 도메인 클래스 TimetableBlock 생성

**Files:**
- Create: `src/main/java/com/watchman/domain/TimetableBlock.java`

- [ ] **Step 1: 도메인 클래스 작성**

```java
package com.watchman.domain;

import java.time.LocalDate;
import java.time.LocalTime;

public class TimetableBlock {
    private Long blockId;
    private Long userId;
    private LocalDate blockDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String color;
    private String label;

    public TimetableBlock() {}

    public Long getBlockId() { return blockId; }
    public void setBlockId(Long blockId) { this.blockId = blockId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public LocalDate getBlockDate() { return blockDate; }
    public void setBlockDate(LocalDate blockDate) { this.blockDate = blockDate; }
    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }
    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
}
```

- [ ] **Step 2: 빌드 확인**

```bash
./mvnw compile -q
```

Expected: BUILD SUCCESS, 오류 없음.

- [ ] **Step 3: Commit**

```bash
git add src/main/java/com/watchman/domain/TimetableBlock.java
git commit -m "feat: TimetableBlock 도메인 클래스 추가"
```

---

### Task 3: Repository 인터페이스 및 구현체에 블록 CRUD 추가

**Files:**
- Modify: `src/main/java/com/watchman/repository/PlannerRepository.java`
- Modify: `src/main/java/com/watchman/repository/PlannerRepositoryImpl.java`

- [ ] **Step 1: PlannerRepository 인터페이스에 메서드 추가**

`PlannerRepository.java` 하단 `// ── Timetable` 섹션 아래에 다음을 추가한다.

```java
// ── TimetableBlock ─────────────────────────────────────────

// 특정 날짜의 블록 전체 조회 (start_time 오름차순)
List<TimetableBlock> findBlocksByDate(Long userId, LocalDate date);

// 블록 INSERT
void saveBlock(TimetableBlock block);

// 블록 UPDATE (color, label, start_time, end_time 수정)
void updateBlock(TimetableBlock block);

// 블록 DELETE
void deleteBlock(Long blockId);
```

import도 추가한다.

```java
import com.watchman.domain.TimetableBlock;
```

- [ ] **Step 2: PlannerRepositoryImpl에 SQL 구현 추가**

`PlannerRepositoryImpl.java` 하단에 다음을 추가한다.

```java
// ── TimetableBlock ─────────────────────────────────────────

@Override
public List<TimetableBlock> findBlocksByDate(Long userId, LocalDate date) {
    String sql = "SELECT block_id, user_id, block_date, start_time, end_time, color, label " +
                 "FROM timetable_blocks WHERE user_id = ? AND block_date = ? ORDER BY start_time ASC";
    return this.template.query(sql,
            BeanPropertyRowMapper.newInstance(TimetableBlock.class), userId, date);
}

@Override
public void saveBlock(TimetableBlock block) {
    String sql = "INSERT INTO timetable_blocks (user_id, block_date, start_time, end_time, color, label) " +
                 "VALUES (?, ?, ?, ?, ?, ?)";
    this.template.update(sql,
            block.getUserId(), block.getBlockDate(),
            block.getStartTime(), block.getEndTime(),
            block.getColor(), block.getLabel());
}

@Override
public void updateBlock(TimetableBlock block) {
    String sql = "UPDATE timetable_blocks SET start_time = ?, end_time = ?, color = ?, label = ? " +
                 "WHERE block_id = ? AND user_id = ?";
    this.template.update(sql,
            block.getStartTime(), block.getEndTime(),
            block.getColor(), block.getLabel(),
            block.getBlockId(), block.getUserId());
}

@Override
public void deleteBlock(Long blockId) {
    String sql = "DELETE FROM timetable_blocks WHERE block_id = ?";
    this.template.update(sql, blockId);
}
```

import도 추가한다.

```java
import com.watchman.domain.TimetableBlock;
```

- [ ] **Step 3: 빌드 확인**

```bash
./mvnw compile -q
```

Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

```bash
git add src/main/java/com/watchman/repository/PlannerRepository.java \
        src/main/java/com/watchman/repository/PlannerRepositoryImpl.java
git commit -m "feat: PlannerRepository에 TimetableBlock CRUD 추가"
```

---

### Task 4: Service 인터페이스 및 구현체에 블록 CRUD 추가

**Files:**
- Modify: `src/main/java/com/watchman/service/PlannerService.java`
- Modify: `src/main/java/com/watchman/service/PlannerServiceImpl.java`

- [ ] **Step 1: PlannerService 인터페이스에 메서드 추가**

`PlannerService.java` 하단에 다음을 추가한다.

```java
// ── TimetableBlock ─────────────────────────────────────────

// 특정 날짜의 블록 전체 조회
List<TimetableBlock> getBlocks(Long userId, LocalDate date);

// 블록 생성
void addBlock(TimetableBlock block);

// 블록 수정
void updateBlock(TimetableBlock block);

// 블록 삭제
void deleteBlock(Long blockId);
```

import도 추가한다.

```java
import com.watchman.domain.TimetableBlock;
```

- [ ] **Step 2: PlannerServiceImpl에 구현 추가**

`PlannerServiceImpl.java` 하단에 다음을 추가한다.

```java
// ── TimetableBlock ─────────────────────────────────────────

@Override
public List<TimetableBlock> getBlocks(Long userId, LocalDate date) {
    return this.plannerRepository.findBlocksByDate(userId, date);
}

@Override
public void addBlock(TimetableBlock block) {
    this.plannerRepository.saveBlock(block);
}

@Override
public void updateBlock(TimetableBlock block) {
    this.plannerRepository.updateBlock(block);
}

@Override
public void deleteBlock(Long blockId) {
    this.plannerRepository.deleteBlock(blockId);
}
```

import도 추가한다.

```java
import com.watchman.domain.TimetableBlock;
```

- [ ] **Step 3: 빌드 확인**

```bash
./mvnw compile -q
```

Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

```bash
git add src/main/java/com/watchman/service/PlannerService.java \
        src/main/java/com/watchman/service/PlannerServiceImpl.java
git commit -m "feat: PlannerService에 TimetableBlock CRUD 추가"
```

---

### Task 5: Controller에 블록 엔드포인트 추가

**Files:**
- Modify: `src/main/java/com/watchman/controller/PlannerController.java`

- [ ] **Step 1: PlannerController 하단에 블록 엔드포인트 4개 추가**

`PlannerController.java`의 마지막 `}` 바로 앞에 다음을 추가한다.

```java
    // ── TimetableBlock ──────────────────────────────────────────────

    // 특정 날짜의 블록 전체 조회
    // GET /api/planner/blocks?date=2026-05-22
    @GetMapping("/blocks")
    public ResponseEntity<?> getBlocks(
            @RequestParam String date,
            HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }
        List<TimetableBlock> blocks = this.plannerService.getBlocks(userId, LocalDate.parse(date));
        return ResponseEntity.ok(blocks);
    }

    // 블록 생성
    // POST /api/planner/blocks
    // body: { "blockDate": "2026-05-22", "startTime": "09:00", "endTime": "09:35", "color": "#bfdbfe", "label": "수학" }
    @PostMapping("/blocks")
    public ResponseEntity<?> addBlock(@RequestBody Map<String, String> body, HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }
        TimetableBlock block = new TimetableBlock();
        block.setUserId(userId);
        block.setBlockDate(LocalDate.parse(body.get("blockDate")));
        block.setStartTime(java.time.LocalTime.parse(body.get("startTime")));
        block.setEndTime(java.time.LocalTime.parse(body.get("endTime")));
        block.setColor(body.get("color"));
        block.setLabel(body.getOrDefault("label", ""));
        this.plannerService.addBlock(block);
        return ResponseEntity.ok(Map.of("message", "블록이 생성되었습니다."));
    }

    // 블록 수정
    // PUT /api/planner/blocks/{blockId}
    // body: { "blockDate": "2026-05-22", "startTime": "09:00", "endTime": "09:35", "color": "#bfdbfe", "label": "수학" }
    @PutMapping("/blocks/{blockId}")
    public ResponseEntity<?> updateBlock(
            @PathVariable Long blockId,
            @RequestBody Map<String, String> body,
            HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }
        TimetableBlock block = new TimetableBlock();
        block.setBlockId(blockId);
        block.setUserId(userId);
        block.setBlockDate(LocalDate.parse(body.get("blockDate")));
        block.setStartTime(java.time.LocalTime.parse(body.get("startTime")));
        block.setEndTime(java.time.LocalTime.parse(body.get("endTime")));
        block.setColor(body.get("color"));
        block.setLabel(body.getOrDefault("label", ""));
        this.plannerService.updateBlock(block);
        return ResponseEntity.ok(Map.of("message", "블록이 수정되었습니다."));
    }

    // 블록 삭제
    // DELETE /api/planner/blocks/{blockId}
    @DeleteMapping("/blocks/{blockId}")
    public ResponseEntity<?> deleteBlock(@PathVariable Long blockId, HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }
        this.plannerService.deleteBlock(blockId);
        return ResponseEntity.ok(Map.of("message", "블록이 삭제되었습니다."));
    }
```

import도 추가한다.

```java
import com.watchman.domain.TimetableBlock;
```

- [ ] **Step 2: 빌드 확인**

```bash
./mvnw compile -q
```

Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add src/main/java/com/watchman/controller/PlannerController.java
git commit -m "feat: PlannerController에 TimetableBlock CRUD 엔드포인트 추가"
```

---

### Task 6: planner.css에 그리드·블록·모달 스타일 추가

**Files:**
- Modify: `src/main/resources/static/css/planner.css`

- [ ] **Step 1: 기존 시간표 관련 CSS 제거 후 신규 스타일 추가**

`planner.css` 하단에서 `.timetable-row`, `.timetable-hour`, `.timetable-cell`, `.timetable-cell-input`, `.tt-palette`, `.tt-swatch` 관련 규칙을 모두 제거한다.

그 자리에 다음을 추가한다.

```css
/* ─── Timetable Grid ───────────────────────────────────── */
.timetable-grid-wrap {
  overflow-y: auto;
  max-height: 520px;
  position: relative;
  user-select: none;
}

.timetable-grid-inner {
  display: grid;
  /* 왼쪽 시간 레이블(40px) + 12칸 그리드 */
  grid-template-columns: 40px repeat(12, 12px);
  grid-template-rows: repeat(24, 12px);
  width: fit-content;
}

.tt-hour-label {
  grid-column: 1;
  font-size: 9px;
  color: var(--text-light);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 4px;
  white-space: nowrap;
}

.tt-cell {
  width: 12px;
  height: 12px;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  box-sizing: border-box;
  cursor: crosshair;
}
.tt-cell:nth-child(13n+2) { border-left: 1px solid var(--border); } /* 첫 번째 열 왼쪽 테두리 */

.tt-cell.drag-hover {
  background: rgba(96, 165, 250, 0.35);
}

/* 블록 오버레이 */
.tt-block-layer {
  position: absolute;
  top: 0;
  /* 시간 레이블(40px) 오른쪽에서 시작 */
  left: 40px;
  width: 144px; /* 12 * 12px */
  pointer-events: none;
}

.tt-block {
  position: absolute;
  border-radius: 3px;
  opacity: 0.85;
  overflow: hidden;
  font-size: 9px;
  font-weight: 600;
  color: #1e293b;
  padding: 1px 3px;
  box-sizing: border-box;
  cursor: pointer;
  pointer-events: all;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* ─── Block Modal ──────────────────────────────────────── */
.tt-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.tt-modal {
  background: var(--bg-white);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  width: 280px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
}

.tt-modal-time {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}

.tt-modal-palette {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tt-modal-swatch {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: border-color 0.15s;
}
.tt-modal-swatch.selected {
  border-color: #1e293b;
}

.tt-modal-input {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  font-size: 13px;
  width: 100%;
  box-sizing: border-box;
  outline: none;
}
.tt-modal-input:focus { border-color: var(--primary); }

.tt-modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.tt-modal-btn {
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  font-size: 13px;
  cursor: pointer;
  background: none;
}
.tt-modal-btn.primary {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}
.tt-modal-btn.danger {
  color: #ef4444;
  border-color: #ef4444;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/resources/static/css/planner.css
git commit -m "feat: 타임테이블 그리드·블록·모달 CSS 추가"
```

---

### Task 7: planner.js 시간표 섹션 전면 교체

**Files:**
- Modify: `src/main/resources/static/js/planner.js`

- [ ] **Step 1: 기존 시간표 전역 변수·상수 제거**

`planner.js`에서 아래 코드를 삭제한다.

```javascript
// timetable[dateStr] = { [hourSlot]: { id: timetableId|null, content } }
// id가 null이면 아직 서버에 저장되지 않은 슬롯 (POST 대상)
// id가 있으면 이미 저장된 슬롯 (PUT 대상)
let timetable = {};
```

그리고 삭제된 자리에 다음을 추가한다.

```javascript
// blocks[dateStr] = [{ blockId, startTime, endTime, color, label }]
let blocks = {};
```

- [ ] **Step 2: 기존 시간표 관련 함수 전체 제거**

`planner.js`에서 아래 함수들을 모두 삭제한다.

- `async function loadTimetable(date) { ... }`
- `const TT_COLORS = [...]`
- `let ttMode = 'edit';`
- `function renderTimetable() { ... }`
- `function setTtMode(mode) { ... }`
- `function handleTtRowClick(hour, event) { ... }`
- `function editTimetableCell(hour, cell) { ... }`

- [ ] **Step 3: selectDate 함수에서 loadTimetable 호출을 loadBlocks로 교체**

기존:
```javascript
  await Promise.all([
    loadTodos(dateStr),
    loadTimetable(dateStr)
  ]);
```

교체:
```javascript
  await Promise.all([
    loadTodos(dateStr),
    loadBlocks(dateStr)
  ]);
```

- [ ] **Step 4: renderNotebook에서 renderTimetable 호출을 renderBlockGrid로 교체**

기존:
```javascript
  renderMemo();
  renderTodoList();
  renderTimetable();
```

교체:
```javascript
  renderMemo();
  renderTodoList();
  renderBlockGrid();
```

- [ ] **Step 5: 새 시간표 함수들 추가**

`planner.js` 하단 `// ── 로그아웃 처리` 섹션 바로 위에 다음 코드 블록을 추가한다.

```javascript
// ── 타임테이블 블록 ───────────────────────────────────────────────────────────

const BLOCK_COLORS = ['#fecaca','#fed7aa','#fef08a','#bbf7d0','#bfdbfe','#e9d5ff'];
const CELL_SIZE    = 12; // px (정사각형 셀 한 변 길이)

// GET /api/planner/blocks?date=YYYY-MM-DD
async function loadBlocks(date) {
  try {
    const res = await fetch(`/watchman/api/planner/blocks?date=${date}`);
    if (res.status === 401) { window.location.href = 'login.html'; return; }
    const data = await res.json();
    // 서버 응답의 camelCase 필드를 클라이언트 캐시에 저장
    blocks[date] = data.map(b => ({
      blockId:   b.blockId,
      startTime: b.startTime, // "HH:MM:SS" or "HH:MM"
      endTime:   b.endTime,
      color:     b.color,
      label:     b.label
    }));
  } catch (err) {
    console.error('블록 로드 실패:', err);
    blocks[date] = [];
  }
}

// "HH:MM" 또는 "HH:MM:SS" → 분(0~1439) 변환
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// 분(0~1439) → "HH:MM" 변환
function minutesToTime(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

// 그리드 렌더링: 24행 × 12칸 정사각형 셀 + 블록 오버레이
function renderBlockGrid() {
  const container = document.getElementById('timetable-grid');
  const dayBlocks = blocks[selectedDate] || [];

  // 그리드 HTML 생성
  let gridHtml = '<div class="timetable-grid-wrap"><div class="timetable-grid-inner">';
  for (let h = 0; h < 24; h++) {
    gridHtml += `<div class="tt-hour-label">${String(h).padStart(2,'0')}:00</div>`;
    for (let m = 0; m < 12; m++) {
      // data-min: 이 셀이 나타내는 시각(분), 예: h=9, m=3 → 9*60+3*5=555분(09:15)
      gridHtml += `<div class="tt-cell" data-min="${h * 60 + m * 5}"></div>`;
    }
  }
  gridHtml += '</div>';

  // 블록 오버레이 레이어
  gridHtml += '<div class="tt-block-layer" id="tt-block-layer">';
  dayBlocks.forEach(b => {
    const startMin = timeToMinutes(b.startTime);
    const endMin   = timeToMinutes(b.endTime);
    const topPx    = Math.floor(startMin / 5) * CELL_SIZE;  // 행 높이
    const heightPx = Math.max(CELL_SIZE, Math.floor((endMin - startMin) / 5) * CELL_SIZE);
    gridHtml += `
      <div class="tt-block"
           style="background:${b.color};top:${topPx}px;left:0;width:144px;height:${heightPx}px"
           data-block-id="${b.blockId}"
           onclick="openBlockModal(${b.blockId})"
      >${escHtml(b.label)}</div>`;
  });
  gridHtml += '</div></div>';

  container.innerHTML = gridHtml;

  // 드래그 이벤트 연결
  initGridDrag();
}

// ── 드래그로 블록 범위 선택 ───────────────────────────────────────────────────

let dragStartMin = null;
let dragEndMin   = null;

function initGridDrag() {
  const wrap = document.querySelector('.timetable-grid-wrap');
  if (!wrap) return;

  wrap.addEventListener('mousedown', e => {
    const cell = e.target.closest('.tt-cell');
    if (!cell) return;
    dragStartMin = parseInt(cell.dataset.min);
    dragEndMin   = dragStartMin;
    highlightDrag();
  });

  wrap.addEventListener('mousemove', e => {
    if (dragStartMin === null) return;
    const cell = e.target.closest('.tt-cell');
    if (!cell) return;
    dragEndMin = parseInt(cell.dataset.min);
    highlightDrag();
  });

  wrap.addEventListener('mouseup', e => {
    if (dragStartMin === null) return;
    const cell = e.target.closest('.tt-cell');
    if (cell) dragEndMin = parseInt(cell.dataset.min);

    const startMin = Math.min(dragStartMin, dragEndMin);
    const endMin   = Math.max(dragStartMin, dragEndMin) + 5; // 끝 셀은 +5분 포함

    dragStartMin = null;
    dragEndMin   = null;
    clearDragHighlight();

    openNewBlockModal(startMin, endMin);
  });

  // 그리드 영역 밖에서 mouseup 처리
  document.addEventListener('mouseup', () => {
    dragStartMin = null;
    dragEndMin   = null;
    clearDragHighlight();
  }, { once: false });
}

function highlightDrag() {
  const minA = Math.min(dragStartMin, dragEndMin);
  const minB = Math.max(dragStartMin, dragEndMin);
  document.querySelectorAll('.tt-cell').forEach(cell => {
    const m = parseInt(cell.dataset.min);
    cell.classList.toggle('drag-hover', m >= minA && m <= minB);
  });
}

function clearDragHighlight() {
  document.querySelectorAll('.tt-cell.drag-hover').forEach(c => c.classList.remove('drag-hover'));
}

// ── 블록 모달 ─────────────────────────────────────────────────────────────────

let modalBlockId   = null; // null이면 신규, 숫자면 수정
let modalStartMin  = null;
let modalEndMin    = null;
let modalColor     = BLOCK_COLORS[4]; // 기본 파란색

// 신규 블록 모달
function openNewBlockModal(startMin, endMin) {
  modalBlockId  = null;
  modalStartMin = startMin;
  modalEndMin   = endMin;
  modalColor    = BLOCK_COLORS[4];
  showModal('', modalColor);
}

// 기존 블록 수정 모달
function openBlockModal(blockId) {
  const b = (blocks[selectedDate] || []).find(x => x.blockId === blockId);
  if (!b) return;
  modalBlockId  = blockId;
  modalStartMin = timeToMinutes(b.startTime);
  modalEndMin   = timeToMinutes(b.endTime);
  modalColor    = b.color;
  showModal(b.label, b.color);
}

function showModal(labelValue, selectedColor) {
  // 기존 모달 제거
  const existing = document.getElementById('tt-modal-overlay');
  if (existing) existing.remove();

  const timeLabel = `${minutesToTime(modalStartMin)} ~ ${minutesToTime(modalEndMin)}`;

  const overlay = document.createElement('div');
  overlay.id        = 'tt-modal-overlay';
  overlay.className = 'tt-modal-overlay';

  const swatches = BLOCK_COLORS.map(c =>
    `<div class="tt-modal-swatch${c === selectedColor ? ' selected' : ''}"
          style="background:${c}"
          data-color="${c}"
          onclick="selectModalColor('${c}')"></div>`
  ).join('');

  const deleteBtn = modalBlockId !== null
    ? `<button class="tt-modal-btn danger" onclick="deleteBlock(${modalBlockId})">삭제</button>`
    : '';

  overlay.innerHTML = `
    <div class="tt-modal">
      <div class="tt-modal-time">${timeLabel}</div>
      <div class="tt-modal-palette">${swatches}</div>
      <input class="tt-modal-input" id="tt-modal-label" type="text"
             placeholder="일정 이름 (선택)" value="${escHtml(labelValue)}" />
      <div class="tt-modal-actions">
        ${deleteBtn}
        <button class="tt-modal-btn" onclick="closeModal()">취소</button>
        <button class="tt-modal-btn primary" onclick="saveModalBlock()">저장</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  document.getElementById('tt-modal-label').focus();
}

function selectModalColor(color) {
  modalColor = color;
  document.querySelectorAll('.tt-modal-swatch').forEach(el => {
    el.classList.toggle('selected', el.dataset.color === color);
  });
}

function closeModal() {
  const overlay = document.getElementById('tt-modal-overlay');
  if (overlay) overlay.remove();
}

async function saveModalBlock() {
  const label = document.getElementById('tt-modal-label').value.trim();
  const body  = {
    blockDate: selectedDate,
    startTime: minutesToTime(modalStartMin),
    endTime:   minutesToTime(modalEndMin),
    color:     modalColor,
    label:     label
  };

  try {
    if (modalBlockId === null) {
      // 신규 생성
      const res = await fetch('/watchman/api/planner/blocks', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body)
      });
      if (res.status === 401) { window.location.href = 'login.html'; return; }
    } else {
      // 기존 블록 수정
      const res = await fetch(`/watchman/api/planner/blocks/${modalBlockId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body)
      });
      if (res.status === 401) { window.location.href = 'login.html'; return; }
    }
    closeModal();
    await loadBlocks(selectedDate);
    renderBlockGrid();
  } catch (err) {
    console.error('블록 저장 실패:', err);
  }
}

async function deleteBlock(blockId) {
  try {
    const res = await fetch(`/watchman/api/planner/blocks/${blockId}`, { method: 'DELETE' });
    if (res.status === 401) { window.location.href = 'login.html'; return; }
    closeModal();
    await loadBlocks(selectedDate);
    renderBlockGrid();
  } catch (err) {
    console.error('블록 삭제 실패:', err);
  }
}
```

- [ ] **Step 6: 앱 실행 후 동작 확인**

```bash
./mvnw spring-boot:run
```

브라우저에서 `http://localhost:8080/watchman/planner.html` 접속 후:
1. 날짜 클릭 → 노트북 뷰 열림
2. 타임 테이블 섹션에 12×24 정사각형 그리드가 보임
3. 그리드 드래그 → 파란 하이라이트 표시됨
4. 드래그 완료 → 모달 팝업 (시간 범위, 색상 팔레트, 텍스트 입력)
5. 저장 → 블록이 그리드 위에 오버레이로 표시됨
6. 블록 클릭 → 수정/삭제 모달 열림

- [ ] **Step 7: Commit**

```bash
git add src/main/resources/static/js/planner.js
git commit -m "feat: 타임테이블 드래그 블록 그리드 구현"
```

---

### Task 8: planner.html timetable-grid div 확인

**Files:**
- Modify: `src/main/resources/static/planner.html`

- [ ] **Step 1: HTML 확인**

`planner.html`에서 `id="timetable-grid"` div가 존재하는지 확인한다. 이미 있으면 변경 불필요.

```html
<!-- 타임 테이블 -->
<div class="notebook-timetable">
  <div class="notebook-section-title">타임 테이블</div>
  <div class="timetable-grid" id="timetable-grid"></div>
</div>
```

- [ ] **Step 2: 최종 빌드 및 실행 확인**

```bash
./mvnw clean package -q
```

Expected: BUILD SUCCESS.

- [ ] **Step 3: Final Commit**

```bash
git add src/main/resources/static/planner.html
git commit -m "feat: 플래너 타임테이블 그리드 전체 구현 완료"
```
