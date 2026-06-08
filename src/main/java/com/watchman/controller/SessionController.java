package com.watchman.controller;

import com.watchman.domain.Session;
import com.watchman.service.SessionService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sessions")
public class SessionController {

    private SessionService sessionService;

    @Autowired
    public void setSessionService(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    private Long getSessionUserId(HttpSession session) {
        return (Long) session.getAttribute("userId");
    }

    // GET /api/sessions
    @GetMapping
    public ResponseEntity<?> getSessions(HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        return ResponseEntity.ok(this.sessionService.getSessions(userId));
    }

    // GET /api/sessions/today
    @GetMapping("/today")
    public ResponseEntity<?> getTodaySessions(HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        return ResponseEntity.ok(this.sessionService.getTodaySessions(userId));
    }

    // GET /api/sessions/week
    @GetMapping("/week")
    public ResponseEntity<?> getWeekSessions(HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        return ResponseEntity.ok(this.sessionService.getWeekSessions(userId));
    }

    // GET /api/sessions/recent?limit=3
    @GetMapping("/recent")
    public ResponseEntity<?> getRecentSessions(
            @RequestParam(defaultValue = "3") int limit,
            HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        return ResponseEntity.ok(this.sessionService.getRecentSessions(userId, limit));
    }

    // GET /api/sessions/list?page=0&size=5  (세션 선택 모달용)
    @GetMapping("/list")
    public ResponseEntity<?> getSessionsPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size,
            HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        return ResponseEntity.ok(this.sessionService.getSessionsPaged(userId, page, size));
    }

    // GET /api/sessions/{sessionId}  (이어하기 초기값 로드)
    @GetMapping("/{sessionId}")
    public ResponseEntity<?> getSession(@PathVariable Long sessionId, HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        try {
            Session s = this.sessionService.getSession(sessionId, userId);
            return ResponseEntity.ok(s);
        } catch (EmptyResultDataAccessException e) {
            return ResponseEntity.status(404).body(Map.of("message", "세션을 찾을 수 없습니다."));
        }
    }

    // POST /api/sessions
    // body: { focusedTime, distractedTime, name? }           → 새 세션 생성
    // body: { sessionId, focusedTime, distractedTime }        → 기존 세션 이어하기
    @PostMapping
    public ResponseEntity<?> saveSession(@RequestBody Map<String, Object> body, HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));

        int focusedTime    = ((Number) body.get("focusedTime")).intValue();
        int distractedTime = ((Number) body.get("distractedTime")).intValue();
        Object sessionIdObj = body.get("sessionId");

        if (sessionIdObj != null) {
            // 이어하기: 기존 세션 업데이트
            Long sessionId = ((Number) sessionIdObj).longValue();
            this.sessionService.updateSession(sessionId, userId, focusedTime, distractedTime);
        } else {
            // 새 세션: name이 있으면 사용, 없으면 서비스에서 자동 지정
            String name = (String) body.get("name");
            this.sessionService.saveSession(userId, name, focusedTime, distractedTime);
        }

        return ResponseEntity.ok(Map.of("message", "세션이 저장되었습니다."));
    }
}
