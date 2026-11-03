# Watchman 아키텍처 문서

## 0. 개발환경 개요

### 개발환경

| 구분 | 환경 |
|------|------|
| 웹페이지 개발 언어 | HTML, CSS, JavaScript |
| 서버 개발 언어 | Java 25 (Amazon Corretto) |
| 서버 (Servlet Container) | Apache Tomcat 10.1 (Spring Boot 내장) |
| 데이터베이스 | MySQL (포트 3308) |
| 배포 | AWS EC2 / RDS |

### 적용 라이브러리

| 구분 | 라이브러리 |
|------|-----------|
| 서버 개발 프레임워크 | Spring Boot 3.5.14 / Spring Framework 6.2.x |
| DB 접근 | Spring JDBC (JdbcTemplate) — ORM 미사용 |
| 비밀번호 암호화 | Spring Security Crypto (BCryptPasswordEncoder) |
| 실시간 통신 | Spring WebSocket (STOMP over SockJS) |
| 웹페이지 개발 (CDN) | SockJS 1.6.1, STOMP.js 2.3.3, MediaPipe Tasks Vision 0.10.3 |

### Spring Boot 의존성 (pom.xml)

| artifactId | 역할 |
|------------|------|
| `spring-boot-starter-web` | REST API (Spring MVC, 내장 Tomcat) |
| `spring-boot-starter-jdbc` | JdbcTemplate 기반 DB 접근 |
| `spring-boot-starter-websocket` | STOMP over WebSocket (스터디룸 실시간 통신) |
| `spring-security-crypto` | BCryptPasswordEncoder (비밀번호 해싱) |
| `mysql-connector-j` | MySQL JDBC 드라이버 (runtime) |
| `spring-boot-starter-test` | JUnit 5 + Spring Test (test scope) |

### 개발도구

| 구분 | 도구 |
|------|------|
| 서버 / 웹페이지 개발 | VSCode |
| 빌드 도구 | Maven (mvnw wrapper) |
| 형상관리 | Git |
| 데이터베이스 개발 | DBeaver, HeidiSQL, MySQL Workbench |
| 이미지 편집 | Gemini Nano Banana 2 |
| 배포 | AWS EC2 / RDS |

---

## 1. 전체 구조

```
[브라우저]
    │  HTTP REST (fetch API)
    │  WebSocket (STOMP over SockJS)
    ▼
[Spring Boot 3.5 — 내장 Tomcat :8080]
    │  컨텍스트 경로: /watchman
    │  API 경로:      /watchman/api/*
    │  정적 파일:     /watchman/**
    ▼
[MySQL 8.0 — localhost:3308]
    DB: watchman
    User: watchman_db
```

빌드 도구: Maven
언어: Java 25 (Amazon Corretto)
배포 단위: `target/watchman-0.0.1-SNAPSHOT.jar` (Executable JAR)

---

## 2. 백엔드 — Spring Boot

### 2-1. 의존성 (pom.xml)

| 의존성 | 역할 |
|--------|------|
| `spring-boot-starter-web` | REST API (Spring MVC, 내장 Tomcat) |
| `spring-boot-starter-jdbc` | JdbcTemplate 기반 DB 접근 |
| `spring-boot-starter-websocket` | STOMP over WebSocket (스터디룸 실시간 통신) |
| `mysql-connector-j` | MySQL 8.0 JDBC 드라이버 (runtime) |
| `spring-security-crypto` | BCryptPasswordEncoder (비밀번호 해싱) |
| `spring-boot-starter-test` | 테스트 (test scope) |

> **ORM 없음**: JPA/Hibernate, MyBatis를 사용하지 않고 `JdbcTemplate`으로 SQL을 직접 작성한다.

### 2-2. 패키지 구조

