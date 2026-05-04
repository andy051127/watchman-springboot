package com.watchman.controller;

import com.watchman.domain.Session;
import com.watchman.service.SessionService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
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

    // 전체 세션 목록 조회 (stats 페이지 히스토리)
    // GET /api/sessions
    @GetMapping
    public ResponseEntity<?> getSessions(HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }

        List<Session> sessions = this.sessionService.getSessions(userId);
        return ResponseEntity.ok(sessions);
    }

    // 오늘 세션 조회 (대시보드 오늘 통계)
    // GET /api/sessions/today
    @GetMapping("/today")
    public ResponseEntity<?> getTodaySessions(HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }

        List<Session> sessions = this.sessionService.getTodaySessions(userId);
        return ResponseEntity.ok(sessions);
    }

    // 최근 7일 세션 조회 (주간 바 차트)
    // GET /api/sessions/week
    @GetMapping("/week")
    public ResponseEntity<?> getWeekSessions(HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }

        List<Session> sessions = this.sessionService.getWeekSessions(userId);
        return ResponseEntity.ok(sessions);
    }

    // 최근 N개 세션 조회
    // GET /api/sessions/recent?limit=3
    @GetMapping("/recent")
    public ResponseEntity<?> getRecentSessions(
            @RequestParam(defaultValue = "3") int limit,
            HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }

        List<Session> sessions = this.sessionService.getRecentSessions(userId, limit);
        return ResponseEntity.ok(sessions);
    }

    // 세션 저장 (공부 종료 시 호출)
    // POST /api/sessions
    // body: { "focusedTime": 3600, "distractedTime": 600 }
    // focusRate는 SessionServiceImpl에서 자동 계산
    @PostMapping
    public ResponseEntity<?> saveSession(@RequestBody Map<String, Integer> body, HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }

        int focusedTime    = body.get("focusedTime");
        int distractedTime = body.get("distractedTime");
        this.sessionService.saveSession(userId, focusedTime, distractedTime);
        return ResponseEntity.ok(Map.of("message", "세션이 저장되었습니다."));
    }
}
