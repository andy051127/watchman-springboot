# Watchman 구현 기능 목록

> **작성 안내**: 각 기능의 "구현 담당자" 항목은 팀원 이름으로 직접 채워 주세요.

---

## 1. 회원 인증 (로그인 / 회원가입 / 로그아웃)

**설명**
이메일·비밀번호 기반 회원가입 및 로그인. 비밀번호는 BCrypt로 해싱하여 저장한다. 로그인 성공 시 서버 세션에 `userId`를 저장하고, 이후 모든 API 요청에서 세션으로 인증을 확인한다. "로그인 상태 유지" 선택 시 30일 영구 쿠키를 발급한다.

**핵심 코드**
```java
// UserServiceImpl.java — 로그인
@Override
public User login(String email, String password) {
    try {
        User user = this.userRepository.findByEmail(email);
        if (this.passwordEncoder.matches(password, user.getPassword())) {
            return user;
        }
        return null;
    } catch (EmptyResultDataAccessException e) {
        return null;
    }
}

// UserServiceImpl.java — 회원가입 (BCrypt 해싱)
@Override
public void register(User user) {
    try {
        this.userRepository.findByEmail(user.getEmail());
        throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
    } catch (EmptyResultDataAccessException e) {
        user.setPassword(this.passwordEncoder.encode(user.getPassword()));
        this.userRepository.save(user);
    }
}
```

**관련 파일**
- `AuthController.java` — POST /api/auth/login, /register, /logout
- `UserServiceImpl.java`
- `PasswordEncoderConfig.java` — BCryptPasswordEncoder Bean

**구현 담당자**: _(팀원 이름)_

---

## 2. 마이페이지 (프로필 수정)

**설명**
닉네임·비밀번호·아바타(이모지 또는 이미지 업로드) 변경, 회원 탈퇴 기능을 제공한다. 비밀번호 변경 및 탈퇴 시 현재 비밀번호 확인을 거친다. 아바타는 Base64 Data URL로 저장된다.

**핵심 코드**
```java
// UserServiceImpl.java — 비밀번호 변경
@Override
public void updatePassword(Long userId, String currentPassword, String newPassword) {
    User user = this.userRepository.findById(userId);
    if (!this.passwordEncoder.matches(currentPassword, user.getPassword())) {
        throw new IllegalArgumentException("현재 비밀번호가 일치하지 않습니다.");
    }
    this.userRepository.updatePassword(userId, this.passwordEncoder.encode(newPassword));
}
```

**관련 파일**
- `UserController.java` — GET /api/users/me, PATCH nickname/password/avatar, DELETE
- `mypage.html` / `mypage.js`

**구현 담당자**: _(팀원 이름)_

---

## 3. 솔로 공부 세션 (얼굴 감지 집중 추적)

**설명**
카메라를 통해 MediaPipe FaceLandmarker(478 랜드마크)로 얼굴 방향을 실시간 감지하고 집중/딴짓 상태를 판정한다. 딴짓 감지 시 화면 빨간 오버레이로 경고한다. 세션 종료 시 집중 시간·딴짓 시간·집중률을 서버에 저장한다. 세션 이어하기(기존 세션 누적 저장)를 지원한다.

**핵심 코드**
```javascript
// study-session.js — 고개 각도 계산
function computeHeadAngles(landmarks) {
    const faceCenterX = (landmarks[234].x + landmarks[454].x) / 2;
    const faceHalfW   = Math.abs(landmarks[454].x - landmarks[234].x) / 2;
    const yaw = Math.asin(Math.max(-1, Math.min(1,
        faceHalfW > 0 ? (landmarks[4].x - faceCenterX) / faceHalfW : 0
    ))) * (180 / Math.PI);
    // pitch 계산 생략...
    return { yaw, pitch };
}

// rAF 기반 감지 루프 — 루프 절대 끊기지 않도록 최상단에 rAF 등록
function detect(ts) {
    detectionRafId = requestAnimationFrame(detect);
    const video = document.getElementById(`webcam-video`);
    if (!faceLandmarker || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return;
    if (ts - lastDetectTime < 50) return; // 50ms throttle (~20fps)
    // ...감지 및 상태 판정
}
```

```java
// SessionServiceImpl.java — 집중률 계산 후 저장
private BigDecimal calcFocusRate(int focusedTime, int distractedTime) {
    int total = focusedTime + distractedTime;
    if (total == 0) return BigDecimal.ZERO;
    return BigDecimal.valueOf(focusedTime)
            .divide(BigDecimal.valueOf(total), 4, RoundingMode.HALF_UP)
            .multiply(BigDecimal.valueOf(100))
            .setScale(2, RoundingMode.HALF_UP);
}
```

