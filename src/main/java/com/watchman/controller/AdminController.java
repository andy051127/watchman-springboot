package com.watchman.controller;

import com.watchman.domain.Contact;
import com.watchman.service.ContactService;
import com.watchman.service.UserService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class AdminController {

    private static final String ADMIN_PASSWORD = "watchman_admin";
    private static final String ADMIN_SESSION_KEY = "adminAuth";

    private ContactService contactService;
    private UserService userService;

    @Autowired
    public void setContactService(ContactService contactService) {
        this.contactService = contactService;
    }

    @Autowired
    public void setUserService(UserService userService) {
        this.userService = userService;
    }

    // ── 문의 제출 (누구나 가능) ───────────────────────────
    // POST /api/contact
    @PostMapping("/api/contact")
    public ResponseEntity<?> submitContact(@RequestBody Map<String, String> body) {
        Contact c = new Contact();
        c.setName(body.get("name"));
        c.setEmail(body.get("email"));
        c.setType(body.get("type"));
        c.setContent(body.get("content"));
        this.contactService.submit(c);
        return ResponseEntity.ok(Map.of("message", "문의가 접수되었습니다."));
    }

    // ── 관리자 세션 확인 ──────────────────────────────────
    // GET /api/admin/check
    @GetMapping("/api/admin/check")
    public ResponseEntity<?> checkAdmin(HttpSession session) {
        if (isAdmin(session)) return ResponseEntity.ok(Map.of("admin", true));
        return ResponseEntity.status(401).body(Map.of("admin", false));
    }

    // ── 관리자 로그인 ─────────────────────────────────────
    // POST /api/admin/login
    @PostMapping("/api/admin/login")
    public ResponseEntity<?> adminLogin(@RequestBody Map<String, Object> body,
                                        HttpSession session,
                                        HttpServletResponse response) {
        if (ADMIN_PASSWORD.equals(body.get("password"))) {
            session.setAttribute(ADMIN_SESSION_KEY, true);
            boolean rememberMe = Boolean.TRUE.equals(body.get("rememberMe"));
            if (rememberMe) {
                int maxAge = 30 * 24 * 60 * 60;
                session.setMaxInactiveInterval(maxAge);
                Cookie cookie = new Cookie("JSESSIONID", session.getId());
                cookie.setMaxAge(maxAge);
                cookie.setPath("/watchman");
                cookie.setHttpOnly(true);
                response.addCookie(cookie);
            }
            return ResponseEntity.ok(Map.of("message", "로그인 성공"));
        }
        return ResponseEntity.status(401).body(Map.of("message", "비밀번호가 올바르지 않습니다."));
    }

    // ── 관리자 로그아웃 ───────────────────────────────────
    // POST /api/admin/logout
    @PostMapping("/api/admin/logout")
    public ResponseEntity<?> adminLogout(HttpSession session, HttpServletResponse response) {
        session.removeAttribute(ADMIN_SESSION_KEY);
        // 저장된 쿠키 만료
        Cookie cookie = new Cookie("JSESSIONID", "");
        cookie.setMaxAge(0);
        cookie.setPath("/watchman");
        cookie.setHttpOnly(true);
        response.addCookie(cookie);
        return ResponseEntity.ok(Map.of("message", "로그아웃"));
    }

    // ── 문의 목록 조회 ────────────────────────────────────
    // GET /api/admin/contacts
    @GetMapping("/api/admin/contacts")
    public ResponseEntity<?> getContacts(HttpSession session) {
        if (!isAdmin(session)) return ResponseEntity.status(401).body(Map.of("message", "관리자 권한이 필요합니다."));
        return ResponseEntity.ok(this.contactService.getAll());
    }

    // ── 문의 삭제 ─────────────────────────────────────────
    // DELETE /api/admin/contacts/{id}
    @DeleteMapping("/api/admin/contacts/{id}")
    public ResponseEntity<?> deleteContact(@PathVariable Long id, HttpSession session) {
        if (!isAdmin(session)) return ResponseEntity.status(401).body(Map.of("message", "관리자 권한이 필요합니다."));
        this.contactService.delete(id);
        return ResponseEntity.ok(Map.of("message", "삭제되었습니다."));
    }

    // ── 사용자 목록 조회 ──────────────────────────────────
    // GET /api/admin/users
    @GetMapping("/api/admin/users")
    public ResponseEntity<?> getUsers(HttpSession session) {
        if (!isAdmin(session)) return ResponseEntity.status(401).body(Map.of("message", "관리자 권한이 필요합니다."));
        return ResponseEntity.ok(this.userService.getAllUsers());
    }

    // ── 사용자 삭제 ───────────────────────────────────────
    // DELETE /api/admin/users/{id}
    @DeleteMapping("/api/admin/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id, HttpSession session) {
        if (!isAdmin(session)) return ResponseEntity.status(401).body(Map.of("message", "관리자 권한이 필요합니다."));
        this.userService.adminDeleteUser(id);
        return ResponseEntity.ok(Map.of("message", "삭제되었습니다."));
    }

    // ── 역할 변경 ─────────────────────────────────────────────
    // PATCH /api/admin/users/{id}/role  body: { "role": "admin" | "user" }
    @PatchMapping("/api/admin/users/{id}/role")
    public ResponseEntity<?> updateRole(@PathVariable Long id,
                                        @RequestBody Map<String, String> body,
                                        HttpSession session) {
        if (!isAdmin(session)) return ResponseEntity.status(401).body(Map.of("message", "관리자 권한이 필요합니다."));
        String role = body.get("role");
        if (!"admin".equals(role) && !"user".equals(role)) {
            return ResponseEntity.badRequest().body(Map.of("message", "role은 admin 또는 user만 허용됩니다."));
        }
        this.userService.updateUserRole(id, role);
        return ResponseEntity.ok(Map.of("message", "역할이 변경되었습니다."));
    }

    private boolean isAdmin(HttpSession session) {
        return Boolean.TRUE.equals(session.getAttribute(ADMIN_SESSION_KEY));
    }
}
