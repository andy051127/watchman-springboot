# Watchman DB 테이블 기술서

MySQL 8.0 기반. 모든 테이블은 `InnoDB`, `utf8mb4` 문자셋.
schema.sql이 서버 시작 시 자동 실행되며 `IF NOT EXISTS` 조건으로 기존 데이터를 보호한다.

---

## 테이블 목록

| 테이블명 | 역할 |
|----------|------|
| `users` | 회원 계정 |
| `sessions` | 공부 세션 기록 |
| `todos` | 플래너 할 일 |
| `ddays` | 플래너 D-Day |
| `timetable_blocks` | 플래너 타임테이블 블록 |
| `contacts` | 문의하기 접수 및 답변 |
| `notices` | 공지사항 |
| `study_groups` | 스터디 그룹 |
| `group_members` | 그룹 멤버 매핑 |
| `achievements` | 업적 마스터 데이터 |
| `user_achievements` | 유저 획득 업적 |
| `user_stats` | 유저 활동 통계 |

---

## 1. users

회원 계정 정보를 저장하는 핵심 테이블. 다른 모든 유저 종속 테이블이 `user_id`를 외래키로 참조한다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `user_id` | BIGINT PK AUTO_INCREMENT | 유저 고유 식별자 |
| `email` | VARCHAR(255) UNIQUE NOT NULL | 로그인 ID. 중복 불가 |
| `password` | VARCHAR(255) NOT NULL | BCrypt 해시 저장 (plain-text 저장 금지) |
| `nickname` | VARCHAR(100) NOT NULL | 화면에 표시되는 이름 |
| `avatar` | MEDIUMTEXT NULL | 프로필 이미지 (Base64 Data URL 또는 URL). 없으면 NULL |
| `streak` | INT DEFAULT 0 | 연속 공부 일수 (일 단위) |
| `is_admin` | TINYINT(1) DEFAULT 0 | 관리자 여부. 0 = 일반, 1 = 관리자 |
| `created_at` | TIMESTAMP DEFAULT NOW | 가입 일시 |

**비고**
- 서버 시작 시 `admin@watchman.com` 계정을 `INSERT IGNORE`로 생성한다.
- 비밀번호는 `DataInitializer`가 기동 시 plain-text → BCrypt 마이그레이션을 수행한다.
- 유저 삭제 시 종속 데이터(`sessions`, `todos`, `ddays` 등)가 `ON DELETE CASCADE`로 함께 삭제된다.

---

## 2. sessions

사용자가 완료한 공부 세션 기록. 세션 종료 시 INSERT 또는 UPDATE된다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `session_id` | BIGINT PK AUTO_INCREMENT | 세션 고유 식별자 |
| `user_id` | BIGINT FK → users | 세션 소유 유저 |
| `name` | VARCHAR(100) DEFAULT '' | 세션 이름. 미입력 시 `YYYY-MM-DD 세션` 자동 지정 |
| `focused_time` | INT DEFAULT 0 | 집중 시간 (초 단위) |
| `distracted_time` | INT DEFAULT 0 | 딴짓 시간 (초 단위) |
| `focus_rate` | DOUBLE DEFAULT 0 | 집중률 (%). 서버에서 `focused / (focused + distracted) × 100`으로 계산 |
| `started_at` | DATETIME DEFAULT NOW | 세션 시작 일시 |
| `group_id` | BIGINT NULL | 그룹 스터디 세션인 경우 해당 그룹 ID. 솔로 세션은 NULL |

**비고**
- 세션 이어하기: `session_id`가 있으면 UPDATE, 없으면 INSERT.
- `group_id`가 NULL이 아닌 세션은 그룹 업적(`group_session_10`) 체크에 사용된다.
- 연속 출석(streak) 업적은 이 테이블의 `DATE(started_at)` 기준으로 계산한다.

---

## 3. todos

플래너의 날짜별 할 일 목록.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `todo_id` | BIGINT PK AUTO_INCREMENT | 할 일 고유 식별자 |
| `user_id` | BIGINT FK → users | 소유 유저 |
| `todo_date` | DATE NOT NULL | 해당 날짜 (달력 기준) |
| `content` | VARCHAR(500) NOT NULL | 할 일 내용 |
| `done` | TINYINT(1) DEFAULT 0 | 완료 여부. 0 = 미완료, 1 = 완료 |