**관련 파일**
- `study-session.html` / `study-session.js` / `study-session.css`
- `session-picker.html` / `session-picker.js` / `session-picker.css`
- `SessionController.java`, `SessionServiceImpl.java`, `SessionRepositoryImpl.java`

**구현 담당자**: _(팀원 이름)_

---

## 4. 플래너 (할 일 / D-Day / 타임테이블)

**설명**
달력 뷰에서 날짜를 선택하면 노트북 뷰로 전환된다. 노트북은 세 섹션으로 구성: ① 할 일 체크리스트, ② D-Day 카운트다운 관리, ③ 타임테이블 — 24시간 × 12셀(5분 단위) 그리드를 엑셀처럼 드래그해 블록을 생성한다.

**핵심 코드**
```javascript
// planner.js — 타임테이블 드래그 선택 (수직 그리드)
function initGridDrag() {
    wrap.addEventListener('mousedown', e => {
        if (e.target.closest('.tt-block')) return;
        dragActive   = true;
        dragStartMin = parseInt(e.target.closest('.tt-cell').dataset.min);
    });
    document.addEventListener('mousemove', e => {
        if (!dragActive) return;
        dragEndMin = getMinFromCell(e);
        applySelectHighlight(dragStartMin, dragEndMin); // 셀 하이라이트
    });
    document.addEventListener('mouseup', () => {
        openNewBlockModal(Math.min(dragStartMin, dragEndMin),
                          Math.max(dragStartMin, dragEndMin) + 5);
    });
}
```

**관련 파일**
- `planner.html` / `planner.js` / `planner.css`
- `PlannerController.java`, `PlannerServiceImpl.java`, `PlannerRepositoryImpl.java`
- DB: `todos`, `ddays`, `timetable_blocks`

**구현 담당자**: _(팀원 이름)_

---

## 5. 공부 통계

**설명**
오늘·이번 주·전체 세션 기록을 조회해 총 공부시간, 평균 집중률, 연속 공부 일수, 주간 바 차트 등 통계를 시각화한다.

**핵심 코드**
```java
// SessionRepositoryImpl.java — 최근 7일 세션
@Override
public List<Session> findWeekByUserId(Long userId) {
    String sql = "SELECT session_id, user_id, name, focused_time, distracted_time, " +
                 "focus_rate, started_at FROM sessions " +
                 "WHERE user_id = ? AND started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
    return this.template.query(sql,
        BeanPropertyRowMapper.newInstance(Session.class), userId);
}
```

**관련 파일**
- `stats.html` / `stats.js` / `stats.css`
- `SessionController.java` — GET /api/sessions/today, /week, /recent

**구현 담당자**: _(팀원 이름)_

---

## 6. 스터디 그룹 (생성 / 참여 / 관리)

**설명**
6자리 영숫자 초대 코드로 그룹을 생성하거나 참여한다. 그룹 상세 페이지에서 멤버 목록, 누적 공부 시간·집중률 랭킹을 확인할 수 있다. 방장은 멤버 강퇴 및 그룹 폐쇄 권한을 가진다.

**핵심 코드**
```java
// StudyGroupServiceImpl.java — 그룹 생성 + 초대코드 생성
@Override
@Transactional
public StudyGroup createGroup(String name, String description, Long leaderId) {
    StudyGroup group = new StudyGroup();
    group.setName(name);
    group.setDescription(description);
    group.setLeaderId(leaderId);
    group.setInviteCode(generateInviteCode());

    Long groupId = studyGroupRepository.saveGroup(group);
    studyGroupRepository.addMember(groupId, leaderId);
    return studyGroupRepository.findGroupById(groupId)
            .orElseThrow(() -> new IllegalStateException("그룹 생성 후 조회 실패"));
}

private String generateInviteCode() {
    String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    StringBuilder sb = new StringBuilder(6);
    for (int i = 0; i < 6; i++) sb.append(chars.charAt(RANDOM.nextInt(chars.length())));
    return sb.toString();
}
```

**관련 파일**
- `study-group.html` / `study-group.js`
- `study-group-info.html` / `study-group-info.js`
- `StudyGroupController.java`, `StudyGroupServiceImpl.java`, `StudyGroupRepositoryImpl.java`
- DB: `study_groups`, `group_members`

**구현 담당자**: _(팀원 이름)_

