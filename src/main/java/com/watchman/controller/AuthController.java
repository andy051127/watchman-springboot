package com.watchman.controller;

import com.watchman.domain.User;
import com.watchman.service.UserService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private UserService userService;
    
    @Autowired
    public void setUserService(UserService userService) {
        this.userService = userService;
    }

    // 로그인
    // 성공: 세션에 userId 저장 후 200 + { userId, nickname, avatar } 반환
    // 실패: 401 Unauthorized
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body, HttpSession session) {
        String email    = body.get("email");
        String password = body.get("password");

        User user = this.userService.login(email, password);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("message", "이메일 또는 비밀번호가 올바르지 않습니다."));
        }

        // 세션에 userId 저장 → 이후 모든 요청에서 꺼내 씀
        session.setAttribute("userId", user.getUserId());

        return ResponseEntity.ok(Map.of(
                "userId",   user.getUserId(),
                "nickname", user.getNickname(),
                "avatar",   user.getAvatar() != null ? user.getAvatar() : ""
        ));
    }

    // 로그아웃: 세션 전체 무효화
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok(Map.of("message", "로그아웃 되었습니다."));
    }

    // 회원가입
    // 이메일 중복 시 UserServiceImpl이 IllegalArgumentException을 던짐 → 409 Conflict
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        User user = new User();
        user.setEmail(body.get("email"));
        user.setPassword(body.get("password"));
        user.setNickname(body.get("nickname"));

        try {
            this.userService.register(user);
            return ResponseEntity.ok(Map.of("message", "회원가입이 완료되었습니다."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(409).body(Map.of("message", e.getMessage()));
        }
    }
}
