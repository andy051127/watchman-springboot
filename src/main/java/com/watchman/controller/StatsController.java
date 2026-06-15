package com.watchman.controller;

import com.watchman.config.ActiveUserTracker;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private ActiveUserTracker tracker;

    @Autowired
    public void setTracker(ActiveUserTracker tracker) {
        this.tracker = tracker;
    }

    // 현재 접속자 수 조회 (공개, 인증 불필요)
    // GET /api/stats/active
    @GetMapping("/active")
    public ResponseEntity<?> getActiveCount() {
        return ResponseEntity.ok(Map.of("count", tracker.getActiveCount()));
    }

    // 공부 세션 heartbeat (공개)
    // POST /api/stats/ping  body: { "key": "uuid" }
    @PostMapping("/ping")
    public ResponseEntity<?> ping(@RequestBody Map<String, String> body) {
        String key = body.get("key");
        if (key != null && !key.isBlank()) {
            tracker.ping(key.trim());
        }
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // 공부 세션 종료 신호
    // POST /api/stats/leave  body: { "key": "uuid" }
    @PostMapping("/leave")
    public ResponseEntity<?> leave(@RequestBody Map<String, String> body) {
        String key = body.get("key");
        if (key != null && !key.isBlank()) {
            tracker.remove(key.trim());
        }
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
