package com.watchman.service;

import com.watchman.domain.Achievement;
import com.watchman.domain.UserAchievement;

import java.util.List;

public interface AchievementService {

    List<Achievement> getAllAchievements();

    List<UserAchievement> getMyAchievements(Long userId);

    /**
     * Check all relevant achievements for the given trigger and award any newly earned ones.
     * Returns the list of newly earned Achievement objects (empty if none).
     *
     * Triggers: "session", "todo_complete", "dday_add", "block_add", "group_join", "group_create", "chat"
     */
    List<Achievement> checkAndAward(Long userId, String trigger);
}
