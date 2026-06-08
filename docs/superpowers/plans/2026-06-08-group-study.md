# 그룹 스터디 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실시간 화상(WebRTC) + 집중 상태 + 채팅이 가능한 그룹 스터디 기능을 3개 페이지로 구현한다.

**Architecture:** Spring WebSocket(STOMP)이 채팅·집중상태·WebRTC 시그널링 4채널을 처리한다. WebRTC P2P 풀메시(full mesh)로 영상을 직접 연결하며 서버는 시그널링 중개만 담당한다. 기존 `study_groups`, `group_members`, `sessions` 테이블을 재사용한다.

**Tech Stack:** Spring WebSocket (STOMP, SockJS), WebRTC (브라우저 네이티브), stomp.js v2 + SockJS v1 (CDN), MediaPipe FaceLandmarker (CDN), JdbcTemplate

---

## File Map

| 상태 | 파일 | 역할 |
|------|------|------|
| 신규 | `src/main/java/com/watchman/config/WebSocketConfig.java` | STOMP 엔드포인트·브로커 설정 |
| 신규 | `src/main/java/com/watchman/controller/StudyRoomController.java` | STOMP 메시지 핸들러 (4채널 브로드캐스트) |
| 신규 | `src/main/java/com/watchman/domain/StudyGroup.java` | 그룹 도메인 |
| 신규 | `src/main/java/com/watchman/domain/StudyGroupMember.java` | 멤버 도메인 |
| 신규 | `src/main/java/com/watchman/repository/StudyGroupRepository.java` | 그룹 리포지토리 인터페이스 |
| 신규 | `src/main/java/com/watchman/repository/StudyGroupRepositoryImpl.java` | JdbcTemplate 구현 |
| 신규 | `src/main/java/com/watchman/service/StudyGroupService.java` | 그룹 서비스 인터페이스 |
| 신규 | `src/main/java/com/watchman/service/StudyGroupServiceImpl.java` | 서비스 구현 |
| 신규 | `src/main/java/com/watchman/controller/StudyGroupController.java` | REST CRUD 엔드포인트 |
| 수정 | `src/main/resources/static/study-group.html` | 패널-detail 제거, 카드 클릭 시 study-group-info.html로 이동 |
| 수정 | `src/main/resources/static/js/study-group.js` | openDetail() → 페이지 이동으로 교체 |
| 신규 | `src/main/resources/static/study-group-info.html` | 그룹 상세 페이지 |
| 신규 | `src/main/resources/static/js/study-group-info.js` | 그룹 상세 JS |
| 신규 | `src/main/resources/static/study-group-session.html` | 실시간 세션 페이지 |
| 신규 | `src/main/resources/static/css/study-group-session.css` | 세션 페이지 전용 스타일 |
| 신규 | `src/main/resources/static/js/study-group-session.js` | WebRTC + STOMP + MediaPipe 통합 |

---

## Task 1: WebSocket 인프라 (WebSocketConfig + StudyRoomController)

**Files:**
- Create: `src/main/java/com/watchman/config/WebSocketConfig.java`
- Create: `src/main/java/com/watchman/controller/StudyRoomController.java`

- [ ] **Step 1: WebSocketConfig 생성**

```java
// src/main/java/com/watchman/config/WebSocketConfig.java
package com.watchman.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").withSockJS();
    }
}
```

- [ ] **Step 2: StudyRoomController 생성**

```java
// src/main/java/com/watchman/controller/StudyRoomController.java
package com.watchman.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
public class StudyRoomController {

    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    public void setMessagingTemplate(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    // 입장 / 퇴장 브로드캐스트
    // Client sends to: /app/room/{groupId}/join  or  /app/room/{groupId}/leave
    // Server broadcasts to: /topic/room/{groupId}/presence
    @MessageMapping("/room/{groupId}/join")
    public void handleJoin(@DestinationVariable Long groupId, @Payload Map<String, Object> payload) {
        payload.put("action", "join");
        messagingTemplate.convertAndSend("/topic/room/" + groupId + "/presence", payload);
    }

    @MessageMapping("/room/{groupId}/leave")
    public void handleLeave(@DestinationVariable Long groupId, @Payload Map<String, Object> payload) {
        payload.put("action", "leave");
        messagingTemplate.convertAndSend("/topic/room/" + groupId + "/presence", payload);
    }

    // 집중/딴짓 상태 브로드캐스트
    // Client sends to: /app/room/{groupId}/focus
    // Payload: { userId, focused: true/false }
    @MessageMapping("/room/{groupId}/focus")
    public void handleFocus(@DestinationVariable Long groupId, @Payload Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/room/" + groupId + "/focus", payload);
    }

    // 채팅 메시지 브로드캐스트
    // Client sends to: /app/room/{groupId}/chat
    // Payload: { userId, nickname, avatar, message, timestamp }
    @MessageMapping("/room/{groupId}/chat")
    public void handleChat(@DestinationVariable Long groupId, @Payload Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/room/" + groupId + "/chat", payload);
    }

    // WebRTC 시그널링 브로드캐스트 (클라이언트가 to 필드로 필터링)
    // Client sends to: /app/room/{groupId}/signal
    // Payload: { from, to, type: "offer"/"answer"/"ice", data }
    @MessageMapping("/room/{groupId}/signal")
    public void handleSignal(@DestinationVariable Long groupId, @Payload Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/room/" + groupId + "/signal", payload);
    }
}
```

- [ ] **Step 3: 앱 빌드 확인**

```bash
cd C:/watchman-springboot
mvnw.cmd spring-boot:run
```
Expected: 앱이 정상 시작되고 `http://localhost:8080/watchman` 접속 가능. 오류 없음.

- [ ] **Step 4: WebSocket 엔드포인트 확인**

브라우저 콘솔에서:
```javascript
const sock = new SockJS('http://localhost:8080/watchman/ws');
// Expected: SockJS 연결 오브젝트 생성, 에러 없음
```

- [ ] **Step 5: 커밋**

```bash
git add src/main/java/com/watchman/config/WebSocketConfig.java
git add src/main/java/com/watchman/controller/StudyRoomController.java
git commit -m "feat: STOMP WebSocket 인프라 및 스터디룸 메시지 핸들러 추가"
```

---

## Task 2: StudyGroup 도메인 클래스

**Files:**
- Create: `src/main/java/com/watchman/domain/StudyGroup.java`
- Create: `src/main/java/com/watchman/domain/StudyGroupMember.java`

- [ ] **Step 1: StudyGroupMember 도메인 생성**

```java
// src/main/java/com/watchman/domain/StudyGroupMember.java
package com.watchman.domain;

import com.fasterxml.jackson.annotation.JsonProperty;

public class StudyGroupMember {

    private Long userId;
    private String nickname;
    private String avatar;
    private boolean isLeader;   // Jackson: getIsLeader() → "isLeader" 직렬화
    private int totalTime;       // focused_time + distracted_time 합계 (초)
    private double focusRate;    // 평균 집중률 (%)

    public StudyGroupMember() {}

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }

    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }

    @JsonProperty("isLeader")
    public boolean getIsLeader() { return isLeader; }
    public void setIsLeader(boolean isLeader) { this.isLeader = isLeader; }

    public int getTotalTime() { return totalTime; }
    public void setTotalTime(int totalTime) { this.totalTime = totalTime; }

    public double getFocusRate() { return focusRate; }
    public void setFocusRate(double focusRate) { this.focusRate = focusRate; }
}
```

- [ ] **Step 2: StudyGroup 도메인 생성**

```java
// src/main/java/com/watchman/domain/StudyGroup.java
package com.watchman.domain;

import java.time.LocalDateTime;
import java.util.List;

public class StudyGroup {

    private Long groupId;
    private String name;
    private String description;
    private String inviteCode;
    private Long leaderId;
    private LocalDateTime createdAt;
    private List<StudyGroupMember> members;

    public StudyGroup() {}

    public Long getGroupId() { return groupId; }
    public void setGroupId(Long groupId) { this.groupId = groupId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getInviteCode() { return inviteCode; }
    public void setInviteCode(String inviteCode) { this.inviteCode = inviteCode; }

    public Long getLeaderId() { return leaderId; }
    public void setLeaderId(Long leaderId) { this.leaderId = leaderId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public List<StudyGroupMember> getMembers() { return members; }
    public void setMembers(List<StudyGroupMember> members) { this.members = members; }
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/main/java/com/watchman/domain/StudyGroup.java
git add src/main/java/com/watchman/domain/StudyGroupMember.java
git commit -m "feat: StudyGroup, StudyGroupMember 도메인 클래스 추가"
```

---

## Task 3: StudyGroupRepository

**Files:**
- Create: `src/main/java/com/watchman/repository/StudyGroupRepository.java`
- Create: `src/main/java/com/watchman/repository/StudyGroupRepositoryImpl.java`

- [ ] **Step 1: 인터페이스 생성**