---

## 7. 그룹 스터디룸 (WebRTC + WebSocket)

**설명**
WebSocket(STOMP)으로 입장·퇴장·집중상태·채팅을 실시간 동기화하고, WebRTC Full Mesh P2P로 참가자 카메라 영상을 상호 전달한다. MediaPipe로 내 집중 상태를 감지해 그룹 전체에 브로드캐스트한다. 딴짓 감지 시 화면 빨간 오버레이 표시.

**핵심 코드**
```java
// StudyRoomController.java — 채팅 브로드캐스트 + 카운트 증가
@MessageMapping("/room/{groupId}/chat")
public void handleChat(@DestinationVariable Long groupId,
                       @Payload Map<String, Object> payload) {
    messagingTemplate.convertAndSend("/topic/room/" + groupId + "/chat", payload);
    Object userIdObj = payload.get("userId");
    if (userIdObj != null) {
        achievementRepository.incrementChatCount(((Number) userIdObj).longValue());
    }
}
```

```javascript
// study-group-session.js — WebRTC offer 전송 (신규 참가자 화면 공유)
async function initiateOffer(remoteUserId) {
    const pc = createPC(remoteUserId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    stompClient.send(`/app/room/${groupId}/signal`, {},
        JSON.stringify({ from: myUserId, to: remoteUserId,
                         type: 'offer', data: offer,
                         fromNickname: myNickname, fromAvatar: myAvatar }));
}
```

**관련 파일**
- `study-group-session.html` / `study-group-session.js` / `study-group-session.css`
- `StudyRoomController.java`, `WebSocketConfig.java`

**구현 담당자**: _(팀원 이름)_

---

## 8. 공지사항

**설명**
관리자가 공지를 작성·수정·삭제한다. 태그(공지·이벤트·점검·업데이트) 분류와 상단 고정 기능을 지원한다. 일반 사용자는 읽기만 가능하다.

**핵심 코드**
```java
// NoticeController.java — 공지 목록 (고정 공지 우선 정렬)
@GetMapping("/api/notices")
public ResponseEntity<?> getNotices() {
    return ResponseEntity.ok(noticeService.getAll());
}
// NoticeRepositoryImpl — ORDER BY pinned DESC, created_at DESC
```

**관련 파일**
- `notice.html` / `notice.js`
- `NoticeController.java`, `NoticeServiceImpl.java`
- DB: `notices`

**구현 담당자**: _(팀원 이름)_

---

## 9. 문의하기 (접수 / 답변 확인)

**설명**
비로그인 사용자도 문의를 접수할 수 있다. 문의 시 입력한 이메일로 접수 내역과 관리자 답변을 조회할 수 있다.

**핵심 코드**
```java
// AdminController.java — 관리자 답변 등록
@PostMapping("/api/admin/contacts/{id}/reply")
public ResponseEntity<?> replyContact(@PathVariable Long id,
                                      @RequestBody Map<String, String> body,
                                      HttpSession session) {
    if (!isAdmin(session)) return ResponseEntity.status(401)...;
    this.contactService.reply(id, body.get("replyContent").trim());
    return ResponseEntity.ok(Map.of("message", "답변이 등록되었습니다."));
}

// ContactRepositoryImpl.java — 답변 저장
@Override
public void reply(Long contactId, String replyContent) {
    String sql = "UPDATE contacts SET reply_content = ?, replied_at = NOW(), " +
                 "status = 'answered' WHERE contact_id = ?";
    this.template.update(sql, replyContent, contactId);
}
```

**관련 파일**
- `contact.html`
- `AdminController.java`, `ContactServiceImpl.java`, `ContactRepositoryImpl.java`
- DB: `contacts`

**구현 담당자**: _(팀원 이름)_

---

## 10. 관리자 페이지

**설명**
별도 로그인 화면에서 관리자 계정(`is_admin = 1`)으로 인증 후 접근. 문의 관리(목록·답변·삭제), 사용자 관리(목록·권한 변경·삭제), 공지사항 관리(작성·수정·삭제) 기능을 제공한다.

**핵심 코드**
```java
// AdminController.java — 관리자 권한 확인
private boolean isAdmin(HttpSession session) {
    Long userId = (Long) session.getAttribute("userId");
    if (userId == null) return false;
    try {
        User user = this.userService.getUser(userId);
        return user.getIsAdmin() == 1;
    } catch (Exception e) {
        return false;
    }
}
```

**관련 파일**
- `admin.html` / `admin.css`
- `AdminController.java`

