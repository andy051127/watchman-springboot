package com.watchman.controller;

import com.watchman.domain.User;
import com.watchman.service.UserService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
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
    public ResponseEntity<?> login(@RequestBody Map<String, Object> body,
                                   HttpSession session,
                                   HttpServletResponse response) {
        String email       = (String) body.get("email");
        String password    = (String) body.get("password");
        boolean rememberMe = Boolean.TRUE.equals(body.get("rememberMe"));

        User user = this.userService.login(email, password);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("message", "이메일 또는 비밀번호가 올바르지 않습니다."));
        }

        session.setAttribute("userId", user.getUserId());

        if (rememberMe) {
            // 로그인 상태 유지: 서버 세션 30일 + 브라우저 종료 후에도 유지되는 영구 쿠키
            int maxAge = 30 * 24 * 60 * 60;
            session.setMaxInactiveInterval(maxAge);
            Cookie cookie = new Cookie("JSESSIONID", session.getId());
            cookie.setMaxAge(maxAge);
            cookie.setPath("/watchman");
            cookie.setHttpOnly(true);
            response.addCookie(cookie);
        }
        // 미체크: application.properties의 기본값(8시간) 사용 — 브라우저 세션 쿠키

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
