# Watchman 프로젝트 전체 분석

---

## 1. 프로젝트 개요

**Watchman**은 카메라와 AI 얼굴 감지를 통해 공부 집중도를 실시간으로 추적하는 스터디 모니터링 웹 애플리케이션이다.

| 항목 | 값 |
|------|----|
| 백엔드 | Spring Boot 3.5.14, Java 25 |
| 프론트엔드 | Vanilla HTML / CSS / JavaScript (프레임워크 없음) |
| 데이터베이스 | MySQL 8.0 |
| 빌드 도구 | Maven (mvnw wrapper) |
| 컨텍스트 경로 | `/watchman` |
| 인증 방식 | HTTP 세션 기반 |

**규모 요약**

| 분류 | 수량 |
|------|------|
| Java 클래스 | 54개 |
| HTML 페이지 | 20개 |
| JavaScript 파일 | 17개 (~4,880 LOC) |
| CSS 파일 | 14개 |
| DB 테이블 | 12개 |
| REST API 엔드포인트 | 약 45개 |
| WebSocket 토픽 | 5개 |
| 업적 | 30개 |

---

## 2. 전체 아키텍처

```
┌─ 브라우저 ─────────────────────────────────────────┐
│  HTML / CSS / Vanilla JS                           │
│  ├─ auth-guard.js  (페이지 보호)                    │
│  ├─ nav.js         (공통 네브바 + 다크모드)          │
│  └─ 페이지별 JS    (planner, session 등)            │
└────────────────────────────────────────────────────┘
         ↕  HTTP fetch()  /  WebSocket STOMP
┌─ Spring Boot ──────────────────────────────────────┐
│  ┌─ Controller ──────────────────────────────────┐ │
│  │  Auth / User / Session / Planner / Group      │ │
│  │  Achievement / Notice / Admin / Stats         │ │
│  │  StudyRoom (WebSocket @MessageMapping)        │ │
│  └───────────────────────────────────────────────┘ │
│                        ↕                           │
│  ┌─ Service (인터페이스 + Impl) ─────────────────┐ │
│  │  User / Session / Planner / StudyGroup        │ │
│  │  Achievement / Notice / Contact               │ │
│  └───────────────────────────────────────────────┘ │
│                        ↕                           │
│  ┌─ Repository (JdbcTemplate, SQL 직접 작성) ────┐ │
│  │  User / Session / Planner / StudyGroup        │ │
│  │  Achievement / Notice / Contact               │ │
│  └───────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
                        ↕
┌─ MySQL 8.0 ────────────────────────────────────────┐
│  users / sessions / todos / ddays                  │
│  timetable_blocks / study_groups / group_members   │
│  achievements / user_achievements / user_stats     │
│  notices / contacts                                │
└────────────────────────────────────────────────────┘
```

---

## 3. 백엔드 분석

### 3-1. 도메인 모델 (11개)

| 클래스 | 주요 필드 | 비고 |
|--------|-----------|------|
| `User` | userId, email, password, nickname, avatar, streak, isAdmin | BCrypt 비밀번호 |
| `Session` | sessionId, userId, name, focusedTime, distractedTime, focusRate, startedAt, groupId | 집중률은 서비스에서 계산 |
| `Todo` | todoId, userId, todoDate, content, done | 날짜별 할 일 |
| `DDay` | ddayId, userId, name, ddayDate | D-Day 카운트다운 |
| `TimetableBlock` | blockId, userId, blockDate, startTime, endTime, color, label | 드래그 생성 블록 |
| `Notice` | noticeId, tag, title, content, pinned, writerNickname | 공지사항 |
| `Contact` | contactId, name, email, type, content, status, replyContent, repliedAt | 문의 + 답변 |
| `StudyGroup` | groupId, name, inviteCode, leaderId, members | 그룹 + 멤버 리스트 |
| `StudyGroupMember` | userId, nickname, totalTime, focusRate | 레포지토리에서 JOIN 집계 |
| `Achievement` | achievementId, name, description, category, icon, hidden | 업적 마스터 |
| `UserAchievement` | id, userId, achievementId, earnedAt, achievement | 획득 기록 |

> 모든 도메인 객체는 Plain Java(POJO). JPA 어노테이션 없음.

---

### 3-2. 설정 클래스 (4개)

| 클래스 | 역할 |
|--------|------|
| `WebSocketConfig` | STOMP 브로커 설정. `/ws` 엔드포인트, SockJS 폴백, `setAllowedOriginPatterns("*")` |
| `PasswordEncoderConfig` | `BCryptPasswordEncoder` Bean 등록 |
| `DataInitializer` | 서버 기동 시 실행: admin BCrypt 마이그레이션, 컬럼 추가, 업적 30개 INSERT IGNORE |
| `ActiveUserTracker` | `ConcurrentHashMap` 기반 실시간 접속자 추적. TTL 60초 자동 만료 |

---

### 3-3. 컨트롤러 (9개)

