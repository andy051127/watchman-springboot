package com.watchman.repository;

import com.watchman.domain.Achievement;
import com.watchman.domain.UserAchievement;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;

@Repository
public class AchievementRepositoryImpl implements AchievementRepository {

    private JdbcTemplate jdbcTemplate;

    @Autowired
    public void setJdbcTemplate(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private static final RowMapper<Achievement> ACHIEVEMENT_ROW_MAPPER = (rs, rowNum) -> {
        Achievement a = new Achievement();
        a.setAchievementId(rs.getString("achievement_id"));
        a.setName(rs.getString("name"));
        a.setDescription(rs.getString("description"));
        a.setCategory(rs.getString("category"));
        a.setIcon(rs.getString("icon"));
        a.setHidden(rs.getBoolean("hidden"));
        return a;
    };

    @Override
    public List<Achievement> findAll() {
        String sql = "SELECT achievement_id, name, description, category, icon, hidden FROM achievements ORDER BY category, achievement_id";
        return jdbcTemplate.query(sql, ACHIEVEMENT_ROW_MAPPER);
    }

    @Override
    public List<UserAchievement> findByUserId(Long userId) {
        String sql = """
                SELECT ua.id, ua.user_id, ua.achievement_id, ua.earned_at,
                       a.name, a.description, a.category, a.icon, a.hidden
                FROM user_achievements ua
                JOIN achievements a ON ua.achievement_id = a.achievement_id
                WHERE ua.user_id = ?
                ORDER BY ua.earned_at DESC
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            UserAchievement ua = new UserAchievement();
            ua.setId(rs.getLong("id"));
            ua.setUserId(rs.getLong("user_id"));
            ua.setAchievementId(rs.getString("achievement_id"));
            ua.setEarnedAt(rs.getTimestamp("earned_at").toLocalDateTime());
            Achievement a = new Achievement();
            a.setAchievementId(rs.getString("achievement_id"));
            a.setName(rs.getString("name"));
            a.setDescription(rs.getString("description"));
            a.setCategory(rs.getString("category"));
            a.setIcon(rs.getString("icon"));
            a.setHidden(rs.getBoolean("hidden"));
            ua.setAchievement(a);
            return ua;
        }, userId);
    }

    @Override
    public boolean hasAchievement(Long userId, String achievementId) {
        String sql = "SELECT COUNT(*) FROM user_achievements WHERE user_id = ? AND achievement_id = ?";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, userId, achievementId);
        return count != null && count > 0;
    }

    @Override
    public void award(Long userId, String achievementId) {
        String sql = "INSERT IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)";
        jdbcTemplate.update(sql, userId, achievementId);
    }

    @Override
    public void incrementChatCount(Long userId) {
        ensureUserStats(userId);
        String sql = "UPDATE user_stats SET chat_count = chat_count + 1 WHERE user_id = ?";
        jdbcTemplate.update(sql, userId);
    }

    @Override
    public int getChatCount(Long userId) {
        ensureUserStats(userId);
        String sql = "SELECT chat_count FROM user_stats WHERE user_id = ?";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, userId);
        return count != null ? count : 0;
    }

    @Override
    public void ensureUserStats(Long userId) {
        String sql = "INSERT IGNORE INTO user_stats (user_id, chat_count) VALUES (?, 0)";
        jdbcTemplate.update(sql, userId);
    }
}