**비고**
- `todo_date`별로 그룹핑하여 달력 미리보기에 표시된다.
- `done = 1`로 변경(PATCH) 시 업적 서비스(`todo_complete` 트리거)가 실행된다.
- `plan_perfect_day` 업적은 하루 할 일이 3개 이상이고 전부 완료인 날이 있는지 확인한다.

---

## 4. ddays

플래너의 D-Day 카운트다운 항목.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `dday_id` | BIGINT PK AUTO_INCREMENT | D-Day 고유 식별자 |
| `user_id` | BIGINT FK → users | 소유 유저 |
| `name` | VARCHAR(200) NOT NULL | D-Day 이벤트 이름 (예: 수능, 면접) |
| `dday_date` | DATE NOT NULL | 목표 날짜 |

**비고**
- 프론트에서 오늘 기준으로 `D-N / D-Day / D+N`을 계산해 표시한다 (서버 계산 없음).
- D-Day 첫 추가 시 `plan_dday_add` 업적이 해금된다.
- `egg_dday` 이스터에그: 오늘 날짜가 이 테이블의 `dday_date`와 일치할 때 공부 세션을 완료하면 해금.

---

## 5. timetable_blocks

플래너 타임테이블에서 드래그로 생성한 시간 블록.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `block_id` | BIGINT PK AUTO_INCREMENT | 블록 고유 식별자 |
| `user_id` | BIGINT FK → users | 소유 유저 |
| `block_date` | DATE NOT NULL | 해당 날짜 |
| `start_time` | TIME NOT NULL | 블록 시작 시각 |
| `end_time` | TIME NOT NULL | 블록 종료 시각 |
| `color` | VARCHAR(20) DEFAULT '#bfdbfe' | 블록 색상 (HEX) |
| `label` | VARCHAR(200) DEFAULT '' | 블록 이름 (예: 수학, 영어) |

**비고**
- 5분 단위 셀 그리드로 표현되며, 드래그 범위를 `start_time ~ end_time`으로 저장한다.
- 블록 10개 생성 시 `plan_block_10` 업적이 해금된다.

---

## 6. contacts

사용자가 제출한 문의하기 접수 및 관리자 답변.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `contact_id` | BIGINT PK AUTO_INCREMENT | 문의 고유 식별자 |
| `name` | VARCHAR(100) NOT NULL | 문의자 이름 |
| `email` | VARCHAR(200) NOT NULL | 문의자 이메일 (답변 확인용) |
| `type` | VARCHAR(50) NOT NULL | 문의 유형. `bug` / `feature` / `account` / `general` / `other` |
| `content` | TEXT NOT NULL | 문의 내용 |
| `status` | VARCHAR(20) DEFAULT 'pending' | 처리 상태. `pending` (미처리) / `answered` (답변완료) |
| `reply_content` | TEXT NULL | 관리자 답변 내용. 미답변 시 NULL |
| `replied_at` | DATETIME NULL | 답변 등록 일시. 미답변 시 NULL |
| `created_at` | DATETIME DEFAULT NOW | 문의 접수 일시 |

**비고**
- 비로그인 사용자도 문의 가능 (`POST /api/contact`는 인증 불필요).
- 관리자가 `POST /api/admin/contacts/{id}/reply`로 답변하면 `status = 'answered'`로 변경된다.
- 문의자는 이메일로 `GET /api/contact/my?email=...` 를 통해 본인 문의와 답변을 조회할 수 있다.

---

## 7. notices

관리자가 작성하는 공지사항.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `notice_id` | BIGINT PK AUTO_INCREMENT | 공지 고유 식별자 |
| `tag` | VARCHAR(20) DEFAULT '공지' | 분류 태그. `공지` / `이벤트` / `점검` / `업데이트` |
| `title` | VARCHAR(200) NOT NULL | 공지 제목 |
| `content` | TEXT NOT NULL | 공지 본문 |
| `pinned` | TINYINT(1) DEFAULT 0 | 상단 고정 여부. 1이면 목록 최상단에 표시 |
| `writer_nickname` | VARCHAR(100) DEFAULT '관리자' | 작성자 닉네임 |
| `created_at` | DATETIME DEFAULT NOW | 작성 일시 |

**비고**
- 관리자 페이지에서 작성/수정/삭제한다.
- `pinned = 1`인 공지는 일반 공지보다 먼저 표시된다.
- 유저 종속 테이블이 아니므로 외래키 없음.

---

## 8. study_groups