```
com.watchman
├── WatchmanApplication.java          # 진입점 (@SpringBootApplication)
├── config/
│   ├── WebSocketConfig.java          # STOMP 브로커, /ws 엔드포인트 설정
│   ├── PasswordEncoderConfig.java    # BCryptPasswordEncoder Bean
│   ├── DataInitializer.java          # 서버 기동 시 마이그레이션 + 기초 데이터 삽입
│   └── ActiveUserTracker.java        # 실시간 공부 중 인원 인메모리 추적
├── controller/                       # REST 엔드포인트 (@RestController)
│   ├── AuthController.java           # 로그인·로그아웃·회원가입
│   ├── UserController.java           # 내 정보 조회·수정·탈퇴
│   ├── SessionController.java        # 공부 세션 CRUD
│   ├── PlannerController.java        # 할 일·D-Day·타임블록 CRUD
│   ├── StudyGroupController.java     # 그룹 생성·참여·강퇴·폐쇄
│   ├── StudyRoomController.java      # WebSocket 메시지 핸들러 (@MessageMapping)
│   ├── NoticeController.java         # 공지사항 CRUD
│   ├── AdminController.java          # 관리자 전용 (문의·사용자 관리)
│   ├── AchievementController.java    # 업적 조회
│   └── StatsController.java          # 실시간 접속자 ping·leave·count
├── service/                          # 비즈니스 로직 (인터페이스 + Impl)
│   ├── UserService / Impl
│   ├── SessionService / Impl
│   ├── PlannerService / Impl
│   ├── StudyGroupService / Impl
│   ├── NoticeService / Impl
│   ├── ContactService / Impl
│   └── AchievementService / Impl
├── repository/                       # DB 접근 (인터페이스 + Impl, JdbcTemplate)
│   ├── UserRepository / Impl
│   ├── SessionRepository / Impl
│   ├── PlannerRepository / Impl
│   ├── StudyGroupRepository / Impl
│   ├── NoticeRepository / Impl
│   ├── ContactRepository / Impl
│   └── AchievementRepository / Impl
└── domain/                           # 도메인 객체 (Plain Java, getter/setter)
    ├── User, Session, Todo, DDay
    ├── TimetableBlock, Notice, Contact
    ├── StudyGroup, StudyGroupMember
    ├── Achievement, UserAchievement
```

### 2-3. 3계층 아키텍처

```
Controller  →  Service (interface + Impl)  →  Repository (interface + Impl)
    ↓                   ↓                             ↓
ResponseEntity     비즈니스 로직               JdbcTemplate + SQL
```

- **Controller**: 요청 파싱, 세션 인증 확인, `ResponseEntity` 반환
- **Service**: 비즈니스 로직, 트랜잭션(`@Transactional`), 계산 (집중률 등)
- **Repository**: SQL 실행, `BeanPropertyRowMapper`로 도메인 객체 매핑

### 2-4. 인증 방식

Spring Security를 사용하지 않고 **HTTP 세션** 기반으로 직접 구현.

```java
// 로그인 성공 시
session.setAttribute("userId", user.getUserId());

// 각 컨트롤러에서 인증 확인
Long userId = (Long) session.getAttribute("userId");
if (userId == null) return ResponseEntity.status(401)...;
```

- 세션 타임아웃: 8시간 (기본)
- 로그인 유지 체크 시: 30일 + 영구 쿠키
- 관리자 확인: `users.is_admin = 1` 여부를 매 요청마다 DB 조회

### 2-5. 서버 기동 시 자동 처리 (DataInitializer)

`ApplicationRunner`를 구현하여 서버 기동 직후 실행:

1. `admin@watchman.com` 비밀번호 plain-text → BCrypt 마이그레이션
2. `sessions.name` 컬럼 누락 시 ALTER TABLE 추가
3. `sessions.group_id` 컬럼 누락 시 ALTER TABLE 추가
4. `contacts` 답변 컬럼 3개 누락 시 ALTER TABLE 추가
5. 업적 마스터 데이터 30개 INSERT IGNORE

### 2-6. WebSocket (STOMP)

```
WebSocketConfig
  ├── 엔드포인트: /ws  (SockJS 폴백 지원)
  ├── 메시지 브로커: /topic (구독)
  └── 앱 프리픽스: /app (발행)
```

`StudyRoomController`가 5개 채널 처리:

| @MessageMapping | 브로드캐스트 토픽 | 역할 |
|-----------------|------------------|------|
| `/room/{id}/join` | `/topic/room/{id}/presence` | 입장 |
| `/room/{id}/leave` | `/topic/room/{id}/presence` | 퇴장 |
| `/room/{id}/focus` | `/topic/room/{id}/focus` | 집중/딴짓 상태 |
| `/room/{id}/chat` | `/topic/room/{id}/chat` | 채팅 (+ 채팅 카운트 증가) |
| `/room/{id}/signal` | `/topic/room/{id}/signal` | WebRTC 시그널링 |

프론트: SockJS 1.6.1 + STOMP.js 2.3.3 (CDN)

### 2-7. 실시간 접속자 집계 (ActiveUserTracker)

```
공부 시작 → POST /api/stats/ping (30초마다 반복)
공부 종료 → POST /api/stats/leave

GET /api/stats/active → { "count": N }  (인증 불필요)
```