```java
// src/main/java/com/watchman/repository/StudyGroupRepository.java
package com.watchman.repository;

import com.watchman.domain.StudyGroup;

import java.util.List;
import java.util.Optional;

public interface StudyGroupRepository {

    // 내가 속한 그룹 목록 (멤버 포함)
    List<StudyGroup> findGroupsByUserId(Long userId);

    // 특정 그룹 상세 (멤버 포함)
    Optional<StudyGroup> findGroupById(Long groupId);

    // 초대코드로 그룹 조회
    Optional<StudyGroup> findByInviteCode(String inviteCode);

    // 그룹 생성 — 생성된 group_id 반환
    Long saveGroup(StudyGroup group);

    // 멤버 추가
    void addMember(Long groupId, Long userId);

    // 멤버 제거 (나가기 / 강퇴)
    void removeMember(Long groupId, Long userId);

    // 그룹 삭제 (CASCADE로 group_members 자동 삭제)
    void deleteGroup(Long groupId);

    // 멤버 여부 확인
    boolean existsMember(Long groupId, Long userId);

    // 방장 여부 확인
    boolean isLeader(Long groupId, Long userId);
}
```

- [ ] **Step 2: Impl 생성**

```java
// src/main/java/com/watchman/repository/StudyGroupRepositoryImpl.java
package com.watchman.repository;

import com.watchman.domain.StudyGroup;
import com.watchman.domain.StudyGroupMember;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

@Repository
public class StudyGroupRepositoryImpl implements StudyGroupRepository {

    private JdbcTemplate template;

    @Autowired
    public void setJdbcTemplate(JdbcTemplate template) {
        this.template = template;
    }

    // ── 멤버 목록 조회 (공통 헬퍼) ──────────────────────────────────────
    private List<StudyGroupMember> fetchMembers(Long groupId, Long leaderId) {
        String sql =
            "SELECT u.user_id, u.nickname, u.avatar, " +
            "       COALESCE(SUM(s.focused_time + s.distracted_time), 0) AS total_time, " +
            "       COALESCE(AVG(s.focus_rate), 0.0) AS focus_rate " +
            "FROM group_members gm " +
            "JOIN users u ON u.user_id = gm.user_id " +
            "LEFT JOIN sessions s ON s.user_id = gm.user_id " +
            "WHERE gm.group_id = ? " +
            "GROUP BY u.user_id, u.nickname, u.avatar " +
            "ORDER BY total_time DESC";

        return template.query(sql, (rs, row) -> {
            StudyGroupMember m = new StudyGroupMember();
            m.setUserId(rs.getLong("user_id"));
            m.setNickname(rs.getString("nickname"));
            m.setAvatar(rs.getString("avatar"));
            m.setIsLeader(rs.getLong("user_id") == leaderId);
            m.setTotalTime(rs.getInt("total_time"));
            m.setFocusRate(rs.getDouble("focus_rate"));
            return m;
        }, groupId);
    }

    // ── 그룹 RowMapper ──────────────────────────────────────────────────
    private StudyGroup mapGroup(java.sql.ResultSet rs) throws java.sql.SQLException {
        StudyGroup g = new StudyGroup();
        g.setGroupId(rs.getLong("group_id"));
        g.setName(rs.getString("name"));
        g.setDescription(rs.getString("description"));
        g.setInviteCode(rs.getString("invite_code"));
        g.setLeaderId(rs.getLong("leader_id"));
        Timestamp ts = rs.getTimestamp("created_at");
        if (ts != null) g.setCreatedAt(ts.toLocalDateTime());
        return g;
    }

    @Override
    public List<StudyGroup> findGroupsByUserId(Long userId) {
        String sql =
            "SELECT sg.group_id, sg.name, sg.description, sg.invite_code, sg.leader_id, sg.created_at " +
            "FROM study_groups sg " +
            "JOIN group_members gm ON sg.group_id = gm.group_id " +
            "WHERE gm.user_id = ? ORDER BY sg.created_at DESC";

        List<StudyGroup> groups = template.query(sql, (rs, row) -> mapGroup(rs), userId);
        for (StudyGroup g : groups) {
            g.setMembers(fetchMembers(g.getGroupId(), g.getLeaderId()));
        }
        return groups;
    }

    @Override
    public Optional<StudyGroup> findGroupById(Long groupId) {
        String sql =
            "SELECT group_id, name, description, invite_code, leader_id, created_at " +
            "FROM study_groups WHERE group_id = ?";

        List<StudyGroup> list = template.query(sql, (rs, row) -> mapGroup(rs), groupId);
        if (list.isEmpty()) return Optional.empty();

        StudyGroup g = list.get(0);
        g.setMembers(fetchMembers(g.getGroupId(), g.getLeaderId()));
        return Optional.of(g);
    }

    @Override
    public Optional<StudyGroup> findByInviteCode(String inviteCode) {
        String sql =
            "SELECT group_id, name, description, invite_code, leader_id, created_at " +
            "FROM study_groups WHERE invite_code = ?";

        List<StudyGroup> list = template.query(sql, (rs, row) -> mapGroup(rs), inviteCode);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    @Override
    public Long saveGroup(StudyGroup group) {
        String sql = "INSERT INTO study_groups (name, description, invite_code, leader_id) VALUES (?, ?, ?, ?)";
        KeyHolder keyHolder = new GeneratedKeyHolder();
        template.update(con -> {
            PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, group.getName());
            ps.setString(2, group.getDescription());
            ps.setString(3, group.getInviteCode());
            ps.setLong(4, group.getLeaderId());
            return ps;
        }, keyHolder);
        return keyHolder.getKey().longValue();
    }

    @Override
    public void addMember(Long groupId, Long userId) {
        template.update("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)", groupId, userId);
    }

    @Override
    public void removeMember(Long groupId, Long userId) {
        template.update("DELETE FROM group_members WHERE group_id = ? AND user_id = ?", groupId, userId);
    }

    @Override
    public void deleteGroup(Long groupId) {
        template.update("DELETE FROM study_groups WHERE group_id = ?", groupId);
    }

    @Override
    public boolean existsMember(Long groupId, Long userId) {
        Integer count = template.queryForObject(
            "SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?",
            Integer.class, groupId, userId);
        return count != null && count > 0;
    }

    @Override
    public boolean isLeader(Long groupId, Long userId) {
        Integer count = template.queryForObject(
            "SELECT COUNT(*) FROM study_groups WHERE group_id = ? AND leader_id = ?",
            Integer.class, groupId, userId);
        return count != null && count > 0;
    }
}
```

- [ ] **Step 3: 빌드 확인**

```bash
mvnw.cmd spring-boot:run
```
Expected: 오류 없이 정상 시작.

- [ ] **Step 4: 커밋**

```bash
git add src/main/java/com/watchman/repository/StudyGroupRepository.java
git add src/main/java/com/watchman/repository/StudyGroupRepositoryImpl.java
git commit -m "feat: StudyGroupRepository 추가 (JdbcTemplate)"
```

---

## Task 4: StudyGroupService

**Files:**
- Create: `src/main/java/com/watchman/service/StudyGroupService.java`
- Create: `src/main/java/com/watchman/service/StudyGroupServiceImpl.java`

- [ ] **Step 1: 인터페이스 생성**

```java
// src/main/java/com/watchman/service/StudyGroupService.java
package com.watchman.service;

import com.watchman.domain.StudyGroup;

import java.util.List;

public interface StudyGroupService {

    // 내 그룹 목록
    List<StudyGroup> getMyGroups(Long userId);

    // 그룹 상세 (멤버가 아니면 예외)
    StudyGroup getGroup(Long groupId, Long userId);

    // 그룹 생성 (생성자는 자동 멤버 + 방장)
    StudyGroup createGroup(String name, String description, Long leaderId);

    // 초대코드로 참가 (중복 참가 / 존재하지 않는 코드 예외)
    void joinGroup(String inviteCode, Long userId);

    // 그룹 나가기 — 방장이면 예외 (방장은 disbandGroup 사용)
    void leaveGroup(Long groupId, Long userId);

    // 멤버 강퇴 (방장만 가능)
    void kickMember(Long groupId, Long leaderId, Long targetUserId);

    // 그룹 폐쇄 (방장만 가능)
    void disbandGroup(Long groupId, Long leaderId);
}
```

- [ ] **Step 2: Impl 생성**

