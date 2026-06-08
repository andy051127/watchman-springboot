package com.watchman.controller;

import com.watchman.domain.Achievement;
import com.watchman.domain.UserAchievement;
import com.watchman.service.AchievementService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/achievements")
public class AchievementController {

    private AchievementService achievementService;

    @Autowired
    public void setAchievementService(AchievementService achievementService) {
        this.achievementService = achievementService;
    }

    private Long getSessionUserId(HttpSession session) {
        return (Long) session.getAttribute("userId");
    }

    /**
     * GET /api/achievements
     * Returns all achievements with earned status for the current user.
     * Response: List of { achievement, earned: bool, earnedAt: ... }
     */
    @GetMapping
    public ResponseEntity<?> getAchievements(HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));

        List<Achievement> all = achievementService.getAllAchievements();
        List<UserAchievement> myList = achievementService.getMyAchievements(userId);

        // Build a map of achievementId -> UserAchievement for quick lookup
        Map<String, UserAchievement> earnedMap = new HashMap<>();
        for (UserAchievement ua : myList) {
            earnedMap.put(ua.getAchievementId(), ua);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Achievement a : all) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("achievement", a);
            UserAchievement ua = earnedMap.get(a.getAchievementId());
            item.put("earned", ua != null);
            item.put("earnedAt", ua != null ? ua.getEarnedAt() : null);
            result.add(item);
        }

        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/achievements/my
     * Returns only earned achievements for the current user.
     */
    @GetMapping("/my")
    public ResponseEntity<?> getMyAchievements(HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));

        return ResponseEntity.ok(achievementService.getMyAchievements(userId));
    }
}