`ConcurrentHashMap<sessionKey, lastPingAt>` 인메모리 저장. TTL 60초 초과 시 만료 자동 정리.

---

## 3. 프론트엔드 — Vanilla HTML/CSS/JS

빌드 도구 없음. 프레임워크 없음. 모든 파일은 Spring Boot 내장 리소스 서버(`/watchman/static/`)에서 제공된다.

### 3-1. 페이지 목록

| HTML 파일 | 경로 | 설명 |
|-----------|------|------|
| `index.html` | `/watchman/index.html` | 랜딩 페이지 (비로그인) |
| `login.html` | `/watchman/login.html` | 로그인 / 회원가입 |
| `main.html` | `/watchman/main.html` | 메인 대시보드 |
| `study-session.html` | `/watchman/study-session.html` | 솔로 공부 세션 |
| `session-picker.html` | `/watchman/session-picker.html` | 세션 선택 (이어하기) |
| `calibration.html` | `/watchman/calibration.html` | 얼굴 감지 보정 |
| `planner.html` | `/watchman/planner.html` | 플래너 (달력·할 일·D-Day·타임테이블) |
| `stats.html` | `/watchman/stats.html` | 공부 통계 |
| `study-group.html` | `/watchman/study-group.html` | 스터디 그룹 목록·생성·참여 |
| `study-group-info.html` | `/watchman/study-group-info.html` | 그룹 상세·랭킹 |
| `study-group-session.html` | `/watchman/study-group-session.html` | 그룹 스터디룸 (WebRTC+WebSocket) |
| `achievements.html` | `/watchman/achievements.html` | 업적 목록 |
| `mypage.html` | `/watchman/mypage.html` | 마이페이지 |
| `notice.html` | `/watchman/notice.html` | 공지사항 |
| `contact.html` | `/watchman/contact.html` | 문의하기 |
| `admin.html` | `/watchman/admin.html` | 관리자 대시보드 |
| `how-it-works.html` | 정적 안내 페이지 | 사용법 안내 |
| `service-intro.html` | 정적 안내 페이지 | 서비스 소개 |
| `terms.html` / `privacy.html` | 정적 페이지 | 이용약관·개인정보 |

### 3-2. CSS 구조

| 파일 | 적용 범위 |
|------|-----------|
| `global.css` | 전역 CSS 변수, 공통 컴포넌트, 다크모드(`body.dark`), 업적 토스트 |
| `main.css` | 메인 nav, 배너, 대시보드, 다크모드 토글 스위치 |
| `inner-pages.css` | 내부 페이지 공통 레이아웃 (마이페이지, 스터디그룹 등) |
| `landing.css` | 랜딩 페이지 전용 |
| `login.css` | 로그인·회원가입 전용 |
| `study-session.css` | 솔로 세션 전용 (카메라, 타이머, 캘리브레이션) |
| `study-group-session.css` | 그룹 세션 전용 (그리드, 채팅, 흰 배경) |
| `session-picker.css` | 세션 선택 페이지 전용 |
| `planner.css` | 플래너 전용 (달력, 노트북, 타임테이블 그리드) |
| `stats.css` | 통계 페이지 전용 |
| `achievements.css` | 업적 페이지 전용 (탭, 카드 그리드) |
| `calibration.css` | 보정 페이지 전용 |
| `admin.css` | 관리자 페이지 전용 (로그인 화면, 테이블, 답변 모달) |
| `footer-pages.css` | 문의·약관·소개 등 footer 페이지 공통 |
| `how-it-works.css` | 사용법 페이지 전용 |

**CSS 변수 (`global.css :root`)**
```css
--primary, --primary-dark, --primary-light, --primary-border
--bg, --bg-dark, --bg-white
--text, --text-muted, --text-light
--border, --border-light
--radius-sm/md/lg/full
--shadow-sm/md/lg
```

**다크모드**: `body.dark` 클래스로 변수를 오버라이드. `localStorage['watchman-theme']`로 유지.

### 3-3. JavaScript 구조

