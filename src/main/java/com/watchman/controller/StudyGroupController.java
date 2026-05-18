package com.watchman.controller;

import com.watchman.service.StudyGroupService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/groups")
public class StudyGroupController {

    private StudyGroupService service;

    @Autowired
    public void setService(StudyGroupService service) { this.service = service; }

    // GET /api/groups — 내 그룹 목록
    @GetMapping
    public ResponseEntity<?> getMyGroups(HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        return ResponseEntity.ok(this.service.getMyGroups(userId));
    }

    // POST /api/groups — 그룹 생성
    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        String name = (String) body.get("name");
        String desc = (String) body.getOrDefault("description", "");
        if (name == null || name.isBlank()) return ResponseEntity.badRequest().body(Map.of("message", "그룹 이름을 입력해 주세요."));
        try {
            return ResponseEntity.ok(this.service.createGroup(userId, name.trim(), desc == null ? "" : desc.trim()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    // POST /api/groups/join — 초대코드로 참여
    @PostMapping("/join")
    public ResponseEntity<?> join(@RequestBody Map<String, Object> body, HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        String code = (String) body.get("inviteCode");
        if (code == null || code.isBlank()) return ResponseEntity.badRequest().body(Map.of("message", "초대 코드를 입력해 주세요."));
        try {
            return ResponseEntity.ok(this.service.joinGroup(userId, code.trim()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    // DELETE /api/groups/{id} — 그룹 폐쇄 (그룹장만)
    @DeleteMapping("/{id}")
    public ResponseEntity<?> disband(@PathVariable Long id, HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        try {
            this.service.disbandGroup(id, userId);
            return ResponseEntity.ok(Map.of("message", "그룹이 폐쇄되었습니다."));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    // DELETE /api/groups/{id}/members/me — 그룹 나가기 (그룹장 불가)
    @DeleteMapping("/{id}/members/me")
    public ResponseEntity<?> leave(@PathVariable Long id, HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        try {
            this.service.leaveGroup(id, userId);
            return ResponseEntity.ok(Map.of("message", "그룹에서 나왔습니다."));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    // DELETE /api/groups/{id}/members/{userId} — 멤버 강퇴 (그룹장만)
    @DeleteMapping("/{id}/members/{targetUserId}")
    public ResponseEntity<?> kick(@PathVariable Long id, @PathVariable Long targetUserId, HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        try {
            this.service.kickMember(id, userId, targetUserId);
            return ResponseEntity.ok(Map.of("message", "멤버를 강퇴했습니다."));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }
}
