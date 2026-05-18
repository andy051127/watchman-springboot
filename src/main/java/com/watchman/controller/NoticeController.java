package com.watchman.controller;

import com.watchman.domain.Notice;
import com.watchman.domain.User;
import com.watchman.service.NoticeService;
import com.watchman.service.UserService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notices")
public class NoticeController {

    private NoticeService noticeService;
    private UserService userService;

    @Autowired
    public void setNoticeService(NoticeService noticeService) {
        this.noticeService = noticeService;
    }

    @Autowired
    public void setUserService(UserService userService) {
        this.userService = userService;
    }

    // GET /api/notices — 전체 공개
    @GetMapping
    public ResponseEntity<?> getAll() {
        return ResponseEntity.ok(this.noticeService.getAll());
    }

    // POST /api/notices — 관리자만
    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, HttpSession session) {
        if (!isAdmin(session)) return ResponseEntity.status(403).body(Map.of("message", "관리자 권한이 필요합니다."));
        Long userId = (Long) session.getAttribute("userId");
        Notice n = new Notice();
        n.setTag((String) body.getOrDefault("tag", "공지"));
        n.setTitle((String) body.get("title"));
        n.setContent((String) body.get("content"));
        n.setPinned(Boolean.TRUE.equals(body.get("pinned")));
        try {
            n.setWriterNickname(this.userService.getUser(userId).getNickname());
        } catch (Exception e) {
            n.setWriterNickname("관리자");
        }
        this.noticeService.create(n);
        return ResponseEntity.ok(Map.of("message", "공지가 등록되었습니다."));
    }

    // PUT /api/notices/{id} — 관리자만
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    @RequestBody Map<String, Object> body,
                                    HttpSession session) {
        if (!isAdmin(session)) return ResponseEntity.status(403).body(Map.of("message", "관리자 권한이 필요합니다."));
        Notice n = new Notice();
        n.setNoticeId(id);
        n.setTag((String) body.getOrDefault("tag", "공지"));
        n.setTitle((String) body.get("title"));
        n.setContent((String) body.get("content"));
        n.setPinned(Boolean.TRUE.equals(body.get("pinned")));
        this.noticeService.update(n);
        return ResponseEntity.ok(Map.of("message", "공지가 수정되었습니다."));
    }

    // DELETE /api/notices/{id} — 관리자만
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, HttpSession session) {
        if (!isAdmin(session)) return ResponseEntity.status(403).body(Map.of("message", "관리자 권한이 필요합니다."));
        this.noticeService.delete(id);
        return ResponseEntity.ok(Map.of("message", "공지가 삭제되었습니다."));
    }

    private boolean isAdmin(HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) return false;
        try {
            User user = this.userService.getUser(userId);
            return "admin".equals(user.getRole());
        } catch (Exception e) {
            return false;
        }
    }
}