| 파일 | 역할 |
|------|------|
| `nav.js` | 공통 nav 주입, 로그아웃 처리, 다크모드 토글 초기화 |
| `auth-guard.js` | 비로그인 시 login.html로 리다이렉트 |
| `animations.js` | 스크롤 페이드인 애니메이션 |
| `main.js` | 대시보드 통계 로드, 업적 알림 체크 |
| `login.js` | 로그인·회원가입 폼 처리 |
| `mypage.js` | 프로필 수정, 아바타 변경, 탈퇴 |
| `stats.js` | 세션 통계 차트·히스토리 |
| `planner.js` | 달력, 할 일, D-Day, 타임테이블 그리드 + 드래그 |
| `notice.js` | 공지사항 목록 조회 |
| `session-picker.js` | 세션 선택 (10개 + 페이지네이션) |
| `study-session.js` | 솔로 세션 (카메라, MediaPipe, 타이머, 음악) |
| `study-group.js` | 그룹 목록·생성·참여 |
| `study-group-info.js` | 그룹 상세, 랭킹, 입장 |
| `study-group-session.js` | 그룹 세션 (WebRTC + STOMP + MediaPipe) |
| `calibration.js` | 독립 얼굴 감지 보정 페이지 |
| `achievements.js` | 업적 30개 마스터 데이터 + 탭 필터 렌더링 |
| `achievement-toast.js` | 업적 획득 토스트 알림 (큐 처리) + 메인 페이지 신규 업적 체크 |

### 3-4. 주요 외부 라이브러리 (CDN)

| 라이브러리 | 버전 | 사용 위치 |
|-----------|------|-----------|
| SockJS | 1.6.1 | `study-group-session.html` |
| STOMP.js | 2.3.3 | `study-group-session.html` |
| MediaPipe Tasks Vision | 0.10.3 | `study-session.js`, `study-group-session.js` (동적 import) |

---

## 4. MediaPipe 얼굴 감지

CDN에서 동적 import로 로드. GPU delegate 실패 시 CPU로 자동 폴백.

```
FaceLandmarker (478 랜드마크)
  → computeHeadAngles() → Yaw(좌우), Pitch(상하) 각도 계산
  → 임계값 초과 여부 판정 (캘리브레이션 값 또는 기본값)
  → 3초 유예 후 딴짓 판정
  → isFocused 상태 → 타이머 분기 (집중/딴짓 시간 누적)
```

**캘리브레이션**: 10초간 자연스럽게 움직이며 5/95 백분위수로 개인화 임계값 계산. 솔로 세션은 `sessionStorage`에 저장, 그룹 세션은 매 입장 시 재보정(또는 nav 버튼으로 수동 실행).

**WebRTC (그룹 세션)**: Full mesh P2P. 참가자 N명 → N*(N-1)/2 개 PeerConnection.

---

## 5. API 엔드포인트 목록

모든 경로는 컨텍스트 경로 `/watchman` 이후 기준.

### 인증

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/logout` | 로그아웃 |
| POST | `/api/auth/register` | 회원가입 |

### 유저

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/users/me` | 내 정보 조회 |
| PATCH | `/api/users/me/nickname` | 닉네임 변경 |
| PATCH | `/api/users/me/password` | 비밀번호 변경 |
| PATCH | `/api/users/me/avatar` | 아바타 변경 |
| DELETE | `/api/users/me` | 회원 탈퇴 |

### 세션

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/sessions` | 전체 세션 목록 |
| GET | `/api/sessions/today` | 오늘 세션 |
| GET | `/api/sessions/week` | 최근 7일 세션 |
| GET | `/api/sessions/recent?limit=N` | 최근 N개 세션 |
| GET | `/api/sessions/list?page=0&size=10` | 페이지네이션 (세션 선택) |
| GET | `/api/sessions/{id}` | 단건 조회 (이어하기) |
| POST | `/api/sessions` | 세션 저장 (새 세션 또는 이어하기) |

### 플래너

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/planner/todos?date=` | 날짜별 할 일 |
| GET | `/api/planner/todos/month?year=&month=` | 월별 할 일 |
| POST | `/api/planner/todos` | 할 일 추가 |
| PATCH | `/api/planner/todos/{id}` | 완료 여부 토글 |
| DELETE | `/api/planner/todos/{id}` | 할 일 삭제 |
| GET | `/api/planner/ddays` | D-Day 목록 |
| POST | `/api/planner/ddays` | D-Day 추가 |
| DELETE | `/api/planner/ddays/{id}` | D-Day 삭제 |
| GET | `/api/planner/blocks?date=` | 날짜별 타임블록 |
| POST | `/api/planner/blocks` | 타임블록 생성 |
| PUT | `/api/planner/blocks/{id}` | 타임블록 수정 |
| DELETE | `/api/planner/blocks/{id}` | 타임블록 삭제 |

