# Watchman 프로젝트 구조 참고 문서

AI 코드 어시스턴트를 위한 기술 참고자료. 이 문서를 먼저 읽으면 프로젝트 전체를 빠르게 파악할 수 있다.

---

## 1. 기술 스택

| 항목 | 내용 |
|------|------|
| 언어 | Java 25 (Amazon Corretto) |
| 프레임워크 | Spring Boot 3.5 (MVC, no JPA) |
| DB | MariaDB 10.11+ |
| DB 접근 | Spring JdbcTemplate (순수 SQL, ORM 없음) |
| WebSocket | Spring WebSocket + STOMP (SockJS 폴백) |
| 빌드 | Maven (mvnw.cmd) |
| 프론트엔드 | Vanilla HTML/CSS/JS (프레임워크 없음, 빌드 없음) |

---

## 2. 서버 설정

- **포트:** 8080
- **컨텍스트 경로:** `/watchman`
- **API 기본 경로:** `/watchman/api/*`
- **정적 파일 경로:** `/watchman/` (예: `http://localhost:8080/watchman/main.html`)
- **세션 타임아웃:** 8시간
- **인증:** HTTP 세션 기반 (`HttpSession`에 `userId: Long` 저장)
- **관리자 계정:** `admin@watchman.com` / `admin1234!` (앱 시작 시 자동 생성)

---

## 3. 백엔드 아키텍처

### 계층 구조

```
HTTP 요청
    ↓
Controller (@RestController)
    ↓  ResponseEntity<?> 반환
Service (interface + Impl)
    ↓  비즈니스 로직, 예외 처리
Repository (interface + Impl)
    ↓  JdbcTemplate으로 SQL 실행
MariaDB
```

### 패키지 구조

```
com.watchman
├── config/
│   └── WebSocketConfig.java         ← STOMP 설정
├── controller/
│   ├── AuthController.java          ← 로그인/로그아웃/회원가입
│   ├── UserController.java          ← 내 정보, 비밀번호 변경
│   ├── SessionController.java       ← 공부 세션 저장/조회
│   ├── PlannerController.java       ← Todo, D-Day, 타임테이블 블록
│   ├── NoticeController.java        ← 공지사항
│   ├── ContactController.java       ← 문의하기
│   ├── AdminController.java         ← 관리자 전용
│   ├── StudyGroupController.java    ← 그룹 CRUD REST API
│   └── StudyRoomController.java     ← WebSocket 메시지 핸들러
├── service/
│   ├── UserService / Impl
│   ├── SessionService / Impl
│   ├── PlannerService / Impl
│   ├── NoticeService / Impl
│   ├── ContactService / Impl
│   └── StudyGroupService / Impl
├── repository/
│   ├── UserRepository / Impl
│   ├── SessionRepository / Impl
│   ├── PlannerRepository / Impl     ← Todo, DDay, TimetableBlock 통합
│   ├── NoticeRepository / Impl
│   ├── ContactRepository / Impl
│   └── StudyGroupRepository / Impl
└── domain/
    ├── User.java
    ├── Session.java                 ← 공부 세션 (focused_time, distracted_time, focus_rate)
    ├── Todo.java
    ├── DDay.java
    ├── TimetableBlock.java          ← 플래너 드래그 블록 (start_time, end_time, color, label)
    ├── Notice.java
    ├── Contact.java
    ├── StudyGroup.java              ← 그룹 (members: List<StudyGroupMember> 포함)
    └── StudyGroupMember.java        ← 멤버 (totalTime: long, focusRate: double)
```

### 코딩 컨벤션

- 생성자 주입 대신 **setter 주입** (`@Autowired` on setter) — 프로젝트 전체 통일
- 예외 구분: `IllegalArgumentException` = 잘못된 입력값, `IllegalStateException` = 비즈니스 규칙 위반
- Controller에서 예외 → HTTP 상태코드 변환 (404/403/400/401)
- 도메인 클래스: plain Java (어노테이션 없음, getter/setter만)

---

## 4. 데이터베이스

### schema.sql

`src/main/resources/schema.sql` — 앱 시작 시마다 자동 실행 (`spring.sql.init.mode=always`).
`IF NOT EXISTS` 조건으로 기존 데이터 보존. 컬럼 추가/변경 시 `ALTER TABLE`을 이 파일에 추가.

### 테이블 목록

| 테이블 | 도메인 | 설명 |
|--------|--------|------|
| `users` | User | 사용자. `avatar`는 MEDIUMTEXT (Base64 이미지). `is_admin` TINYINT |
| `sessions` | Session | 공부 세션. `focused_time`, `distracted_time`(초), `focus_rate`(%) |
| `todos` | Todo | 플래너 할 일. `todo_date` DATE |
| `ddays` | DDay | D-Day 항목. `dday_date` DATE |
| `timetable_blocks` | TimetableBlock | 플래너 드래그 블록. `start_time`, `end_time` TIME |
| `notices` | Notice | 공지사항. `pinned` TINYINT, `tag` VARCHAR |
| `contacts` | Contact | 문의하기. 비인증 |
| `study_groups` | StudyGroup | 스터디 그룹. `invite_code` 6자 고유 |
| `group_members` | — | 그룹-멤버 다대다. PK(group_id, user_id) |

