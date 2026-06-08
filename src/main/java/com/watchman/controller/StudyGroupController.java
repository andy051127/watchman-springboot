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
        try {
            StudyGroup group = studyGroupService.createGroup(
                body.get("name"), body.get("description"), userId);
            return ResponseEntity.ok(group);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
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
        } catch (IllegalArgumentException | IllegalStateException e) {
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
