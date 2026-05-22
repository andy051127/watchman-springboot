# 플래너 타임테이블 그리드 설계

## 개요

플래너의 시간 계획 섹션을 기존 시간 슬롯 텍스트 입력 방식에서, 드래그 기반 정사각형 그리드 블록 방식으로 전면 교체한다.

## 요구사항

1. 사용자가 원하는 만큼 드래그하여 정확한 시간 범위를 지정할 수 있다.
2. 정사각형 그리드를 구현하고, 드래그로 시간 범위를 선택 후 색을 칠한다.
3. 그리드 가로: 12칸 (칸당 5분, 총 60분), 세로: 24행 (00:00~23:00).
4. 기존 hour_slot 방식을 제거하고 사용자가 지정한 시간 블록마다 텍스트를 입력한다.
5. DB에 시작시간, 끝시간, 색상, 텍스트를 영구 저장한다.

## 데이터베이스

새 테이블 `timetable_blocks` 추가. 기존 `timetable` 테이블은 유지.

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

- `start_time` / `end_time`: TIME 타입, 5분 단위 (00:00~23:55)
- `color`: hex 문자열 (예: `#fecaca`)
- `label`: 사용자 입력 텍스트, 빈 문자열 허용

## 백엔드 API

기존 `/api/planner/timetable` 엔드포인트는 유지. 새 엔드포인트 추가:

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/planner/blocks?date=YYYY-MM-DD` | 해당 날짜 블록 전체 조회 |
| POST | `/api/planner/blocks` | 블록 생성 |
| PUT | `/api/planner/blocks/{blockId}` | 블록 수정 |
| DELETE | `/api/planner/blocks/{blockId}` | 블록 삭제 |

**POST/PUT 요청 body:**
```json
{
  "blockDate": "2026-05-22",
  "startTime": "09:00",
  "endTime": "09:35",
  "color": "#bfdbfe",
  "label": "수학 공부"
}
```

**GET 응답:**
```json
[
  {
    "blockId": 1,
    "startTime": "09:00",
    "endTime": "09:35",
    "color": "#bfdbfe",
    "label": "수학 공부"
  }
]
```

**레이어 구성:**
- `TimetableBlock` 도메인 클래스
- `PlannerRepository` / `PlannerRepositoryImpl`: 블록 CRUD 메서드 추가
- `PlannerService` / `PlannerServiceImpl`: 블록 CRUD 비즈니스 로직 추가
- `PlannerController`: 4개 엔드포인트 추가

## 프론트엔드 UI

### 그리드 구조

- 가로: 12칸 × 세로: 24행 = 288개 셀
- 셀 크기: 12×12px 정사각형
- 왼쪽에 시간 레이블(00:00~23:00) 표시

### 드래그 인터랙션

1. `mousedown` → 드래그 시작 셀 기록
2. `mousemove` → 드래그 범위 하이라이트 (파란 오버레이)
3. `mouseup` → 팝업 모달 표시

### 팝업 모달 (드래그 후 신규 생성)

- 선택된 시간 범위 표시 (예: `09:00 ~ 09:35`)
- 색상 팔레트 (6가지 hex 색상)
- 텍스트 입력란 (label)
- 저장 / 취소 버튼

### 기존 블록 클릭 (수정/삭제)

- 같은 팝업이 열리고 기존 값이 채워짐
- 삭제 버튼 추가

### 블록 렌더링

- 서버에서 받은 블록들을 그리드 위에 절대 위치(absolute)로 오버레이
- `top`: 행(hour) × 셀높이 + 분(minute/5) × 셀높이 계산
- `height`: (end - start) / 5분 × 셀높이
- 블록 위에 label 텍스트 표시 (overflow hidden)

## 파일 변경 목록

| 파일 | 변경 |
|---|---|
| DB | `timetable_blocks` 테이블 추가 (DDL 실행) |
| `TimetableBlock.java` | 신규 도메인 클래스 |
| `PlannerRepository.java` | 블록 CRUD 인터페이스 메서드 추가 |
| `PlannerRepositoryImpl.java` | 블록 CRUD SQL 구현 추가 |
| `PlannerService.java` | 블록 CRUD 인터페이스 메서드 추가 |
| `PlannerServiceImpl.java` | 블록 CRUD 비즈니스 로직 추가 |
| `PlannerController.java` | 블록 4개 엔드포인트 추가 |
| `planner.js` | 그리드 렌더링, 드래그, 팝업, API 호출 |
| `planner.css` | 그리드 셀, 블록 오버레이, 팝업 스타일 |
| `planner.html` | timetable-grid div 유지 (JS로 채움) |