### JdbcTemplate 패턴

```java
// 목록 조회
template.query("SELECT ... FROM table WHERE user_id = ?",
    BeanPropertyRowMapper.newInstance(Foo.class), userId);

// 단건 조회 (Optional 패턴)
List<Foo> list = template.query(sql, (rs, row) -> mapFoo(rs), id);
return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));

// INSERT + 생성된 PK 반환
KeyHolder keyHolder = new GeneratedKeyHolder();
template.update(con -> {
    PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
    ps.setString(1, value);
    return ps;
}, keyHolder);
Long newId = keyHolder.getKey().longValue();

// UPDATE / DELETE
template.update("UPDATE table SET col = ? WHERE id = ?", value, id);
```

---

## 5. REST API 목록

### 인증 (`/api/auth`)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/auth/login` | 로그인. body: `{email, password}` |
| POST | `/api/auth/logout` | 로그아웃 |
| POST | `/api/auth/register` | 회원가입 |

### 사용자 (`/api/users`)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/users/me` | 내 정보 반환 |
| PUT | `/api/users/me` | 닉네임/아바타 수정 |
| PUT | `/api/users/me/password` | 비밀번호 변경 |

### 공부 세션 (`/api/sessions`)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/sessions` | 세션 저장. body: `{focusedTime, distractedTime}`. `focusRate`는 서버에서 자동 계산 |
| GET | `/api/sessions` | 내 세션 목록 |

### 플래너 (`/api/planner`)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/planner/todos?date=` | 날짜별 할 일 |
| GET | `/api/planner/todos/month?year=&month=` | 월별 할 일 |
| POST | `/api/planner/todos` | 할 일 추가 |
| PATCH | `/api/planner/todos/{id}` | 완료 여부 변경 |
| DELETE | `/api/planner/todos/{id}` | 할 일 삭제 |
| GET | `/api/planner/ddays` | D-Day 목록 |
| POST | `/api/planner/ddays` | D-Day 추가 |
| DELETE | `/api/planner/ddays/{id}` | D-Day 삭제 |
| GET | `/api/planner/blocks?date=` | 타임테이블 블록 조회 |
| POST | `/api/planner/blocks` | 블록 생성 |
| PUT | `/api/planner/blocks/{id}` | 블록 수정 |
| DELETE | `/api/planner/blocks/{id}` | 블록 삭제 |

### 스터디 그룹 (`/api/groups`)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/groups` | 내 그룹 목록 (멤버 + 집계 포함) |
| GET | `/api/groups/{groupId}` | 그룹 상세 |
| POST | `/api/groups` | 그룹 생성. body: `{name, description}` |
| POST | `/api/groups/join` | 초대코드 참가. body: `{inviteCode}` |
| DELETE | `/api/groups/{groupId}` | 그룹 폐쇄 (방장만) |
| DELETE | `/api/groups/{groupId}/members/me` | 그룹 나가기 |
| DELETE | `/api/groups/{groupId}/members/{userId}` | 멤버 강퇴 (방장만) |

---

## 6. WebSocket (STOMP)

- **엔드포인트:** `/watchman/ws` (SockJS 폴백)
- **App prefix:** `/app` (클라이언트 → 서버 송신)
- **Broker prefix:** `/topic` (서버 → 클라이언트 구독)
- **핸들러:** `StudyRoomController`

### 스터디룸 채널

| 구독 (수신) | 송신 | 페이로드 |
|-------------|------|---------|
| `/topic/room/{groupId}/presence` | `/app/room/{groupId}/join` 또는 `/leave` | `{userId, nickname, avatar, action: "join"/"leave"}` |
| `/topic/room/{groupId}/focus` | `/app/room/{groupId}/focus` | `{userId, focused: boolean}` |
| `/topic/room/{groupId}/chat` | `/app/room/{groupId}/chat` | `{userId, nickname, avatar, message, timestamp}` |
| `/topic/room/{groupId}/signal` | `/app/room/{groupId}/signal` | `{from, to, type: "offer"/"answer"/"ice", data, fromNickname?, fromAvatar?}` |

### 프론트엔드 연결 코드 (stomp.js v2)

```javascript
const socket = new SockJS('/watchman/ws');
const stompClient = Stomp.over(socket);
stompClient.connect({}, () => {
    stompClient.subscribe(`/topic/room/${groupId}/chat`, msg => {
        const data = JSON.parse(msg.body);
    });
    stompClient.send(`/app/room/${groupId}/chat`, {}, JSON.stringify(payload));
});
```

---

