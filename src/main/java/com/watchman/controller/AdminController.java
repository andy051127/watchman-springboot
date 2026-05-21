package com.watchman.controller;

import com.watchman.domain.Contact;
import com.watchman.domain.User;
import com.watchman.service.ContactService;
import com.watchman.service.UserService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class AdminController {

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

    // ── 관리자 여부 변경 ──────────────────────────────────────
    // PATCH /api/admin/users/{id}/admin  body: { "isAdmin": 0 | 1 }
    @PatchMapping("/api/admin/users/{id}/admin")
    public ResponseEntity<?> updateAdmin(@PathVariable Long id,
                                         @RequestBody Map<String, Integer> body,
                                         HttpSession session) {
        if (!isAdmin(session)) return ResponseEntity.status(401).body(Map.of("message", "관리자 권한이 필요합니다."));
        Integer isAdmin = body.get("isAdmin");
        if (isAdmin == null || (isAdmin != 0 && isAdmin != 1)) {
            return ResponseEntity.badRequest().body(Map.of("message", "isAdmin은 0 또는 1만 허용됩니다."));
        }
        this.userService.updateUserAdmin(id, isAdmin);
        return ResponseEntity.ok(Map.of("message", "변경되었습니다."));
    }

    private boolean isAdmin(HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) return false;
        try {
            User user = this.userService.getUser(userId);
            return user.getIsAdmin() == 1;
        } catch (Exception e) {
            return false;
        }
    }
}