```java
// src/main/java/com/watchman/service/StudyGroupServiceImpl.java
package com.watchman.service;

import com.watchman.domain.StudyGroup;
import com.watchman.repository.StudyGroupRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.List;

@Service
public class StudyGroupServiceImpl implements StudyGroupService {

    private StudyGroupRepository studyGroupRepository;

    @Autowired
    public void setStudyGroupRepository(StudyGroupRepository studyGroupRepository) {
        this.studyGroupRepository = studyGroupRepository;
    }

    @Override
    public List<StudyGroup> getMyGroups(Long userId) {
        return studyGroupRepository.findGroupsByUserId(userId);
    }

    @Override
    public StudyGroup getGroup(Long groupId, Long userId) {
        StudyGroup g = studyGroupRepository.findGroupById(groupId)
            .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 그룹입니다."));
        if (!studyGroupRepository.existsMember(groupId, userId)) {
            throw new IllegalStateException("그룹 멤버가 아닙니다.");
        }
        return g;
    }

    @Override
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

    @Override
    public void joinGroup(String inviteCode, Long userId) {
        StudyGroup g = studyGroupRepository.findByInviteCode(inviteCode)
            .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 초대 코드입니다."));

        if (studyGroupRepository.existsMember(g.getGroupId(), userId)) {
            throw new IllegalStateException("이미 참여 중인 그룹입니다.");
        }
        studyGroupRepository.addMember(g.getGroupId(), userId);
    }

    @Override
    public void leaveGroup(Long groupId, Long userId) {
        if (!studyGroupRepository.existsMember(groupId, userId)) {
            throw new IllegalStateException("그룹 멤버가 아닙니다.");
        }
        if (studyGroupRepository.isLeader(groupId, userId)) {
            throw new IllegalStateException("방장은 그룹을 나갈 수 없습니다. 그룹 폐쇄를 이용하세요.");
        }
        studyGroupRepository.removeMember(groupId, userId);
    }

    @Override
    public void kickMember(Long groupId, Long leaderId, Long targetUserId) {
        if (!studyGroupRepository.isLeader(groupId, leaderId)) {
            throw new IllegalStateException("방장만 강퇴할 수 있습니다.");
        }
        if (leaderId.equals(targetUserId)) {
            throw new IllegalArgumentException("자기 자신을 강퇴할 수 없습니다.");
        }
        if (!studyGroupRepository.existsMember(groupId, targetUserId)) {
            throw new IllegalArgumentException("해당 멤버가 그룹에 없습니다.");
        }
        studyGroupRepository.removeMember(groupId, targetUserId);
    }

    @Override
    public void disbandGroup(Long groupId, Long leaderId) {
        if (!studyGroupRepository.isLeader(groupId, leaderId)) {
            throw new IllegalStateException("방장만 그룹을 폐쇄할 수 있습니다.");
        }
        studyGroupRepository.deleteGroup(groupId);
    }

    // 6자리 영숫자 랜덤 초대코드 생성
    private String generateInviteCode() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(6);
        for (int i = 0; i < 6; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
```

- [ ] **Step 3: 빌드 확인**

```bash
mvnw.cmd spring-boot:run
```
Expected: 오류 없이 정상 시작.

- [ ] **Step 4: 커밋**

```bash
git add src/main/java/com/watchman/service/StudyGroupService.java
git add src/main/java/com/watchman/service/StudyGroupServiceImpl.java
git commit -m "feat: StudyGroupService 추가 (CRUD + 초대코드 생성)"
```

---

## Task 5: StudyGroupController (REST)

**Files:**
- Create: `src/main/java/com/watchman/controller/StudyGroupController.java`

- [ ] **Step 1: 컨트롤러 생성**

```java
// src/main/java/com/watchman/controller/StudyGroupController.java
package com.watchman.controller;

import com.watchman.domain.StudyGroup;
import com.watchman.service.StudyGroupService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/groups")
public class StudyGroupController {

    private StudyGroupService studyGroupService;

    @Autowired
    public void setStudyGroupService(StudyGroupService studyGroupService) {
        this.studyGroupService = studyGroupService;
    }

    private Long getUserId(HttpSession session) {
        return (Long) session.getAttribute("userId");
    }

    // GET /api/groups — 내 그룹 목록
    @GetMapping
    public ResponseEntity<?> getMyGroups(HttpSession session) {
        Long userId = getUserId(session);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        List<StudyGroup> groups = studyGroupService.getMyGroups(userId);
        return ResponseEntity.ok(groups);
    }

    // GET /api/groups/{groupId} — 그룹 상세
    @GetMapping("/{groupId}")
    public ResponseEntity<?> getGroup(@PathVariable Long groupId, HttpSession session) {
        Long userId = getUserId(session);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        try {
            StudyGroup group = studyGroupService.getGroup(groupId, userId);
            return ResponseEntity.ok(group);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        }
    }

    // POST /api/groups — 그룹 생성
    // body: { "name": "스터디이름", "description": "소개 (선택)" }
    @PostMapping
    public ResponseEntity<?> createGroup(@RequestBody Map<String, String> body, HttpSession session) {
        Long userId = getUserId(session);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));

        String name = body.get("name");
        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "그룹 이름을 입력해 주세요."));
        }
        StudyGroup group = studyGroupService.createGroup(name.trim(), body.get("description"), userId);
        return ResponseEntity.ok(group);
    }

    // POST /api/groups/join — 초대코드로 참가
    // body: { "inviteCode": "AB12CD" }
    @PostMapping("/join")
    public ResponseEntity<?> joinGroup(@RequestBody Map<String, String> body, HttpSession session) {
        Long userId = getUserId(session);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        try {
            studyGroupService.joinGroup(body.get("inviteCode"), userId);
            return ResponseEntity.ok(Map.of("message", "그룹에 참여했습니다."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // DELETE /api/groups/{groupId} — 그룹 폐쇄 (방장)
    @DeleteMapping("/{groupId}")
    public ResponseEntity<?> disbandGroup(@PathVariable Long groupId, HttpSession session) {
        Long userId = getUserId(session);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        try {
            studyGroupService.disbandGroup(groupId, userId);
            return ResponseEntity.ok(Map.of("message", "그룹이 폐쇄되었습니다."));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        }
    }

    // DELETE /api/groups/{groupId}/members/me — 그룹 나가기
    @DeleteMapping("/{groupId}/members/me")
    public ResponseEntity<?> leaveGroup(@PathVariable Long groupId, HttpSession session) {
        Long userId = getUserId(session);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        try {
            studyGroupService.leaveGroup(groupId, userId);
            return ResponseEntity.ok(Map.of("message", "그룹에서 나왔습니다."));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(400).body(Map.of("message", e.getMessage()));
        }
    }

    // DELETE /api/groups/{groupId}/members/{targetUserId} — 멤버 강퇴 (방장)
    @DeleteMapping("/{groupId}/members/{targetUserId}")
    public ResponseEntity<?> kickMember(@PathVariable Long groupId,
                                        @PathVariable Long targetUserId,
                                        HttpSession session) {
        Long userId = getUserId(session);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        try {
            studyGroupService.kickMember(groupId, userId, targetUserId);
            return ResponseEntity.ok(Map.of("message", "멤버를 강퇴했습니다."));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        }
    }
}
```

- [ ] **Step 2: 앱 시작 후 API 수동 테스트**

앱을 실행하고 브라우저에서 로그인 후 콘솔에서:
```javascript
// 그룹 목록 (빈 배열 예상)
fetch('/watchman/api/groups').then(r => r.json()).then(console.log)

// 그룹 생성
fetch('/watchman/api/groups', {
  method: 'POST',
  headers: {'Content-Type':'application/json'},
  body: JSON.stringify({name:'테스트 그룹', description:'설명'})
}).then(r => r.json()).then(console.log)
// Expected: { groupId, name, inviteCode, leaderId, members: [...] }

// 목록 재조회 — 방금 만든 그룹 등장
fetch('/watchman/api/groups').then(r => r.json()).then(console.log)
```

- [ ] **Step 3: 커밋**

```bash
git add src/main/java/com/watchman/controller/StudyGroupController.java
git commit -m "feat: StudyGroupController REST 엔드포인트 추가"
```

---

## Task 6: study-group.html / study-group.js 리팩토링

기존 파일의 패널-detail을 제거하고 카드 클릭 시 `study-group-info.html?groupId=xxx`로 이동한다.

**Files:**
- Modify: `src/main/resources/static/study-group.html`
- Modify: `src/main/resources/static/js/study-group.js`

- [ ] **Step 1: study-group.html에서 panel-detail 제거**

`study-group.html`에서 아래 블록(94~106행)을 삭제한다:

```html
  <!-- Panel: 그룹 상세 -->
  <div class="sg-page" id="panel-detail" style="display:none">
    <div class="sg-header">
      <button class="sg-back" onclick="showPanel('list')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        목록으로
      </button>
      <h1 class="sg-title" id="detail-group-name">그룹</h1>
      <div style="min-width:80px"></div>
    </div>
    <div class="sg-body" id="detail-body">
      <!-- JS로 채워짐 -->
    </div>
  </div>
```

- [ ] **Step 2: showPanel()에서 'detail' 제거**

