package com.watchman.controller;

import com.watchman.domain.User;
import com.watchman.service.UserService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private UserService userService;

    @Autowired
    public void setUserService(UserService userService) {
        this.userService = userService;
    }

    // 로그인 여부 확인 헬퍼: 세션에서 userId를 꺼냄
    // null이면 미로그인 상태
    private Long getSessionUserId(HttpSession session) {
        return (Long) session.getAttribute("userId");
    }

    // 내 정보 조회
    // password 필드는 응답에서 제외 (보안)
    @GetMapping("/me")
    public ResponseEntity<?> getMe(HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }

        User user = this.userService.getUser(userId);
        return ResponseEntity.ok(Map.of(
                "userId",    user.getUserId(),
                "email",     user.getEmail(),
                "nickname",  user.getNickname(),
                "avatar",    user.getAvatar() != null ? user.getAvatar() : "",
                "streak",    user.getStreak(),
                "createdAt", user.getCreatedAt().toString()
        ));
    }

    // 닉네임 변경
    @PatchMapping("/me/nickname")
    public ResponseEntity<?> updateNickname(@RequestBody Map<String, String> body, HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }

        this.userService.updateNickname(userId, body.get("nickname"));
        return ResponseEntity.ok(Map.of("message", "닉네임이 변경되었습니다."));
    }

    // 비밀번호 변경
    // 현재 비밀번호 불일치 시 UserServiceImpl이 IllegalArgumentException을 던짐 → 400
    @PatchMapping("/me/password")
    public ResponseEntity<?> updatePassword(@RequestBody Map<String, String> body, HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }

        try {
            this.userService.updatePassword(userId, body.get("currentPassword"), body.get("newPassword"));
            return ResponseEntity.ok(Map.of("message", "비밀번호가 변경되었습니다."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 아바타 변경
    @PatchMapping("/me/avatar")
    public ResponseEntity<?> updateAvatar(@RequestBody Map<String, String> body, HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }

        this.userService.updateAvatar(userId, body.get("avatar"));
        return ResponseEntity.ok(Map.of("message", "아바타가 변경되었습니다."));
    }

    // 회원 탈퇴
    // 비밀번호 불일치 시 400, 성공 시 세션도 함께 무효화
    @DeleteMapping("/me")
    public ResponseEntity<?> deleteMe(@RequestBody Map<String, String> body, HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }

        try {
            this.userService.deleteUser(userId, body.get("password"));
            session.invalidate();
            return ResponseEntity.ok(Map.of("message", "회원 탈퇴가 완료되었습니다."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