## 7. 프론트엔드

### 페이지 목록

| HTML 파일 | 설명 |
|-----------|------|
| `index.html` | 랜딩 페이지 |
| `login.html` | 로그인/회원가입 |
| `main.html` | 메인 대시보드 |
| `study-session.html` | 1인 공부 세션 (MediaPipe 집중 감지) |
| `planner.html` | 플래너 (캘린더 + 타임테이블 블록) |
| `stats.html` | 통계 |
| `mypage.html` | 마이페이지 |
| `study-group.html` | 그룹 목록/생성/참가 |
| `study-group-info.html` | 그룹 상세 + 랭킹 + 스터디룸 입장 |
| `study-group-session.html` | 실시간 그룹 스터디룸 (WebRTC + 채팅) |
| `calibration.html` | 집중 감지 캘리브레이션 |
| `admin.html` | 관리자 페이지 |
| `notice.html` | 공지사항 |
| `contact.html` | 문의하기 |

### 핵심 JS 파일

| JS 파일 | 역할 |
|---------|------|
| `nav.js` | 공통 네비게이션 바 렌더링 |
| `auth-guard.js` | 비로그인 시 login.html 리다이렉트 |
| `study-session.js` | MediaPipe FaceLandmarker 집중 감지, 세션 저장 |
| `study-group-session.js` | WebRTC 풀메시 + STOMP 4채널 + MediaPipe 집중 감지 |

### 인증 상태 확인 방법

```javascript
// sessionStorage에 캐싱
const userId   = sessionStorage.getItem('userId');
const nickname = sessionStorage.getItem('nickname');
const avatar   = sessionStorage.getItem('avatar');

// 없으면 서버에서 조회
const res = await fetch('/watchman/api/users/me');
```

### CSS 구조

| CSS 파일 | 적용 범위 |
|----------|-----------|
| `global.css` | CSS 변수, 리셋, 공통 유틸 |
| `main.css` | 메인 대시보드 레이아웃 |
| `inner-pages.css` | 플래너·공지·그룹 등 내부 페이지 공통 (`.sg-*` 클래스 포함) |
| `study-session.css` | 1인 세션 페이지 전용 (`.calib-*` 클래스 포함) |
| `study-group-session.css` | 그룹 세션 페이지 전용 (`.sgs-*` 클래스 포함) |

---

## 8. MediaPipe 집중 감지

`study-session.js`와 `study-group-session.js` 양쪽에 동일 로직 존재.

- **모델:** FaceLandmarker (`float16`, CDN 다운로드)
- **방식:** 머리의 Yaw(좌우)·Pitch(상하) 각도를 매 프레임 계산
- **판정:** 각도가 임계값 초과 상태가 3초 이상 지속 → 딴짓
- **캘리브레이션:** 10초간 샘플 수집 → 5/95 백분위수로 개인화 임계값 계산 → `sessionStorage`에 저장
- **기본 임계값:** yaw ±35°, pitch 하 30° / 상 20°
- **캘리브레이션 값 키:** `watchman_calib_yaw_left`, `watchman_calib_yaw_right`, `watchman_calib_pitch_down`, `watchman_calib_pitch_up`, `watchman_calib_done`

---

## 9. WebRTC (그룹 스터디)

풀메시(Full Mesh) 방식 — N명이면 N*(N-1)/2개의 P2P 연결.

```
신규 참가자 B 입장 흐름:
1. B가 join presence 브로드캐스트
2. 기존 참가자 A가 B에게 offer 전송 (fromNickname, fromAvatar 포함)
3. B가 handleSignal에서 offer 수신 → participants에 A 추가 → renderGrid()
4. B가 A에게 answer 전송
5. ICE candidate 교환 (remoteDescription 없으면 iceCandidateQueues에 큐잉)
6. P2P 연결 완료 → ontrack → video 표시
```

STUN 서버: `stun:stun.l.google.com:19302` (무료, 외부 인터넷 필요)

---

## 10. 주요 주의사항

1. **컨텍스트 경로 필수:** JS fetch URL은 반드시 `/watchman/api/...`, WebSocket은 `/watchman/ws`
2. **schema.sql 마이그레이션:** 컬럼 추가 시 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`를 schema.sql 하단에 추가
3. **비밀번호 평문 저장:** 현재 해싱 없음. 보안 강화 시 BCrypt 도입 필요
4. **avatar 필드:** MEDIUMTEXT에 Base64 인코딩 이미지 저장 (최대 16MB)
5. **totalTime 타입:** `StudyGroupMember.totalTime`은 `long` (int 오버플로우 방지)
6. **@Transactional 적용 범위:** 다단계 DB 작업(예: saveGroup + addMember)에만 적용. 단순 CRUD는 미적용
7. **그룹 세션 저장:** 그룹 스터디 종료 시 개인 집중 데이터를 기존 `sessions` 테이블에 저장 (그룹별 분리 없음)