`study-group.js`의 `showPanel` 함수를:
```javascript
function showPanel(name) {
  ['list', 'create', 'join'].forEach(p => {
    const el = document.getElementById(`panel-${p}`);
    if (el) el.style.display = p === name ? 'block' : 'none';
  });
  if (name === 'create') {
    document.getElementById('new-group-name').value = '';
    document.getElementById('new-group-desc').value = '';
    document.getElementById('create-msg').style.display = 'none';
  }
  if (name === 'join') {
    document.getElementById('join-code').value = '';
    document.getElementById('join-msg').style.display = 'none';
  }
}
```

- [ ] **Step 3: openDetail() → 페이지 이동으로 교체**

`study-group.js`에서 `openDetail` 함수 전체(99~178행)를 아래로 교체한다:

```javascript
function openDetail(groupId) {
  window.location.href = 'study-group-info.html?groupId=' + groupId;
}
```

- [ ] **Step 4: renderGroupList()에서 kickBtn 참조 제거**

`renderGroupList()` 내부의 `kickBtn` 관련 코드(`const kickBtn = ...`, `${kickBtn}`)를 삭제한다. 강퇴 기능은 `study-group-info.html`에서 처리한다.

`renderGroupList()`의 카드 HTML을 아래로 교체한다:
```javascript
  container.innerHTML = `<div class="sg-group-list">${groups.map(g => {
    const sorted = [...g.members].sort((a, b) => b.totalTime - a.totalTime);
    const myRank = sorted.findIndex(m => m.userId == myUserId) + 1;
    const totalGroupTime = g.members.reduce((a, m) => a + (m.totalTime || 0), 0);
    const amLeader = g.leaderId == myUserId;
    return `
      <div class="sg-group-card" onclick="openDetail(${g.groupId})">
        <div class="sg-group-card-top">
          <div class="sg-group-card-info">
            <div class="sg-group-card-name">${esc(g.name)}${amLeader ? '<span class="sg-leader-badge">그룹장</span>' : ''}</div>
            ${g.description ? `<div class="sg-group-card-desc">${esc(g.description)}</div>` : ''}
          </div>
          <svg class="sg-group-card-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
        <div class="sg-group-card-bottom">
          <div class="sg-group-chip"><span class="sg-chip-label">멤버</span><span class="sg-chip-value">${g.members.length}명</span></div>
          <div class="sg-group-chip"><span class="sg-chip-label">내 순위</span><span class="sg-chip-value">${myRank > 0 ? myRank + '위' : '-'}</span></div>
          <div class="sg-group-chip"><span class="sg-chip-label">그룹 총 공부</span><span class="sg-chip-value">${totalGroupTime > 0 ? fmtSec(totalGroupTime) : '-'}</span></div>
        </div>
      </div>`;
  }).join('')}</div>`;
```

- [ ] **Step 5: 불필요해진 selectedGroup 변수 및 함수들 제거**

`study-group.js`에서 아래를 삭제한다:
- `let selectedGroup = null;` (파일 상단)
- `kickMember` 함수 전체
- `handleLeave` 함수 전체
- `handleDisband` 함수 전체
- `copyCode` 함수 전체

(이 기능들은 `study-group-info.js`로 이동)

- [ ] **Step 6: 브라우저 테스트**

`http://localhost:8080/watchman/study-group.html` 접속 후:
- 그룹 목록 렌더링 확인
- 그룹 만들기 / 코드로 참여 패널 정상 동작 확인
- 그룹 카드 클릭 시 `study-group-info.html?groupId=xxx` 로 이동 확인

- [ ] **Step 7: 커밋**

```bash
git add src/main/resources/static/study-group.html
git add src/main/resources/static/js/study-group.js
git commit -m "refactor: study-group 상세 패널 제거, study-group-info 페이지로 이동"
```

---

## Task 7: study-group-info 페이지

**Files:**
- Create: `src/main/resources/static/study-group-info.html`
- Create: `src/main/resources/static/js/study-group-info.js`

- [ ] **Step 1: study-group-info.html 생성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>그룹 상세 — Watchman</title>
  <link rel="stylesheet" href="css/global.css" />
  <link rel="stylesheet" href="css/main.css" />
  <link rel="stylesheet" href="css/inner-pages.css" />
</head>
<body>
<div class="main-page">

  <div id="nav-root"></div>

  <div class="sg-page" id="sgi-page">
    <div class="sg-header">
      <button class="sg-back" onclick="history.back()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        목록으로
      </button>
      <h1 class="sg-title" id="sgi-group-name">그룹</h1>
      <div style="min-width:80px"></div>
    </div>
    <div class="sg-body" id="sgi-body">
      <div class="sg-empty"><p>불러오는 중...</p></div>
    </div>
  </div>

  <footer class="app-footer">
    <nav class="footer-links">
      <a href="service-intro.html" class="footer-link">서비스 소개</a>
      <span class="footer-divider">|</span>
      <a href="terms.html" class="footer-link">이용약관</a>
      <span class="footer-divider">|</span>
      <a href="privacy.html" class="footer-link">개인정보처리방침</a>
      <span class="footer-divider">|</span>
      <a href="contact.html" class="footer-link">문의하기</a>
    </nav>
    <div class="footer-separator"></div>
    <div class="footer-copy">
      <img src="assets/icon.svg" alt="Watchman" width="18" height="18" />
      <span>Watchman © 2026 — 당신의 집중을 응원합니다.</span>
    </div>
  </footer>
</div>
<script src="js/nav.js"></script>
<script src="js/auth-guard.js"></script>
<script src="js/animations.js"></script>
<script src="js/study-group-info.js"></script>
</body>
</html>
```

- [ ] **Step 2: study-group-info.js 생성**

```javascript
// study-group-info.js — 그룹 상세 페이지

let group = null;
let myUserId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadMyInfo();
  const groupId = new URLSearchParams(window.location.search).get('groupId');
  if (!groupId) { window.location.href = 'study-group.html'; return; }
  await loadGroup(groupId);
});

async function loadMyInfo() {
  const cached = sessionStorage.getItem('userId');
  if (cached) { myUserId = Number(cached); return; }
  try {
    const res = await fetch('/watchman/api/users/me');
    if (res.ok) {
      const user = await res.json();
      myUserId = user.userId;
      sessionStorage.setItem('userId',   user.userId);
      sessionStorage.setItem('nickname', user.nickname);
      sessionStorage.setItem('avatar',   user.avatar || '');
    }
  } catch (e) {}
}

async function loadGroup(groupId) {
  try {
    const res = await fetch(`/watchman/api/groups/${groupId}`);
    if (!res.ok) { window.location.href = 'study-group.html'; return; }
    group = await res.json();
    renderDetail();
  } catch (e) {
    window.location.href = 'study-group.html';
  }
}

function renderDetail() {
  const g = group;
  const amLeader = g.leaderId == myUserId;
  const sorted = [...g.members].sort((a, b) => b.totalTime - a.totalTime);
  const myRank = sorted.findIndex(m => m.userId == myUserId) + 1;

  document.getElementById('sgi-group-name').textContent = g.name;

  document.getElementById('sgi-body').innerHTML = `
    <div class="sg-info-card">
      <div class="sg-info-left">
        <div>
          <div class="sg-group-name">${esc(g.name)}${amLeader ? '<span class="sg-leader-badge">그룹장</span>' : ''}</div>
          ${g.description ? `<div class="sg-group-desc">${esc(g.description)}</div>` : ''}
          <div class="sg-group-meta">멤버 ${g.members.length}명 · ${fmtDate(g.createdAt)} 개설</div>
        </div>
      </div>
      <div class="sg-invite-wrap">
        <div class="sg-invite-label">초대 코드</div>
        <div class="sg-invite-code-row">
          <span class="sg-invite-code">${g.inviteCode}</span>
          <button class="sg-copy-btn" id="copy-btn" onclick="copyCode('${g.inviteCode}')">복사</button>
        </div>
      </div>
    </div>

    ${myRank > 0 ? `
    <div class="sg-myrank-card">
      <span class="sg-myrank-label">내 순위</span>
      <span class="sg-myrank-value">${myRank}위</span>
      <span class="sg-myrank-sub">/ ${g.members.length}명 중</span>
    </div>` : ''}

    <div class="sg-section">
      <div class="sg-section-title">공부 시간 랭킹</div>
      <div class="sg-rank-list">
        ${sorted.map((m, i) => {
          const isMe = m.userId == myUserId;
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
          const rateN = Math.round(Number(m.focusRate) || 0);
          const rateC = rateN >= 70 ? 'good' : rateN >= 40 ? 'ok' : 'bad';
          const maxTime = sorted[0].totalTime || 1;
          const barW = Math.round(((m.totalTime || 0) / maxTime) * 100);
          const kickBtn = amLeader && !isMe
            ? `<button class="sg-kick-btn" onclick="event.stopPropagation();kickMember(${m.userId},'${esc(m.nickname)}')">강퇴</button>`
            : '';
          return `
            <div class="sg-rank-row ${isMe ? 'me' : ''}">
              <div class="sg-rank-num">${medal ?? `<span class="sg-rank-plain">${i + 1}</span>`}</div>
              <div class="sg-rank-avatar">${(m.nickname || '?').charAt(0)}</div>
              <div class="sg-rank-info">
                <div class="sg-rank-name">
                  ${esc(m.nickname)}
                  ${m.isLeader ? '<span class="sg-leader-mini">그룹장</span>' : ''}
                  ${isMe ? '<span class="sg-me-badge">나</span>' : ''}
                </div>
                <div class="sg-rank-bar-wrap"><div class="sg-rank-bar" style="width:${barW}%"></div></div>
              </div>
              <div class="sg-rank-stats">
                <div class="sg-rank-time">${m.totalTime > 0 ? fmtSec(m.totalTime) : '-'}</div>
                <div class="sg-rank-rate ${rateC}">${m.totalTime > 0 ? rateN + '%' : '-'}</div>
              </div>
              ${kickBtn}
            </div>`;
        }).join('')}
      </div>
    </div>

    <!-- 스터디룸 입장 버튼 -->
    <div style="display:flex;justify-content:center;margin:20px 0 8px;">
      <button class="sg-submit-btn" style="max-width:320px;font-size:16px;"
              onclick="enterRoom(${g.groupId})">
        스터디룸 들어가기
      </button>
    </div>

    <div class="sg-detail-actions">
      ${amLeader
        ? `<button class="sg-disband-btn" onclick="handleDisband(${g.groupId})">그룹 폐쇄</button>`
        : `<button class="sg-leave-btn"   onclick="handleLeave(${g.groupId})">그룹 나가기</button>`
      }
    </div>`;
}