**구현 담당자**: _(팀원 이름)_

---

## 11. 업적 시스템

**설명**
공부시간·집중률·연속출석·그룹·플래너·이스터에그 6개 카테고리의 업적 30개를 제공한다. 각 트리거(세션 저장, 할 일 완료, D-Day 추가 등) 시점에 조건을 확인해 신규 획득 업적을 즉시 토스트 알림으로 표시한다. 이스터에그 업적은 달성 전까지 조건이 숨겨진다.

**핵심 코드**
```java
// AchievementServiceImpl.java — 업적 체크 핵심 패턴
private void tryAward(Long userId, String achievementId,
                      List<Achievement> out, Condition condition) {
    if (achievementRepository.hasAchievement(userId, achievementId)) return;
    try {
        if (condition.check()) {
            achievementRepository.award(userId, achievementId); // INSERT IGNORE
            // 신규 획득 시 Achievement 객체를 응답에 포함
            out.add(/* DB에서 조회한 Achievement */);
        }
    } catch (Exception e) { /* 업적 오류가 메인 흐름을 방해하지 않도록 */ }
}
```

```javascript
// achievement-toast.js — 토스트 큐 처리
function showAchievementToasts(achievements) {
    achievements.forEach(a => _toastQueue.push(a));
    if (!_toastRunning) _runToastQueue();
}
```

**관련 파일**
- `achievements.html` / `achievements.js` / `achievements.css`
- `achievement-toast.js`
- `AchievementController.java`, `AchievementServiceImpl.java`, `AchievementRepositoryImpl.java`
- DB: `achievements`, `user_achievements`, `user_stats`

**구현 담당자**: _(팀원 이름)_

---

## 12. 다크모드

**설명**
nav 우측 토글 스위치로 라이트/다크 모드를 전환한다. `body.dark` 클래스를 토글해 CSS 변수를 오버라이드하는 방식으로 구현했다. `localStorage`에 설정을 저장해 새로고침·재방문 시에도 유지된다. 깜빡임 방지를 위해 nav 주입 전 즉시 적용한다.

**핵심 코드**
```javascript
// nav.js — 페이지 로드 즉시 적용 (깜빡임 방지)
(function () {
    if (localStorage.getItem('watchman-theme') === 'dark') {
        document.body.classList.add('dark');
    }
})();

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('watchman-theme', isDark ? 'dark' : 'light');
}
```

```css
/* global.css — 다크모드 CSS 변수 오버라이드 */
body.dark {
    --bg: #0f0f0f;
    --bg-white: #1a1a1a;
    --text: #e2e8f0;
    --border: #2a2a2a;
    /* ... */
}
```

**관련 파일**
- `nav.js` — 토글 로직
- `global.css` — `body.dark` 변수 오버라이드
- `main.css` — 토글 스위치 UI

**구현 담당자**: _(팀원 이름)_

---

## 13. 실시간 접속자 수 표시

**설명**
랜딩 페이지 하단에 현재 공부 중인 사용자 수를 실시간으로 표시한다. 공부 세션 진입 시 30초마다 heartbeat를 전송하고, 세션 종료 시 즉시 제거한다. TTL 60초로 비정상 종료도 자동 만료된다. 랜딩 페이지에서 30초마다 폴링하며 숫자 변경 시 애니메이션으로 전환한다.

**핵심 코드**
```java
// ActiveUserTracker.java
@Component
public class ActiveUserTracker {
    private static final long TTL_MS = 60_000L;
    private final Map<String, Long> sessions = new ConcurrentHashMap<>();

    public void ping(String key)  { sessions.put(key, System.currentTimeMillis()); }
    public void remove(String key){ sessions.remove(key); }

    public int getActiveCount() {
        long cutoff = System.currentTimeMillis() - TTL_MS;
        sessions.entrySet().removeIf(e -> e.getValue() < cutoff);
        return sessions.size();
    }
}
```

```javascript
// index.html — 30초마다 폴링 + 숫자 애니메이션
async function fetchCount() {
    const res  = await fetch('/watchman/api/stats/active');
    const data = await res.json();
    const shown = data.count + 312; // 베이스값 + 실제 접속자
    if (shown !== displayed) animateTo(shown);
}
setInterval(fetchCount, 30000);
```

**관련 파일**
- `index.html` — 폴링·애니메이션
- `StatsController.java` — GET /api/stats/active, POST /ping, /leave
- `ActiveUserTracker.java`

**구현 담당자**: _(팀원 이름)_