| 컨트롤러 | 경로 | 인증 |
|---------|------|------|
| `AuthController` | `/api/auth/*` | 불필요 |
| `UserController` | `/api/users/*` | 세션 필요 |
| `SessionController` | `/api/sessions/*` | 세션 필요 |
| `PlannerController` | `/api/planner/*` | 세션 필요 |
| `StudyGroupController` | `/api/groups/*` | 세션 필요 |
| `StudyRoomController` | WebSocket `/app/room/{id}/*` | 없음 |
| `AchievementController` | `/api/achievements/*` | 세션 필요 |
| `NoticeController` | `/api/notices/*` | 읽기 공개, 쓰기 관리자 |
| `AdminController` | `/api/admin/*`, `/api/contact/*` | 혼합 |
| `StatsController` | `/api/stats/*` | 불필요 |

---

### 3-4. 서비스 레이어 (7개)

| 서비스 | 주요 역할 | 특이사항 |
|--------|-----------|----------|
| `UserServiceImpl` | 로그인·회원가입·정보수정·탈퇴 | BCrypt 검증 |
| `SessionServiceImpl` | 세션 저장·조회·페이지네이션 | 집중률 자동 계산 |
| `PlannerServiceImpl` | 할 일·D-Day·타임블록 CRUD | 날짜 포맷 처리 |
| `StudyGroupServiceImpl` | 그룹 생성·참여·강퇴·폐쇄 | `SecureRandom` 초대코드, `@Transactional` |
| `AchievementServiceImpl` | 업적 조건 확인 및 지급 | 30개 조건 switch 처리, try/catch로 메인 흐름 보호 |
| `NoticeServiceImpl` | 공지 CRUD | 단순 위임 |
| `ContactServiceImpl` | 문의 접수·조회·답변·삭제 | 이메일 기반 조회 |

---

### 3-5. 레포지토리 레이어 (7개)

모든 레포지토리는 `JdbcTemplate` + SQL 직접 작성. ORM 없음.

| 레포지토리 | 특이사항 |
|-----------|----------|
| `UserRepositoryImpl` | snake_case → camelCase 자동 매핑(`BeanPropertyRowMapper`) |
| `SessionRepositoryImpl` | 페이지네이션(`LIMIT/OFFSET`), 단건 조회(이어하기) |
| `PlannerRepositoryImpl` | 월별 일괄 조회(`YEAR/MONTH` 조건) |
| `StudyGroupRepositoryImpl` | 멤버 통계 집계 LEFT JOIN (`SUM(focused_time)`, `AVG(focus_rate)`) |
| `AchievementRepositoryImpl` | `INSERT IGNORE`로 중복 방지, 채팅 카운트 증가 |
| `NoticeRepositoryImpl` | `pinned DESC` 정렬 |
| `ContactRepositoryImpl` | 이메일 기반 조회, 답변 시 `status = 'answered'` 업데이트 |

---

## 4. 프론트엔드 분석

### 4-1. 페이지 구조 (20개)

```
/ (index.html)          — 랜딩, 실시간 접속자 수 폴링
├── login.html           — 로그인 / 회원가입
├── main.html            — 대시보드
│   ├── session-picker.html     — 세션 선택 (이어하기)
│   └── study-session.html      — 솔로 공부 세션 (카메라 + MediaPipe)
│       └── calibration.html    — 얼굴 감지 보정
├── planner.html         — 플래너 (달력 + 할 일 + D-Day + 타임테이블)
├── stats.html           — 공부 통계
├── study-group.html     — 스터디 그룹 목록/생성/참여
│   └── study-group-info.html   — 그룹 상세/랭킹
│       └── study-group-session.html  — 그룹 스터디룸 (WebRTC + STOMP)
├── achievements.html    — 업적 목록
├── mypage.html          — 마이페이지
├── notice.html          — 공지사항
├── contact.html         — 문의하기
├── admin.html           — 관리자 대시보드
└── (정적 페이지)
    ├── how-it-works.html
    ├── service-intro.html
    ├── privacy.html
    └── terms.html
```

---

### 4-2. JavaScript 파일 분석

| 파일 | LOC | 역할 | 핵심 기술 |
|------|-----|------|-----------|
| `study-session.js` | 916 | 솔로 세션 전체 | MediaPipe, rAF 루프, Web Audio |
| `study-group-session.js` | 754 | 그룹 세션 전체 | WebRTC Full Mesh, STOMP, MediaPipe |
| `planner.js` | 698 | 플래너 전체 | 드래그 셀 선택, 달력 렌더링 |
| `calibration.js` | 423 | 얼굴 감지 보정 | MediaPipe, GPU→CPU 폴백 |
| `mypage.js` | 315 | 프로필 수정 | File API (이미지 업로드) |
| `stats.js` | 304 | 통계 시각화 | Canvas/SVG 차트 |
| `nav.js` | 76 | 공통 nav | IIFE, 다크모드 토글 |
| `achievements.js` | 166 | 업적 UI | 30개 마스터 데이터, 탭 필터 |
| `auth-guard.js` | 28 | 페이지 보호 | `/api/users/me` 비동기 확인 |

---

### 4-3. CSS 구조