// ── 스터디룸 입장 ──────────────────────────────────────────
function enterRoom(groupId) {
  window.location.href = `study-group-session.html?groupId=${groupId}`;
}

// ── 멤버 강퇴 (방장) ───────────────────────────────────────
async function kickMember(targetUserId, nickname) {
  if (!confirm(`'${nickname}' 님을 강퇴하시겠습니까?`)) return;
  try {
    const res = await fetch(`/watchman/api/groups/${group.groupId}/members/${targetUserId}`, { method: 'DELETE' });
    if (res.ok) { await loadGroup(group.groupId); }
    else { const d = await res.json(); alert(d.message || '강퇴에 실패했습니다.'); }
  } catch (e) { alert('서버 오류가 발생했습니다.'); }
}

// ── 그룹 나가기 (일반 멤버) ───────────────────────────────
async function handleLeave(groupId) {
  if (!confirm('그룹을 나가시겠습니까?')) return;
  try {
    const res = await fetch(`/watchman/api/groups/${groupId}/members/me`, { method: 'DELETE' });
    if (res.ok) { window.location.href = 'study-group.html'; }
    else { const d = await res.json(); alert(d.message || '나가기에 실패했습니다.'); }
  } catch (e) { alert('서버 오류가 발생했습니다.'); }
}

// ── 그룹 폐쇄 (방장) ──────────────────────────────────────
async function handleDisband(groupId) {
  if (!confirm('그룹을 폐쇄하시겠습니까?\n모든 멤버가 제거되며 되돌릴 수 없습니다.')) return;
  try {
    const res = await fetch(`/watchman/api/groups/${groupId}`, { method: 'DELETE' });
    if (res.ok) { window.location.href = 'study-group.html'; }
    else { const d = await res.json(); alert(d.message || '폐쇄에 실패했습니다.'); }
  } catch (e) { alert('서버 오류가 발생했습니다.'); }
}

// ── 초대코드 복사 ──────────────────────────────────────────
function copyCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('copy-btn');
    if (btn) { btn.textContent = '복사됨 ✓'; setTimeout(() => { btn.textContent = '복사'; }, 1500); }
  });
}