스터디 그룹 정보.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `group_id` | BIGINT PK AUTO_INCREMENT | 그룹 고유 식별자 |
| `name` | VARCHAR(100) NOT NULL | 그룹 이름 |
| `description` | VARCHAR(500) NULL | 그룹 소개. 없으면 NULL |
| `invite_code` | VARCHAR(10) UNIQUE NOT NULL | 6자리 영숫자 초대 코드. 랜덤 생성, 중복 불가 |
| `leader_id` | BIGINT FK → users | 방장 유저 ID |
| `created_at` | DATETIME DEFAULT NOW | 그룹 생성 일시 |

**비고**
- 방장이 탈퇴(유저 삭제)되면 그룹도 `ON DELETE CASCADE`로 삭제된다.
- 그룹 생성 시 `group_leader`, `group_join` 업적이 체크된다.

---

## 9. group_members

스터디 그룹과 소속 멤버의 N:M 매핑 테이블.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `group_id` | BIGINT FK → study_groups | 그룹 |
| `user_id` | BIGINT FK → users | 멤버 유저 |

**비고**
- `(group_id, user_id)` 복합 PK로 중복 참여를 방지한다.
- 그룹 폐쇄 또는 유저 탈퇴 시 `ON DELETE CASCADE`로 자동 삭제된다.
- 방장도 멤버로 등록된다 (그룹 생성 시 자동 INSERT).

---

## 10. achievements

업적 마스터 테이블. 30개 업적 정의를 저장한다. 서버 기동 시 `DataInitializer`가 `INSERT IGNORE`로 자동 삽입한다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `achievement_id` | VARCHAR(50) PK | 업적 고유 코드. 예: `study_first`, `egg_dawn` |
| `name` | VARCHAR(100) NOT NULL | 업적 이름. 예: 첫 걸음, 전설 |
| `description` | VARCHAR(255) NOT NULL | 업적 달성 조건 설명 |
| `category` | VARCHAR(50) NOT NULL | 분류. `study` / `focus` / `streak` / `group` / `planner` / `easter` |
| `icon` | VARCHAR(10) NOT NULL | 이모지 아이콘 |
| `hidden` | TINYINT(1) DEFAULT 0 | 이스터에그 여부. 1이면 미달성 시 `???`로 표시 |

**비고**
- 코드로 식별하므로 `achievement_id`는 자연키(문자열)를 사용한다.
- `category = 'easter'`인 5개 업적은 `hidden = 1`로, 달성 전까지 조건이 공개되지 않는다.

---

## 11. user_achievements

유저가 획득한 업적 기록.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | BIGINT PK AUTO_INCREMENT | 레코드 식별자 |
| `user_id` | BIGINT FK → users | 획득 유저 |
| `achievement_id` | VARCHAR(50) FK → achievements | 획득 업적 |
| `earned_at` | DATETIME DEFAULT NOW | 획득 일시 |

**비고**
- `(user_id, achievement_id)` UNIQUE KEY로 중복 획득을 방지한다.
- 업적 저장은 `INSERT IGNORE`를 사용해 레이스 컨디션을 방어한다.
- 업적 달성 시 프론트에 `newAchievements` 배열로 반환되어 토스트 알림이 표시된다.

---

## 12. user_stats

유저별 활동 통계. 현재는 채팅 카운트만 저장한다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `user_id` | BIGINT PK FK → users | 유저 (1:1 관계) |
| `chat_count` | INT DEFAULT 0 | 스터디룸에서 전송한 채팅 누적 횟수 |

**비고**
- 행은 `INSERT IGNORE`(`ensureUserStats`)로 첫 채팅 시 자동 생성된다.
- 채팅 전송(WebSocket `handleChat`)마다 `chat_count`가 1 증가한다.
- `chat_count >= 50` 조건으로 `group_chat_50` 업적을 체크한다.
- 향후 다른 통계(총 집중 시간 캐시 등) 컬럼 추가 시 이 테이블을 확장한다.

---

## 관계 다이어그램 (요약)

```
users ──┬── sessions (1:N)
        ├── todos (1:N)
        ├── ddays (1:N)
        ├── timetable_blocks (1:N)
        ├── user_achievements (1:N) ── achievements (N:1)
        ├── user_stats (1:1)
        ├── study_groups [leader_id] (1:N)
        └── group_members (N:M) ── study_groups (N:M)

contacts  (독립 — 유저 FK 없음)
notices   (독립 — 유저 FK 없음)
```
