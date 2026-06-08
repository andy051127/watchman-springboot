package com.watchman.repository;

import com.watchman.domain.Achievement;
import com.watchman.domain.UserAchievement;

import java.util.List;

public interface AchievementRepository {

    List<Achievement> findAll();

    List<UserAchievement> findByUserId(Long userId);

    boolean hasAchievement(Long userId, String achievementId);

    void award(Long userId, String achievementId);

    void incrementChatCount(Long userId);

    int getChatCount(Long userId);

    void ensureUserStats(Long userId);
}