// ── 유틸 ──────────────────────────────────────────────────
function fmtSec(sec) {
  const s = Number(sec) || 0;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분`;
  return `${s}초`;
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
```

- [ ] **Step 3: 브라우저 테스트**

`study-group.html`에서 그룹 카드 클릭 → `study-group-info.html?groupId=xxx` 로 이동 후:
- 그룹 이름, 멤버 랭킹 렌더링 확인
- 초대코드 복사 확인
- "스터디룸 들어가기" 버튼 클릭 시 `study-group-session.html?groupId=xxx` 로 이동 확인 (아직 페이지 없어도 URL 변경 확인)

- [ ] **Step 4: 커밋**

```bash
git add src/main/resources/static/study-group-info.html
git add src/main/resources/static/js/study-group-info.js
git commit -m "feat: study-group-info 페이지 추가 (그룹 상세 + 스터디룸 입장)"
```

---

## Task 8: study-group-session.html + CSS

**Files:**
- Create: `src/main/resources/static/study-group-session.html`
- Create: `src/main/resources/static/css/study-group-session.css`

- [ ] **Step 1: CSS 생성**

```css
/* src/main/resources/static/css/study-group-session.css */

* { box-sizing: border-box; margin: 0; padding: 0; }

.sgs-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0a0f1e;
  color: #e2e8f0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  overflow: hidden;
}

/* ── Navbar ── */
.sgs-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 52px;
  background: #0f172a;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
}
.sgs-nav-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: #e2e8f0;
  font-weight: 600;
  font-size: 15px;
}
.sgs-nav-logo img { width: 22px; height: 22px; }
.sgs-nav-center { display: flex; align-items: center; gap: 12px; }
.sgs-nav-group-name { font-size: 14px; color: #94a3b8; }
.sgs-nav-timer { font-size: 15px; font-variant-numeric: tabular-nums; color: #e2e8f0; font-weight: 600; }
.sgs-nav-right { display: flex; align-items: center; gap: 10px; }
.sgs-exit-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid #334155;
  background: transparent;
  color: #94a3b8;
  font-size: 13px;
  cursor: pointer;
  text-decoration: none;
}
.sgs-exit-btn:hover { background: #1e293b; color: #e2e8f0; }

/* ── Body ── */
.sgs-body {
  display: flex;
  flex: 1;
  gap: 12px;
  padding: 12px;
  overflow: hidden;
  min-height: 0;
}

/* ── 카메라 그리드 ── */
.sgs-grid-wrap {
  flex: 1;
  overflow: hidden;
  min-width: 0;
}
.sgs-grid {
  display: grid;
  gap: 8px;
  width: 100%;
  height: 100%;
  grid-template-columns: repeat(1, 1fr);
}

/* ── 참가자 타일 ── */
.sgs-tile {
  background: #1e293b;
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}
.sgs-tile video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
}
.sgs-tile-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #94a3b8;
  font-weight: 600;
}
.sgs-tile-info {
  position: absolute;
  bottom: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.sgs-tile-name {
  background: rgba(0,0,0,0.65);
  color: #e2e8f0;
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 20px;
  backdrop-filter: blur(4px);
}
.sgs-focus-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #94a3b8;
  flex-shrink: 0;
}
.sgs-focus-dot.focused { background: #4ade80; }
.sgs-focus-dot.distracted { background: #f87171; }
.sgs-tile.distracted-border { outline: 2px solid #f87171; }
.sgs-tile.focused-border { outline: 2px solid #4ade80; }
.sgs-tile.me-tile { outline: 2px solid #60a5fa; }

/* ── 우측 패널 ── */
.sgs-panel {
  width: 280px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
}

/* ── 통계 카드 ── */
.sgs-stats-card {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  padding: 14px 16px;
}
.sgs-card-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .05em;
  text-transform: uppercase;
  color: #475569;
  margin-bottom: 10px;
}
.sgs-stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 13px;
}
.sgs-stat-label { color: #64748b; display: flex; align-items: center; gap: 6px; }
.sgs-stat-dot { width: 8px; height: 8px; border-radius: 50%; }
.sgs-stat-dot.green { background: #4ade80; }
.sgs-stat-dot.red   { background: #f87171; }
.sgs-stat-dot.orange{ background: #fb923c; }
.sgs-stat-val { color: #e2e8f0; font-variant-numeric: tabular-nums; font-weight: 500; }
.sgs-bar-wrap { background: #1e293b; border-radius: 4px; height: 4px; margin-top: 8px; overflow: hidden; }
.sgs-bar-fill { height: 100%; border-radius: 4px; background: #4ade80; transition: width .5s; }

/* ── 채팅 카드 ── */
.sgs-chat-card {
  flex: 1;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.sgs-chat-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  padding-right: 4px;
  scroll-behavior: smooth;
}
.sgs-chat-messages::-webkit-scrollbar { width: 4px; }
.sgs-chat-messages::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
.sgs-chat-msg { display: flex; gap: 8px; align-items: flex-start; }
.sgs-chat-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #94a3b8;
  font-weight: 600;
  flex-shrink: 0;
  overflow: hidden;
}
.sgs-chat-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.sgs-chat-bubble { flex: 1; }
.sgs-chat-meta { font-size: 10px; color: #475569; margin-bottom: 2px; }
.sgs-chat-meta .sgs-chat-nick { color: #94a3b8; font-weight: 600; margin-right: 4px; }
.sgs-chat-text {
  background: #1e293b;
  border-radius: 0 8px 8px 8px;
  padding: 6px 10px;
  font-size: 13px;
  color: #cbd5e1;
  word-break: break-word;
  line-height: 1.4;
}
.sgs-chat-msg.mine .sgs-chat-text { background: #1d4ed8; color: #eff6ff; border-radius: 8px 0 8px 8px; }
.sgs-chat-msg.mine { flex-direction: row-reverse; }
.sgs-chat-msg.mine .sgs-chat-bubble { text-align: right; }
.sgs-chat-msg.mine .sgs-chat-text { border-radius: 8px 0 8px 8px; }
.sgs-chat-input-row {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-shrink: 0;
}
.sgs-chat-input {
  flex: 1;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 8px 12px;
  color: #e2e8f0;
  font-size: 13px;
  outline: none;
}
.sgs-chat-input:focus { border-color: #3b82f6; }
.sgs-chat-send-btn {
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}
.sgs-chat-send-btn:hover { background: #2563eb; }

/* ── 시스템 메시지 ── */
.sgs-sys-msg {
  text-align: center;
  font-size: 11px;
  color: #475569;
  padding: 2px 0;
}

/* ── 반응형 ── */
@media (max-width: 640px) {
  .sgs-body { flex-direction: column; }
  .sgs-panel { width: 100%; flex: none; height: 280px; flex-direction: row; }
  .sgs-stats-card { flex: none; width: 160px; }
  .sgs-chat-card { flex: 1; }
}
```

- [ ] **Step 2: HTML 생성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>스터디룸 — Watchman</title>
  <link rel="stylesheet" href="css/global.css" />
  <link rel="stylesheet" href="css/study-group-session.css" />
</head>
<body>
<div class="sgs-page">

  <!-- Navbar -->
  <nav class="sgs-nav">
    <a href="main.html" class="sgs-nav-logo">
      <img src="assets/icon.svg" alt="Watchman" />
      <span>Watchman</span>
    </a>
    <div class="sgs-nav-center">
      <span class="sgs-nav-group-name" id="sgs-group-name">스터디룸</span>
      <span class="sgs-nav-timer" id="sgs-timer" style="display:none">00:00</span>
    </div>
    <div class="sgs-nav-right">
      <button class="sgs-exit-btn" id="btn-exit" onclick="handleExit()">세션 종료</button>
    </div>
  </nav>

  <!-- Body -->
  <div class="sgs-body">

    <!-- 카메라 그리드 -->
    <div class="sgs-grid-wrap">
      <div class="sgs-grid" id="sgs-grid">
        <!-- 타일은 JS로 동적 생성 -->
      </div>
    </div>

    <!-- 우측 패널 -->
    <div class="sgs-panel">

      <!-- 통계 카드 -->
      <div class="sgs-stats-card">
        <div class="sgs-card-label">이번 세션</div>
        <div class="sgs-stat-row">
          <span class="sgs-stat-label"><span class="sgs-stat-dot green"></span>집중</span>
          <span class="sgs-stat-val" id="sgs-stat-focused">00:00</span>
        </div>
        <div class="sgs-stat-row">
          <span class="sgs-stat-label"><span class="sgs-stat-dot red"></span>딴짓</span>
          <span class="sgs-stat-val" id="sgs-stat-distracted">00:00</span>
        </div>
        <div class="sgs-stat-row" style="margin-bottom:0">
          <span class="sgs-stat-label"><span class="sgs-stat-dot orange"></span>집중률</span>
          <span class="sgs-stat-val" id="sgs-stat-rate">0%</span>
        </div>
        <div class="sgs-bar-wrap">
          <div class="sgs-bar-fill" id="sgs-bar" style="width:0%"></div>
        </div>
      </div>

      <!-- 채팅 카드 -->
      <div class="sgs-chat-card">
        <div class="sgs-card-label">채팅</div>
        <div class="sgs-chat-messages" id="sgs-chat-messages"></div>
        <div class="sgs-chat-input-row">
          <input class="sgs-chat-input" id="sgs-chat-input"
                 placeholder="메시지 입력..."
                 maxlength="200"
                 onkeydown="if(event.key==='Enter')sendChat()" />
          <button class="sgs-chat-send-btn" onclick="sendChat()">전송</button>
        </div>
      </div>

    </div>
  </div>
</div>

<!-- SockJS + STOMP (CDN) -->
<script src="https://cdn.jsdelivr.net/npm/sockjs-client@1.6.1/dist/sockjs.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/stompjs@2.3.3/lib/stomp.min.js"></script>
<script src="js/auth-guard.js"></script>
<script src="js/study-group-session.js"></script>
</body>
</html>
```

- [ ] **Step 3: 커밋**

```bash
git add src/main/resources/static/study-group-session.html
git add src/main/resources/static/css/study-group-session.css
git commit -m "feat: study-group-session 페이지 HTML + CSS 추가"
```

---

## Task 9: study-group-session.js (WebRTC + STOMP + MediaPipe)

**Files:**
- Create: `src/main/resources/static/js/study-group-session.js`

- [ ] **Step 1: JS 파일 생성 — 전체 코드**

```javascript
// study-group-session.js — 그룹 스터디 세션 (WebRTC + STOMP + MediaPipe)

// ── URL 파라미터 ──────────────────────────────────────────
const groupId = new URLSearchParams(window.location.search).get('groupId');
if (!groupId) window.location.href = 'study-group.html';

// ── 사용자 정보 ──────────────────────────────────────────
let myUserId   = Number(sessionStorage.getItem('userId'))   || 0;
let myNickname = sessionStorage.getItem('nickname') || '나';
let myAvatar   = sessionStorage.getItem('avatar')  || '';

// ── 세션 상태 ─────────────────────────────────────────────
let localStream    = null;
let timerInterval  = null;
let totalSec       = 0;
let focusedSec     = 0;
let distractedSec  = 0;
let isFocused      = true;

// ── WebRTC ────────────────────────────────────────────────
const peerConnections = {};   // remoteUserId → RTCPeerConnection
const ICE_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// ── STOMP ─────────────────────────────────────────────────
let stompClient = null;

// ── 참가자 목록 ──────────────────────────────────────────
// key: userId(string), value: { userId, nickname, avatar, focused }
const participants = new Map();

// ── 초기화 ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await ensureMyInfo();
  await startCamera();
  connectWebSocket();
  startTimer();
  loadGroupName();
});

async function ensureMyInfo() {
  if (myUserId) return;
  try {
    const res = await fetch('/watchman/api/users/me');
    if (res.ok) {
      const u = await res.json();
      myUserId   = u.userId;
      myNickname = u.nickname;
      myAvatar   = u.avatar || '';
      sessionStorage.setItem('userId',   u.userId);
      sessionStorage.setItem('nickname', u.nickname);
      sessionStorage.setItem('avatar',   u.avatar || '');
    }
  } catch (e) {}
}

async function loadGroupName() {
  try {
    const res = await fetch(`/watchman/api/groups/${groupId}`);
    if (res.ok) {
      const g = await res.json();
      document.getElementById('sgs-group-name').textContent = g.name;
    }
  } catch (e) {}
}

// ── 카메라 ────────────────────────────────────────────────
async function startCamera() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  } catch (e) {
    localStream = null;
    console.warn('[SGS] 카메라 접근 실패:', e);
  }
  addMyTile();
  initFaceLandmarker().catch(err => console.warn('[SGS] MediaPipe 로드 실패:', err));
}

// ── 내 타일 추가 ─────────────────────────────────────────
function addMyTile() {
  participants.set(String(myUserId), { userId: myUserId, nickname: myNickname, avatar: myAvatar, focused: true });
  renderGrid();

  const video = document.getElementById(`tile-video-${myUserId}`);
  if (video && localStream) {
    video.srcObject = localStream;
    video.muted = true;
    video.play().catch(() => {});
  }
}

// ── WebSocket (STOMP) 연결 ────────────────────────────────
function connectWebSocket() {
  const socket = new SockJS('/watchman/ws');
  stompClient = Stomp.over(socket);
  stompClient.debug = null; // 콘솔 노이즈 억제

  stompClient.connect({}, () => {
    // 채널 구독
    stompClient.subscribe(`/topic/room/${groupId}/presence`, msg => handlePresence(JSON.parse(msg.body)));
    stompClient.subscribe(`/topic/room/${groupId}/focus`,    msg => handleFocusUpdate(JSON.parse(msg.body)));
    stompClient.subscribe(`/topic/room/${groupId}/chat`,     msg => handleChatMessage(JSON.parse(msg.body)));
    stompClient.subscribe(`/topic/room/${groupId}/signal`,   msg => handleSignal(JSON.parse(msg.body)));

    // 입장 알림
    stompClient.send(`/app/room/${groupId}/join`, {},
      JSON.stringify({ userId: myUserId, nickname: myNickname, avatar: myAvatar }));
  }, err => {
    console.error('[SGS] STOMP 연결 실패:', err);
  });
}

