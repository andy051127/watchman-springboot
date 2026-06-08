# 그룹 스터디 기능 설계

**작성일:** 2026-06-08
**상태:** 승인됨

---

## 개요

Watchman에 실시간 그룹 스터디 기능을 추가한다. 사용자들이 그룹을 만들어 함께 공부하고, 서로의 카메라와 집중 상태를 실시간으로 공유하며, 채팅으로 소통할 수 있다.

---

## 페이지 구조

| 파일 | 역할 |
|------|------|
| `study-group.html` | 그룹 목록 / 만들기 / 코드 참가 (기존 파일 — 상세 패널 제거, 카드 클릭 시 `study-group-info.html?groupId=xxx`로 이동) |
| `study-group-info.html` | 그룹 상세 정보 + 멤버 집중 랭킹 + "스터디룸 들어가기" 버튼 / 강퇴·폐쇄(방장) |
| `study-group-session.html` | 실시간 화상 + 채팅 + 집중 상태 공유 (자동 그리드 + 우측 패널) |

**페이지 이동 흐름:**
`study-group.html` → `study-group-info.html?groupId=xxx` → `study-group-session.html?groupId=xxx`

---

## 세션 페이지 레이아웃

- **좌측:** 참가자 카메라 그리드 (자동 계산, 인원 제한 없음)
  - 1명: 1×1, 2명: 1×2, 3~4명: 2×2, 5~6명: 2×3, 7~9명: 3×3 …
  - 각 타일에 닉네임 + 집중/딴짓 상태 배지 표시
- **우측 패널:** 내 실시간 집중 통계 + 채팅 (메시지에 프로필 아바타·닉네임 표시)

---

## DB 스키마

기존 테이블 재사용 (schema.sql에 이미 존재):

```sql
CREATE TABLE IF NOT EXISTS study_groups (
    group_id    BIGINT       NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(500) DEFAULT NULL,
    invite_code VARCHAR(10)  NOT NULL UNIQUE,
    leader_id   BIGINT       NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id),
    FOREIGN KEY (leader_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS group_members (
    group_id BIGINT NOT NULL,
    user_id  BIGINT NOT NULL,
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES study_groups(group_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES users(user_id) ON DELETE CASCADE
);
```

---

## 백엔드 계층 (신규 파일)

구현 순서: DB → Domain → Repository → Service → Controller

### Domain

- `StudyGroup` — group_id, name, description, inviteCode, leaderId, createdAt, members(List)
- `StudyGroupMember` — userId, nickname, avatar, isLeader, totalTime, focusRate

### Repository

- `StudyGroupRepository` (interface)
- `StudyGroupRepositoryImpl` (JdbcTemplate)

주요 쿼리:
- `findGroupsByUserId(Long userId)` — 내 그룹 목록 + 멤버 정보 조회
- `findGroupById(Long groupId)` — 그룹 상세 + 멤버 정보
- `saveGroup(StudyGroup group)` — INSERT + 생성한 group_id 반환
- `addMember(Long groupId, Long userId)` — group_members INSERT
- `removeMember(Long groupId, Long userId)` — group_members DELETE
- `deleteGroup(Long groupId)` — study_groups DELETE (CASCADE로 멤버 자동 삭제)
- `findByInviteCode(String code)` — 초대코드 조회
- `existsMember(Long groupId, Long userId)` — 중복 참가 체크

### Service

- `StudyGroupService` (interface)
- `StudyGroupServiceImpl`

주요 메서드:
- `getMyGroups(Long userId)` — 내 그룹 목록
- `getGroup(Long groupId, Long userId)` — 그룹 상세 (멤버 아닌 경우 예외)
- `createGroup(String name, String description, Long leaderId)` — 생성 + 초대코드 발급(6자 랜덤 영숫자) + 본인 자동 가입
- `joinGroup(String inviteCode, Long userId)` — 코드로 참가 (중복·존재 여부 검증)
- `leaveGroup(Long groupId, Long userId)` — 나가기 (방장이면 폐쇄)
- `kickMember(Long groupId, Long leaderId, Long targetUserId)` — 강퇴 (권한 검증)
- `disbandGroup(Long groupId, Long leaderId)` — 폐쇄 (권한 검증)

### Controller

`StudyGroupController` — `@RequestMapping("/api/groups")`

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/groups` | 내 그룹 목록 |
| GET | `/api/groups/{groupId}` | 그룹 상세 + 멤버 |
| POST | `/api/groups` | 그룹 생성 |
| POST | `/api/groups/join` | 초대코드로 참가 |
| DELETE | `/api/groups/{groupId}` | 그룹 폐쇄 (방장) |
| DELETE | `/api/groups/{groupId}/members/me` | 그룹 나가기 |
| DELETE | `/api/groups/{groupId}/members/{userId}` | 멤버 강퇴 (방장) |

---

## WebSocket (STOMP)

Spring `spring-boot-starter-websocket` 사용. `WebSocketConfig`에서 STOMP 엔드포인트 설정.

- **엔드포인트:** `/ws` (SockJS 폴백 포함)
- **App prefix:** `/app`
- **Broker prefix:** `/topic`

### 채널

| Topic | 용도 | Payload |
|-------|------|---------|
| `/topic/room/{groupId}/presence` | 입장 / 퇴장 알림 | `{userId, nickname, avatar, action: "join"/"leave"}` |
| `/topic/room/{groupId}/focus` | 집중/딴짓 상태 브로드캐스트 | `{userId, focused: true/false}` |
| `/topic/room/{groupId}/chat` | 채팅 메시지 | `{userId, nickname, avatar, message, timestamp}` |
| `/topic/room/{groupId}/signal` | WebRTC 시그널링 | `{from, to, type: "offer"/"answer"/"ice", data}` |

`StudyRoomController` — `@MessageMapping` 으로 `/app/room/{groupId}/*` 수신 후 브로드캐스트.

---

## WebRTC 시그널링 흐름

1. A가 룸 입장 → `/topic/room/{id}/presence` 브로드캐스트
2. 기존 참가자 B가 A에게 SDP offer 전송 (`signal` 채널, `to: A.userId`)
3. A가 B에게 SDP answer 응답
4. 양측 ICE candidate 교환
5. P2P 영상 스트림 연결 완료 — 이후 서버 경유 없음
6. STUN 서버: `stun:stun.l.google.com:19302` (무료)

---

## 집중 상태 공유

- 기존 `study-session.js`의 `applyFocusState(focused)` 로직을 그룹 세션에서도 동일하게 사용
- 상태 변경 시 WebSocket `/app/room/{groupId}/focus` 로 전송
- 수신 시 해당 참가자 타일 UI 업데이트 (집중 🟢 / 딴짓 🔴)

---

## 세션 저장

그룹 스터디룸 퇴장(또는 방 종료) 시, 개인 집중 데이터를 기존 `sessions` 테이블에 저장.
솔로 세션과 동일한 방식 — `POST /api/sessions { focusedTime, distractedTime }`.

---

## 프론트엔드 파일 목록

| 파일 | 상태 |
|------|------|
| `study-group.html` | 기존 — 패널-detail 제거, 카드 클릭 시 페이지 이동으로 변경 |
| `study-group.js` | 기존 — openDetail() → 페이지 이동으로 변경, 나머지 CRUD 그대로 |
| `study-group-info.html` | 신규 |
| `study-group-info.js` | 신규 |
| `study-group-session.html` | 신규 |
| `study-group-session.js` | 신규 (WebRTC + STOMP + MediaPipe) |
| `css/study-group-session.css` | 신규 |