| 파일 | 적용 범위 |
|------|-----------|
| `global.css` | CSS 변수, 공통 컴포넌트, **다크모드** (`body.dark`), 업적 토스트 |
| `main.css` | nav, 배너, 대시보드, **다크모드 토글 스위치** |
| `inner-pages.css` | 내부 페이지 공통 레이아웃 |
| `study-session.css` | 솔로 세션 (카메라, 오버레이, 캘리브레이션) |
| `study-group-session.css` | 그룹 세션 (흰 배경, 그리드, 채팅) |
| `planner.css` | 달력, 노트북, 타임테이블 셀 그리드 |
| 나머지 | 페이지별 전용 스타일 |

---

### 4-4. 외부 라이브러리 (CDN)

| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| SockJS | 1.6.1 | WebSocket 폴백 |
| STOMP.js | 2.3.3 | 메시지 프로토콜 |
| MediaPipe Tasks Vision | 0.10.3 | 얼굴 랜드마크 478개 |

---

## 5. 주요 기능별 핵심 흐름

### 얼굴 감지 집중 판정
```
getUserMedia() → MediaPipe FaceLandmarker 로드 (GPU→CPU 폴백)
→ rAF 루프 (50ms throttle)
→ computeHeadAngles() : Yaw(좌우) / Pitch(상하) 각도 계산
→ 임계값 초과 여부 판정 (캘리브레이션 or 기본값)
→ 3초 유예 후 딴짓 판정
→ applyFocusState() → 타이머 분기 (focusedSec / distractedSec)
→ 딴짓 시 빨간 오버레이 표시
```

### 그룹 스터디룸 WebRTC 연결
```
STOMP join 브로드캐스트 → handlePresence(join)
→ initiateOffer(remoteUserId) → RTCPeerConnection 생성
→ createOffer → setLocalDescription → signal send
→ 상대방 handleSignal(offer) → createAnswer
→ ICE candidate 교환 (큐 처리, remoteDescription 설정 전 보관)
→ pc.ontrack → video.srcObject = remoteStream
```

### 업적 체크 흐름
```
트리거 (세션 저장 / 할 일 완료 / 채팅 등)
→ AchievementService.checkAndAward(userId, trigger)
→ switch(trigger) → 해당 조건 SQL 쿼리
→ tryAward() : hasAchievement() → award() (INSERT IGNORE)
→ 신규 획득 목록 반환 → 컨트롤러 응답에 포함
→ 프론트 showAchievementToasts() → 토스트 큐 처리
```

---

## 6. 데이터베이스 테이블 관계

```
users (1)
├──< sessions       (N) : 공부 세션
├──< todos          (N) : 할 일
├──< ddays          (N) : D-Day
├──< timetable_blocks (N) : 타임블록
├──< user_achievements (N) >── achievements (마스터)
├──  user_stats     (1:1) : 채팅 카운트
├──< study_groups   (N)  : leader_id 참조
└──< group_members  (N:M) >── study_groups

contacts  (독립 — users FK 없음)
notices   (독립 — users FK 없음)
```

---

## 7. 발견된 개선 포인트

> 구현상 문제는 없으나 향후 유지보수·확장 시 참고할 사항들.

### 데이터베이스
- 자주 조회되는 컬럼에 인덱스 없음
  - `sessions.user_id`, `todos.(user_id, todo_date)`, `group_members.user_id`
- `focus_rate` 타입이 `DOUBLE` → 정밀 계산이 필요하면 `DECIMAL(5,2)` 권장

### 백엔드
- `isAdmin()` 메서드가 여러 컨트롤러에 중복 → `@ControllerAdvice` 또는 인터셉터로 통일 가능
- `AchievementServiceImpl`의 `catch (Exception e)` — 업적 오류가 메인 흐름을 방해하지 않도록 의도된 설계이나 로그는 남기는 것이 좋음
- 단위 테스트 미작성 (WatchmanApplicationTests.java만 존재)
- WebSocket 엔드포인트에 그룹 멤버십 검증 없음

### 프론트엔드
- `parseInt(value)` 호출 시 기수(radix) 명시 누락 부분 있음 → `parseInt(value, 10)` 권장
- 아바타를 `MEDIUMTEXT`에 Base64로 저장 — 용량 클 경우 외부 스토리지 고려

### 운영
- `application.properties`의 로그 레벨이 `DEBUG` → 운영 환경에서는 `INFO` 또는 `WARN` 권장
- 초기 admin 비밀번호(`admin1234!`)는 배포 전 반드시 변경 필요

---

## 8. 보안 현황

| 항목 | 상태 |
|------|------|
| 비밀번호 BCrypt 해싱 | ✅ 적용 |
| SQL Injection 방지 | ✅ JdbcTemplate 파라미터 바인딩 |
| XSS 방지 | ✅ `escHtml()` 함수 일관 적용 |
| CSRF | ⚠️ SameSite 쿠키 의존 (Spring Security 미사용) |
| HTTPS | ⚠️ 별도 설정 필요 (배포 시) |
| WebSocket 인증 | ⚠️ StudyRoomController 인증 없음 |
| 브루트포스 방어 | ⚠️ Rate limiting 없음 |
| 아바타 XSS | ⚠️ Data URL 검증 없음 |