### 스터디 그룹

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/groups` | 내 그룹 목록 |
| GET | `/api/groups/{id}` | 그룹 상세 |
| POST | `/api/groups` | 그룹 생성 |
| POST | `/api/groups/join` | 초대코드로 참여 |
| DELETE | `/api/groups/{id}` | 그룹 폐쇄 |
| DELETE | `/api/groups/{id}/members/me` | 그룹 나가기 |
| DELETE | `/api/groups/{id}/members/{uid}` | 멤버 강퇴 |

### 공지사항

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/notices` | 공지 목록 |
| POST | `/api/notices` | 공지 작성 (관리자) |
| PUT | `/api/notices/{id}` | 공지 수정 (관리자) |
| DELETE | `/api/notices/{id}` | 공지 삭제 (관리자) |

### 문의

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/contact` | 문의 제출 (비로그인 가능) |
| GET | `/api/contact/my?email=` | 이메일로 내 문의 조회 |

### 업적

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/achievements` | 전체 업적 + 획득 여부 |
| GET | `/api/achievements/my` | 내가 획득한 업적 |

### 실시간 통계

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/stats/active` | 현재 공부 중 인원 수 |
| POST | `/api/stats/ping` | 공부 세션 heartbeat (30초마다) |
| POST | `/api/stats/leave` | 공부 세션 종료 신호 |

### 관리자

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/admin/check` | 관리자 세션 확인 |
| GET | `/api/admin/contacts` | 전체 문의 목록 |
| POST | `/api/admin/contacts/{id}/reply` | 문의 답변 등록 |
| DELETE | `/api/admin/contacts/{id}` | 문의 삭제 |
| GET | `/api/admin/users` | 전체 사용자 목록 |
| PATCH | `/api/admin/users/{id}/admin` | 관리자 권한 변경 |
| DELETE | `/api/admin/users/{id}` | 사용자 삭제 |

### WebSocket (STOMP)

| 발행 경로 | 구독 토픽 | 설명 |
|-----------|-----------|------|
| `/app/room/{id}/join` | `/topic/room/{id}/presence` | 입장 |
| `/app/room/{id}/leave` | `/topic/room/{id}/presence` | 퇴장 |
| `/app/room/{id}/focus` | `/topic/room/{id}/focus` | 집중 상태 |
| `/app/room/{id}/chat` | `/topic/room/{id}/chat` | 채팅 |
| `/app/room/{id}/signal` | `/topic/room/{id}/signal` | WebRTC 시그널링 |

---

## 6. 데이터 흐름 예시

### 솔로 공부 세션

```
[session-picker.html]
  세션 선택 → study-session.html?sessionId=N (이어하기)
           → study-session.html              (새 세션)

[study-session.html]
  카메라 켜기 → MediaPipe 로드
  공부 시작   → startPresencePing() → POST /api/stats/ping (30s 반복)
               → startDetectionLoop() (rAF 50ms throttle)
                   → computeHeadAngles() → applyFocusState()
                       → 딴짓: 빨간 오버레이 + 테두리
               → startTimer() → focusedSec / distractedSec 누적
  공부 종료   → stopPresencePing()
               → POST /api/sessions { focusedTime, distractedTime, sessionId? }
               → res.newAchievements → showAchievementToasts()
```

### 그룹 스터디

```
[study-group-session.html]
  DOMContentLoaded
    → ensureMyInfo()      (sessionStorage 또는 GET /api/users/me)
    → startCamera()       (getUserMedia)
    → connectWebSocket()  (SockJS → STOMP)
        → subscribe /topic/room/{id}/presence, focus, chat, signal
        → send /app/room/{id}/join
    → startTimer()
    → startPresencePing()
    → initFaceLandmarker() → startDetectionLoop()
                           → applyFocusState() → send /app/room/{id}/focus

  신규 참가자 입장
    → handlePresence(join) → participants.set() → renderGrid()
                           → initiateOffer(remoteUserId)
                               → RTCPeerConnection → createOffer → send signal
    → handleSignal(offer)  → createPC() → setRemoteDescription → createAnswer
    → handleSignal(answer) → setRemoteDescription
    → handleSignal(ice)    → addIceCandidate (or queue)
    → pc.ontrack           → video.srcObject = remoteStream
```

---

## 7. 로컬 개발 환경

| 항목 | 값 |
|------|----|
| Java | 25 (Amazon Corretto) |
| Maven | Wrapper (`mvnw.cmd`) 사용 |
| DB | MySQL 8.0, 포트 3308, DB명 `watchman` |
| DB 유저 | `watchman_db` / `watchman1234` |
| 실행 | `mvnw.cmd spring-boot:run` |
| 접속 | `http://localhost:8080/watchman` |

**스키마 초기화**: `spring.sql.init.mode=always` → 서버 시작 시 `schema.sql` 자동 실행 (IF NOT EXISTS).
