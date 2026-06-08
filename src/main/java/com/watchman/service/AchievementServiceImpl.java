package com.watchman.service;

import com.watchman.domain.Achievement;
import com.watchman.domain.UserAchievement;
import com.watchman.repository.AchievementRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class AchievementServiceImpl implements AchievementService {

    private AchievementRepository achievementRepository;
    private JdbcTemplate jdbcTemplate;

    @Autowired
    public void setAchievementRepository(AchievementRepository achievementRepository) {
        this.achievementRepository = achievementRepository;
    }

    @Autowired
    public void setJdbcTemplate(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<Achievement> getAllAchievements() {
        return achievementRepository.findAll();
    }

    @Override
    public List<UserAchievement> getMyAchievements(Long userId) {
        return achievementRepository.findByUserId(userId);
    }

    @Override
    public List<Achievement> checkAndAward(Long userId, String trigger) {
        achievementRepository.ensureUserStats(userId);
        List<Achievement> newlyEarned = new ArrayList<>();

        switch (trigger) {
            case "session" -> checkSession(userId, newlyEarned);
            case "todo_complete" -> checkTodoComplete(userId, newlyEarned);
            case "dday_add" -> checkDdayAdd(userId, newlyEarned);
            case "block_add" -> checkBlockAdd(userId, newlyEarned);
            case "group_join" -> checkGroupJoin(userId, newlyEarned);
            case "group_create" -> checkGroupCreate(userId, newlyEarned);
            case "chat" -> checkChat(userId, newlyEarned);
        }

        return newlyEarned;
    }

    // ── session trigger ─────────────────────────────────────────────────────

    private void checkSession(Long userId, List<Achievement> out) {
        // study_first: 첫 세션
        tryAward(userId, "study_first", out, () -> true);

        // 최신 세션 데이터 조회
        String latestSql = """
                SELECT focused_time, distracted_time, focus_rate,
                       HOUR(started_at) AS start_hour,
                       DAYOFWEEK(started_at) AS start_dow,
                       DATE(started_at) AS start_date
                FROM sessions
                WHERE user_id = ?
                ORDER BY started_at DESC
                LIMIT 1
                """;

        jdbcTemplate.query(latestSql, rs -> {
            int focusedTime    = rs.getInt("focused_time");
            int distractedTime = rs.getInt("distracted_time");
            double focusRate   = rs.getDouble("focus_rate");
            int startHour      = rs.getInt("start_hour");
            int startDow       = rs.getInt("start_dow"); // 1=Sun, 2=Mon, ..., 7=Sat
            LocalDate startDate = rs.getDate("start_date").toLocalDate();
            int totalSeconds   = focusedTime + distractedTime;

            // study_1h: 단일 세션 1시간 이상
            tryAward(userId, "study_1h", out, () -> totalSeconds >= 3600);

            // study_3h: 단일 세션 3시간 이상
            tryAward(userId, "study_3h", out, () -> totalSeconds >= 10800);

            // focus_50: focus_rate >= 50%, 세션 10분 이상
            tryAward(userId, "focus_50", out, () -> focusRate >= 50.0 && totalSeconds >= 600);

            // focus_80: focus_rate >= 80%, 세션 10분 이상
            tryAward(userId, "focus_80", out, () -> focusRate >= 80.0 && totalSeconds >= 600);

            // focus_95: focus_rate >= 95%, 세션 10분 이상
            tryAward(userId, "focus_95", out, () -> focusRate >= 95.0 && totalSeconds >= 600);

            // egg_dawn: 새벽 3~5시 세션 시작
            tryAward(userId, "egg_dawn", out, () -> startHour >= 3 && startHour < 5);

            // egg_midnight: 자정(00:00~00:30) 세션 시작
            tryAward(userId, "egg_midnight", out, () -> startHour == 0);

            // egg_dday: D-Day 당일 공부
            tryAward(userId, "egg_dday", out, () -> {
                String ddaySql = "SELECT COUNT(*) FROM ddays WHERE user_id = ? AND dday_date = ?";
                Integer cnt = jdbcTemplate.queryForObject(ddaySql, Integer.class, userId, startDate);
                return cnt != null && cnt > 0;
            });

            // egg_weekend: 토·일 같은 주 모두 공부
            // startDow: 1=Sun, 7=Sat
            if (startDow == 1 || startDow == 7) {
                tryAward(userId, "egg_weekend", out, () -> {
                    // Check if both Sat and Sun of the same week have sessions
                    String wkSql = """
                            SELECT COUNT(DISTINCT DAYOFWEEK(started_at))
                            FROM sessions
                            WHERE user_id = ?
                              AND YEARWEEK(started_at, 0) = YEARWEEK(?, 0)
                              AND DAYOFWEEK(started_at) IN (1, 7)
                            """;
                    Integer cnt = jdbcTemplate.queryForObject(wkSql, Integer.class, userId, startDate);
                    return cnt != null && cnt >= 2;
                });
            }
        }, userId);

        // 누적 focused_time (초) 조회
        String totalFocusSql = "SELECT COALESCE(SUM(focused_time), 0) FROM sessions WHERE user_id = ?";
        Long totalFocusedSec = jdbcTemplate.queryForObject(totalFocusSql, Long.class, userId);
        if (totalFocusedSec != null) {
            // study_10h: 누적 10시간
            tryAward(userId, "study_10h", out, () -> totalFocusedSec >= 36000L);
            // study_50h: 누적 50시간
            tryAward(userId, "study_50h", out, () -> totalFocusedSec >= 180000L);
            // study_100h: 누적 100시간
            tryAward(userId, "study_100h", out, () -> totalFocusedSec >= 360000L);
        }

        // focus_master: focus_rate >= 90%, 10분 이상 세션 10회
        tryAward(userId, "focus_master", out, () -> {
            String sql = """
                    SELECT COUNT(*) FROM sessions
                    WHERE user_id = ? AND focus_rate >= 90.0 AND (focused_time + distracted_time) >= 600
                    """;
            Integer cnt = jdbcTemplate.queryForObject(sql, Integer.class, userId);
            return cnt != null && cnt >= 10;
        });

        // streak checks
        int streak = calcCurrentStreak(userId);
        tryAward(userId, "streak_3",  out, () -> streak >= 3);
        tryAward(userId, "streak_7",  out, () -> streak >= 7);
        tryAward(userId, "streak_14", out, () -> streak >= 14);
        tryAward(userId, "streak_30", out, () -> streak >= 30);

        // group_session_10: 그룹 세션 10회 (group_id != null)
        tryAward(userId, "group_session_10", out, () -> {
            String sql = "SELECT COUNT(*) FROM sessions WHERE user_id = ? AND group_id IS NOT NULL";
            Integer cnt = jdbcTemplate.queryForObject(sql, Integer.class, userId);
            return cnt != null && cnt >= 10;
        });
    }

    // ── todo_complete trigger ────────────────────────────────────────────────

    private void checkTodoComplete(Long userId, List<Achievement> out) {
        // plan_first_todo: 할 일 첫 완료
        tryAward(userId, "plan_first_todo", out, () -> {
            String sql = "SELECT COUNT(*) FROM todos WHERE user_id = ? AND done = 1";
            Integer cnt = jdbcTemplate.queryForObject(sql, Integer.class, userId);
            return cnt != null && cnt >= 1;
        });

        // plan_todo_10: 할 일 10개 완료
        tryAward(userId, "plan_todo_10", out, () -> {
            String sql = "SELECT COUNT(*) FROM todos WHERE user_id = ? AND done = 1";
            Integer cnt = jdbcTemplate.queryForObject(sql, Integer.class, userId);
            return cnt != null && cnt >= 10;
        });

        // plan_todo_50: 할 일 50개 완료
        tryAward(userId, "plan_todo_50", out, () -> {
            String sql = "SELECT COUNT(*) FROM todos WHERE user_id = ? AND done = 1";
            Integer cnt = jdbcTemplate.queryForObject(sql, Integer.class, userId);
            return cnt != null && cnt >= 50;
        });

        // plan_perfect_day: 하루 할 일 전부 완료 (3개 이상)
        tryAward(userId, "plan_perfect_day", out, () -> {
            String sql = """
                    SELECT COUNT(*) FROM (
                        SELECT todo_date,
                               SUM(CASE WHEN done = 1 THEN 1 ELSE 0 END) AS done_cnt,
                               COUNT(*) AS total_cnt
                        FROM todos
                        WHERE user_id = ?
                        GROUP BY todo_date
                        HAVING total_cnt >= 3 AND done_cnt = total_cnt
                    ) t
                    """;
            Integer cnt = jdbcTemplate.queryForObject(sql, Integer.class, userId);
            return cnt != null && cnt >= 1;
        });

        // egg_planner: 하루 할 일 20개 이상 완료
        tryAward(userId, "egg_planner", out, () -> {
            String sql = """
                    SELECT COUNT(*) FROM (
                        SELECT todo_date,
                               SUM(CASE WHEN done = 1 THEN 1 ELSE 0 END) AS done_cnt
                        FROM todos
                        WHERE user_id = ?
                        GROUP BY todo_date
                        HAVING done_cnt >= 20
                    ) t
                    """;
            Integer cnt = jdbcTemplate.queryForObject(sql, Integer.class, userId);
            return cnt != null && cnt >= 1;
        });

        // plan_streak_plan: 7일 연속 할 일 추가
        tryAward(userId, "plan_streak_plan", out, () -> {
            String sql = "SELECT DISTINCT todo_date FROM todos WHERE user_id = ? ORDER BY todo_date DESC";
            List<LocalDate> dates = jdbcTemplate.query(sql, (rs, rowNum) ->
                    rs.getDate("todo_date").toLocalDate(), userId);
            return hasConsecutiveDays(dates, 7);
        });
    }

    // ── dday_add trigger ─────────────────────────────────────────────────────

    private void checkDdayAdd(Long userId, List<Achievement> out) {
        // plan_dday_add: D-Day 첫 추가
        tryAward(userId, "plan_dday_add", out, () -> true);
    }

    // ── block_add trigger ────────────────────────────────────────────────────

    private void checkBlockAdd(Long userId, List<Achievement> out) {
        // plan_block_10: 타임테이블 블록 10개 생성
        tryAward(userId, "plan_block_10", out, () -> {
            String sql = "SELECT COUNT(*) FROM timetable_blocks WHERE user_id = ?";
            Integer cnt = jdbcTemplate.queryForObject(sql, Integer.class, userId);
            return cnt != null && cnt >= 10;
        });
    }

    // ── group_join trigger ───────────────────────────────────────────────────

    private void checkGroupJoin(Long userId, List<Achievement> out) {
        // group_join: 첫 그룹 참여
        tryAward(userId, "group_join", out, () -> true);

        // group_chat_50: 채팅 50개
        tryAward(userId, "group_chat_50", out, () ->
                achievementRepository.getChatCount(userId) >= 50);
    }

    // ── group_create trigger ─────────────────────────────────────────────────

    private void checkGroupCreate(Long userId, List<Achievement> out) {
        // group_leader: 그룹 생성
        tryAward(userId, "group_leader", out, () -> true);
    }

    // ── chat trigger ─────────────────────────────────────────────────────────

    private void checkChat(Long userId, List<Achievement> out) {
        // group_chat_50: 채팅 50개
        tryAward(userId, "group_chat_50", out, () ->
                achievementRepository.getChatCount(userId) >= 50);
    }

    // ── Helper: tryAward ──────────────────────────────────────────────────────

    private void tryAward(Long userId, String achievementId, List<Achievement> out, Condition condition) {
        if (achievementRepository.hasAchievement(userId, achievementId)) return;
        try {
            if (condition.check()) {
                achievementRepository.award(userId, achievementId);
                // Verify it was actually inserted (not duplicate)
                if (achievementRepository.hasAchievement(userId, achievementId)) {
                    // Look up the achievement metadata
                    String sql = "SELECT achievement_id, name, description, category, icon, hidden FROM achievements WHERE achievement_id = ?";
                    List<Achievement> found = jdbcTemplate.query(sql, (rs, rowNum) -> {
                        Achievement a = new Achievement();
                        a.setAchievementId(rs.getString("achievement_id"));
                        a.setName(rs.getString("name"));
                        a.setDescription(rs.getString("description"));
                        a.setCategory(rs.getString("category"));
                        a.setIcon(rs.getString("icon"));
                        a.setHidden(rs.getBoolean("hidden"));
                        return a;
                    }, achievementId);
                    if (!found.isEmpty()) out.add(found.get(0));
                }
            }
        } catch (Exception e) {
            // Don't let achievement errors break the main flow
        }
    }

    // ── Helper: streak calculation ────────────────────────────────────────────

    private int calcCurrentStreak(Long userId) {
        String sql = "SELECT DISTINCT DATE(started_at) AS d FROM sessions WHERE user_id = ? ORDER BY d DESC";
        List<LocalDate> dates = jdbcTemplate.query(sql,
                (rs, rowNum) -> rs.getDate("d").toLocalDate(), userId);

        if (dates.isEmpty()) return 0;

        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);

        // Streak must include today or yesterday
        if (!dates.get(0).equals(today) && !dates.get(0).equals(yesterday)) return 0;

        int streak = 1;
        for (int i = 1; i < dates.size(); i++) {
            if (dates.get(i - 1).minusDays(1).equals(dates.get(i))) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    }

    private boolean hasConsecutiveDays(List<LocalDate> dates, int required) {
        if (dates.isEmpty()) return false;
        int consecutive = 1;
        for (int i = 1; i < dates.size(); i++) {
            if (dates.get(i - 1).minusDays(1).equals(dates.get(i))) {
                consecutive++;
                if (consecutive >= required) return true;
            } else {
                consecutive = 1;
            }
        }
        return consecutive >= required;
    }

    @FunctionalInterface
    private interface Condition {
        boolean check();
    }
}