// ── Presence 처리 ─────────────────────────────────────────
function handlePresence(msg) {
  if (msg.userId == myUserId) return; // 내 메시지 무시

  if (msg.action === 'join') {
    participants.set(String(msg.userId), {
      userId: msg.userId, nickname: msg.nickname, avatar: msg.avatar, focused: true
    });
    renderGrid();
    addSysMsg(`${msg.nickname} 님이 입장했습니다.`);
    // 기존 참가자로서 새 참가자에게 WebRTC offer 전송
    initiateOffer(msg.userId);
  } else if (msg.action === 'leave') {
    participants.delete(String(msg.userId));
    closePC(msg.userId);
    renderGrid();
    addSysMsg(`${msg.nickname} 님이 퇴장했습니다.`);
  }
}

// ── WebRTC: offer 보내기 (기존 참가자 → 신규 참가자) ──────
async function initiateOffer(remoteUserId) {
  const pc = createPC(remoteUserId);
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    stompClient.send(`/app/room/${groupId}/signal`, {},
      JSON.stringify({ from: myUserId, to: remoteUserId, type: 'offer', data: offer }));
  } catch (e) {
    console.error('[SGS] offer 생성 실패:', e);
  }
}

// ── WebRTC: RTCPeerConnection 생성 ────────────────────────
function createPC(remoteUserId) {
  if (peerConnections[remoteUserId]) return peerConnections[remoteUserId];

  const pc = new RTCPeerConnection(ICE_CONFIG);
  peerConnections[remoteUserId] = pc;

  // 로컬 스트림 트랙 추가
  if (localStream) {
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
  }

  // 원격 스트림 수신
  pc.ontrack = (event) => {
    const video = document.getElementById(`tile-video-${remoteUserId}`);
    if (video && event.streams[0]) {
      video.srcObject = event.streams[0];
      video.play().catch(() => {});
    }
  };

  // ICE candidate 전송
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      stompClient.send(`/app/room/${groupId}/signal`, {},
        JSON.stringify({ from: myUserId, to: remoteUserId, type: 'ice', data: event.candidate }));
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
      closePC(remoteUserId);
    }
  };

  return pc;
}

function closePC(remoteUserId) {
  if (peerConnections[remoteUserId]) {
    peerConnections[remoteUserId].close();
    delete peerConnections[remoteUserId];
  }
}

// ── WebRTC: 시그널 수신 ───────────────────────────────────
async function handleSignal(msg) {
  if (msg.to != myUserId) return; // 나에게 온 메시지만 처리

  const remoteUserId = msg.from;

  if (msg.type === 'offer') {
    const pc = createPC(remoteUserId);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      stompClient.send(`/app/room/${groupId}/signal`, {},
        JSON.stringify({ from: myUserId, to: remoteUserId, type: 'answer', data: answer }));
    } catch (e) { console.error('[SGS] answer 생성 실패:', e); }
  } else if (msg.type === 'answer') {
    try {
      await peerConnections[remoteUserId]?.setRemoteDescription(new RTCSessionDescription(msg.data));
    } catch (e) { console.error('[SGS] answer 적용 실패:', e); }
  } else if (msg.type === 'ice') {
    try {
      await peerConnections[remoteUserId]?.addIceCandidate(new RTCIceCandidate(msg.data));
    } catch (e) { /* 무시 */ }
  }
}

// ── 집중 상태 수신 ─────────────────────────────────────────
function handleFocusUpdate(msg) {
  if (msg.userId == myUserId) return;
  const p = participants.get(String(msg.userId));
  if (p) {
    p.focused = msg.focused;
    updateTileFocusUI(msg.userId, msg.focused);
  }
}

// ── 채팅 수신 ──────────────────────────────────────────────
function handleChatMessage(msg) {
  appendChatMessage(msg);
}

// ── 채팅 전송 ──────────────────────────────────────────────
function sendChat() {
  const input = document.getElementById('sgs-chat-input');
  const text = input.value.trim();
  if (!text || !stompClient?.connected) return;

  const msg = {
    userId:    myUserId,
    nickname:  myNickname,
    avatar:    myAvatar,
    message:   text,
    timestamp: Date.now()
  };
  stompClient.send(`/app/room/${groupId}/chat`, {}, JSON.stringify(msg));
  input.value = '';
}

function appendChatMessage(msg) {
  const container = document.getElementById('sgs-chat-messages');
  const isMe = msg.userId == myUserId;

  const div = document.createElement('div');
  div.className = `sgs-chat-msg${isMe ? ' mine' : ''}`;

  const avatarHtml = msg.avatar
    ? `<img src="${esc(msg.avatar)}" alt="${esc(msg.nickname)}" />`
    : esc((msg.nickname || '?').charAt(0));

  div.innerHTML = `
    <div class="sgs-chat-avatar">${avatarHtml}</div>
    <div class="sgs-chat-bubble">
      ${!isMe ? `<div class="sgs-chat-meta"><span class="sgs-chat-nick">${esc(msg.nickname)}</span></div>` : ''}
      <div class="sgs-chat-text">${esc(msg.message)}</div>
    </div>`;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function addSysMsg(text) {
  const container = document.getElementById('sgs-chat-messages');
  const div = document.createElement('div');
  div.className = 'sgs-sys-msg';
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// ── 그리드 렌더링 ─────────────────────────────────────────
function renderGrid() {
  const grid = document.getElementById('sgs-grid');
  const n = participants.size;

  // 컬럼 수 계산
  let cols;
  if (n <= 1)      cols = 1;
  else if (n <= 2) cols = 2;
  else if (n <= 4) cols = 2;
  else if (n <= 9) cols = 3;
  else             cols = 4;
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  // 기존 타일 유지 또는 신규 추가
  const existingIds = new Set([...grid.querySelectorAll('.sgs-tile')].map(t => t.dataset.uid));
  const currentIds  = new Set([...participants.keys()]);

  // 제거
  existingIds.forEach(uid => {
    if (!currentIds.has(uid)) grid.querySelector(`[data-uid="${uid}"]`)?.remove();
  });

  // 추가 (순서: 나 먼저)
  const ordered = [String(myUserId), ...[...participants.keys()].filter(k => k != myUserId)];
  ordered.forEach(uid => {
    if (!grid.querySelector(`[data-uid="${uid}"]`)) {
      const p = participants.get(uid);
      if (!p) return;
      const tile = buildTile(p);
      grid.appendChild(tile);
    }
  });
}

function buildTile(p) {
  const isMe = p.userId == myUserId;
  const tile = document.createElement('div');
  tile.className = `sgs-tile${isMe ? ' me-tile' : ''}`;
  tile.dataset.uid = String(p.userId);

  const avatarChar = (p.nickname || '?').charAt(0).toUpperCase();
  tile.innerHTML = `
    <div class="sgs-tile-avatar" id="tile-avatar-${p.userId}">${avatarChar}</div>
    <video id="tile-video-${p.userId}" playsinline ${isMe ? 'muted' : ''} style="display:none"></video>
    <div class="sgs-tile-info">
      <span class="sgs-focus-dot focused" id="tile-dot-${p.userId}"></span>
      <span class="sgs-tile-name">${esc(p.nickname)}${isMe ? ' (나)' : ''}</span>
    </div>`;

  return tile;
}

function updateTileFocusUI(userId, focused) {
  const dot  = document.getElementById(`tile-dot-${userId}`);
  const tile = document.querySelector(`.sgs-tile[data-uid="${userId}"]`);
  if (dot) {
    dot.className = `sgs-focus-dot ${focused ? 'focused' : 'distracted'}`;
  }
  if (tile) {
    tile.classList.toggle('focused-border',   focused);
    tile.classList.toggle('distracted-border', !focused);
  }
}

// ── MediaPipe FaceLandmarker ──────────────────────────────
let faceLandmarker     = null;
let detectionRafId     = null;
let distractionSince   = null;
const DISTRACTION_DELAY_MS = 3000;
const BASE_THRESHOLDS = { yawLeft: 35, yawRight: 35, pitchDown: 30, pitchUp: 20 };
const MEDIAPIPE_VERSION = '0.10.3';
const MEDIAPIPE_CDN     = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}`;

function loadCalibValue(key, base) {
  if (sessionStorage.getItem('watchman_calib_done') !== '1') return base;
  const v = parseFloat(sessionStorage.getItem(key));
  if (isNaN(v) || v <= 0 || v > base + 20) return base;
  return v;
}
let calibYawLeft   = loadCalibValue('watchman_calib_yaw_left',   BASE_THRESHOLDS.yawLeft);
let calibYawRight  = loadCalibValue('watchman_calib_yaw_right',  BASE_THRESHOLDS.yawRight);
let calibPitchDown = loadCalibValue('watchman_calib_pitch_down', BASE_THRESHOLDS.pitchDown);
let calibPitchUp   = loadCalibValue('watchman_calib_pitch_up',   BASE_THRESHOLDS.pitchUp);

async function initFaceLandmarker() {
  const { FaceLandmarker, FilesetResolver } = await import(`${MEDIAPIPE_CDN}/vision_bundle.mjs`);
  const vision = await FilesetResolver.forVisionTasks(`${MEDIAPIPE_CDN}/wasm`);
  const modelAssetPath = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
  const opts = { runningMode: 'VIDEO', numFaces: 1,
    minFaceDetectionConfidence: 0.5, minFacePresenceConfidence: 0.5, minTrackingConfidence: 0.5 };
  try {
    faceLandmarker = await FaceLandmarker.createFromOptions(vision,
      { baseOptions: { modelAssetPath, delegate: 'GPU' }, ...opts });
  } catch {
    faceLandmarker = await FaceLandmarker.createFromOptions(vision,
      { baseOptions: { modelAssetPath, delegate: 'CPU' }, ...opts });
  }
  startDetectionLoop();
}

function computeHeadAngles(landmarks) {
  const nose = landmarks[4], forehead = landmarks[10], chin = landmarks[152];
  const leftCheek = landmarks[234], rightCheek = landmarks[454];
  const faceCenterX = (leftCheek.x + rightCheek.x) / 2;
  const faceHalfW   = Math.abs(rightCheek.x - leftCheek.x) / 2;
  const yaw = Math.asin(Math.max(-1, Math.min(1, faceHalfW > 0 ? (nose.x - faceCenterX) / faceHalfW : 0))) * (180 / Math.PI);
  const faceCenterY = (forehead.y + chin.y) / 2;
  const faceHalfH   = Math.abs(chin.y - forehead.y) / 2;
  const pitch = Math.asin(Math.max(-1, Math.min(1, faceHalfH > 0 ? (nose.y - faceCenterY) / faceHalfH : 0))) * (180 / Math.PI);
  return { yaw, pitch };
}

function startDetectionLoop() {
  const video = document.getElementById(`tile-video-${myUserId}`);
  let lastVideoTime = -1;

  function detect() {
    if (!faceLandmarker || !video) { detectionRafId = requestAnimationFrame(detect); return; }
    if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      let results;
      try { results = faceLandmarker.detectForVideo(video, performance.now()); } catch { detectionRafId = requestAnimationFrame(detect); return; }
      if (results.faceLandmarks?.length > 0) {
        const { yaw, pitch } = computeHeadAngles(results.faceLandmarks[0]);
        const rawDistracted = yaw > calibYawLeft || yaw < -calibYawRight || pitch > calibPitchDown || pitch < -calibPitchUp;
        if (rawDistracted) {
          if (distractionSince === null) distractionSince = performance.now();
          else if (performance.now() - distractionSince >= DISTRACTION_DELAY_MS) applyFocusState(false);
        } else {
          distractionSince = null;
          applyFocusState(true);
        }
      } else {
        distractionSince = null;
        applyFocusState(false);
      }
    }
    detectionRafId = requestAnimationFrame(detect);
  }
  detectionRafId = requestAnimationFrame(detect);
}

let lastFocusedState = null;
function applyFocusState(focused) {
  if (focused === lastFocusedState) return;
  lastFocusedState = focused;
  isFocused = focused;
  updateTileFocusUI(myUserId, focused);
  // WebSocket으로 집중 상태 브로드캐스트
  if (stompClient?.connected) {
    stompClient.send(`/app/room/${groupId}/focus`, {},
      JSON.stringify({ userId: myUserId, focused }));
  }
}

// ── 타이머 ────────────────────────────────────────────────
function startTimer() {
  timerInterval = setInterval(() => {
    totalSec++;
    if (isFocused) focusedSec++; else distractedSec++;
    updateTimerUI();
  }, 1000);
  document.getElementById('sgs-timer').style.display = 'inline';
}

function updateTimerUI() {
  const fmt = s => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };
  document.getElementById('sgs-timer').textContent          = fmt(totalSec);
  document.getElementById('sgs-stat-focused').textContent   = fmt(focusedSec);
  document.getElementById('sgs-stat-distracted').textContent = fmt(distractedSec);

  const total = focusedSec + distractedSec;
  const rate  = total > 0 ? Math.round((focusedSec / total) * 100) : 0;
  document.getElementById('sgs-stat-rate').textContent = `${rate}%`;
  document.getElementById('sgs-bar').style.width       = `${rate}%`;
}

// ── 세션 종료 ─────────────────────────────────────────────
async function handleExit() {
  if (!confirm('스터디를 종료하시겠습니까?')) return;
  await endSession();
}

// 퇴장 전 정리
window.addEventListener('beforeunload', () => {
  if (stompClient?.connected) {
    stompClient.send(`/app/room/${groupId}/leave`, {},
      JSON.stringify({ userId: myUserId, nickname: myNickname, avatar: myAvatar }));
  }
});

async function endSession() {
  clearInterval(timerInterval);
  if (detectionRafId) cancelAnimationFrame(detectionRafId);

  // WebSocket 퇴장 알림
  if (stompClient?.connected) {
    stompClient.send(`/app/room/${groupId}/leave`, {},
      JSON.stringify({ userId: myUserId, nickname: myNickname, avatar: myAvatar }));
    stompClient.disconnect();
  }

  // PeerConnection 정리
  Object.keys(peerConnections).forEach(uid => closePC(uid));

  // 카메라 종료
  localStream?.getTracks().forEach(t => t.stop());

  // 세션 데이터 서버 저장 (솔로 세션과 동일)
  if ((focusedSec + distractedSec) > 0) {
    try {
      await fetch('/watchman/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focusedTime: focusedSec, distractedTime: distractedSec })
      });
    } catch (e) { console.error('[SGS] 세션 저장 실패:', e); }
  }

  window.location.href = `study-group-info.html?groupId=${groupId}`;
}

// ── 유틸 ──────────────────────────────────────────────────
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
```

- [ ] **Step 2: 비디오 타일 보이기/숨기기 — video srcObject 할당 후 처리 추가**

`buildTile` 함수 안의 video에 `srcObject` 가 설정될 때 avatar를 숨기는 로직을 `createPC`의 `ontrack` 이벤트에 추가한다 (`closePC` 위에):

```javascript
  // 원격 스트림 수신 — video 표시, avatar 숨기기
  pc.ontrack = (event) => {
    const video  = document.getElementById(`tile-video-${remoteUserId}`);
    const avatar = document.getElementById(`tile-avatar-${remoteUserId}`);
    if (video && event.streams[0]) {
      video.srcObject = event.streams[0];
      video.style.display = 'block';
      video.play().catch(() => {});
      if (avatar) avatar.style.display = 'none';
    }
  };
```

그리고 `addMyTile` 함수에서도 video 표시 / avatar 숨기기를 추가한다:

```javascript
function addMyTile() {
  participants.set(String(myUserId), { userId: myUserId, nickname: myNickname, avatar: myAvatar, focused: true });
  renderGrid();

  const video  = document.getElementById(`tile-video-${myUserId}`);
  const avatar = document.getElementById(`tile-avatar-${myUserId}`);
  if (video && localStream) {
    video.srcObject = localStream;
    video.muted = true;
    video.style.display = 'block';
    video.play().catch(() => {});
    if (avatar) avatar.style.display = 'none';
  }
}
```

- [ ] **Step 3: 전체 흐름 수동 테스트**

1. 브라우저 탭 A에서 로그인 → 그룹 생성 → 스터디룸 들어가기
2. 브라우저 탭 B(또는 시크릿 탭, 다른 계정)에서 로그인 → 같은 그룹 초대코드로 참가 → 스터디룸 들어가기
3. 확인:
   - 양쪽 탭에서 서로의 카메라 타일이 보임
   - 탭 A에서 채팅 전송 → 탭 B에서 수신 확인
   - 탭 A에서 고개를 돌리면 (딴짓 감지) → 탭 B의 탭 A 타일 테두리가 빨간색으로 변함
   - 탭 A에서 "세션 종료" → 탭 B에서 "xxx 님이 퇴장했습니다." 메시지 확인

- [ ] **Step 4: 커밋**

```bash
git add src/main/resources/static/js/study-group-session.js
git commit -m "feat: 그룹 스터디 세션 JS 추가 (WebRTC + STOMP + MediaPipe)"
```

---

## 완료 확인

- [ ] `study-group.html` — 그룹 목록/만들기/참가 정상 동작
- [ ] `study-group-info.html` — 그룹 상세, 강퇴(방장), 나가기, 폐쇄(방장) 정상 동작
- [ ] `study-group-session.html` — 카메라 그리드, 채팅, 집중 상태, 세션 저장 정상 동작
- [ ] 2개 탭에서 실시간 영상·채팅·집중상태 공유 확인
