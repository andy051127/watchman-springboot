package com.watchman.config;

import com.watchman.domain.User;
import com.watchman.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements ApplicationRunner {

    private UserRepository userRepository;
    private BCryptPasswordEncoder passwordEncoder;
    private JdbcTemplate jdbcTemplate;

    @Autowired public void setUserRepository(UserRepository r)          { this.userRepository = r; }
    @Autowired public void setPasswordEncoder(BCryptPasswordEncoder e)  { this.passwordEncoder = e; }
    @Autowired public void setJdbcTemplate(JdbcTemplate t)              { this.jdbcTemplate = t; }

    @Override
    public void run(ApplicationArguments args) {
        migrateAdminPassword();
        migrateSessionsNameColumn();
        migrateSessionsGroupIdColumn();
        insertAchievementData();
    }

    private void migrateAdminPassword() {
        try {
            User admin = userRepository.findByEmail("admin@watchman.com");
            if (!admin.getPassword().startsWith("$2")) {
                userRepository.updatePassword(admin.getUserId(), passwordEncoder.encode(admin.getPassword()));
            }
        } catch (EmptyResultDataAccessException ignored) {}
    }

    private void migrateSessionsNameColumn() {
        if (columnMissing("sessions", "name")) {
            jdbcTemplate.execute("ALTER TABLE sessions ADD COLUMN name VARCHAR(100) NOT NULL DEFAULT '' AFTER user_id");
        }
    }

    private void migrateSessionsGroupIdColumn() {
        if (columnMissing("sessions", "group_id")) {
            jdbcTemplate.execute("ALTER TABLE sessions ADD COLUMN group_id BIGINT NULL AFTER started_at");
        }
    }

    private boolean columnMissing(String table, String column) {
        String sql = """
            SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
            """;
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, table, column);
        return count == null || count == 0;
    }

    /** 30개 업적 마스터 데이터 — 없는 것만 INSERT */
    private void insertAchievementData() {
        String sql = "INSERT IGNORE INTO achievements (achievement_id, name, description, category, icon, hidden) VALUES (?,?,?,?,?,?)";
        Object[][] data = {
            // 공부시간
            {"study_first",  "첫 걸음",       "첫 번째 스터디 세션을 완료했어요.",        "study",   "📖", 0},
            {"study_1h",     "한 시간의 집중", "단일 세션 1시간 이상 공부했어요.",         "study",   "⏱", 0},
            {"study_3h",     "마라토너",       "단일 세션 3시간 이상 공부했어요.",         "study",   "🏃", 0},
            {"study_10h",    "10시간 돌파",    "누적 공부 시간 10시간을 달성했어요.",      "study",   "🔥", 0},
            {"study_50h",    "공부 중독자",    "누적 공부 시간 50시간을 달성했어요.",      "study",   "💪", 0},
            {"study_100h",   "전설",           "누적 공부 시간 100시간을 달성했어요.",     "study",   "👑", 0},
            // 집중률
            {"focus_50",     "집중의 시작",    "집중률 50% 이상 세션을 달성했어요.",       "focus",   "🎯", 0},
            {"focus_80",     "예리한 집중",    "집중률 80% 이상 세션을 달성했어요.",       "focus",   "🔍", 0},
            {"focus_95",     "완벽",           "집중률 95% 이상 세션을 달성했어요.",       "focus",   "⭐", 0},
            {"focus_master", "집중 마스터",    "집중률 90% 이상 세션을 10회 달성했어요.", "focus",   "🧘", 0},
            // 연속출석
            {"streak_3",     "3일 연속",       "3일 연속 공부 세션을 완료했어요.",         "streak",  "📅", 0},
            {"streak_7",     "1주일 전사",     "7일 연속 공부 세션을 완료했어요.",         "streak",  "🗓", 0},
            {"streak_14",    "2주 전사",       "14일 연속 공부 세션을 완료했어요.",        "streak",  "💫", 0},
            {"streak_30",    "불굴",           "30일 연속 공부 세션을 완료했어요.",        "streak",  "🏆", 0},
            // 그룹
            {"group_join",       "첫 그룹",   "스터디 그룹에 처음 참여했어요.",           "group",   "👥", 0},
            {"group_leader",     "방장",      "스터디 그룹을 처음 만들었어요.",           "group",   "👑", 0},
            {"group_session_10", "함께라면",  "그룹 스터디 세션을 10회 완료했어요.",      "group",   "🤝", 0},
            {"group_chat_50",    "수다쟁이",  "스터디룸에서 채팅을 50개 전송했어요.",     "group",   "💬", 0},
            // 플래너
            {"plan_first_todo",  "계획의 시작",   "할 일을 처음으로 완료했어요.",               "planner", "📝", 0},
            {"plan_todo_10",     "할 일 정복자",  "할 일 10개를 완료했어요.",                   "planner", "✅", 0},
            {"plan_todo_50",     "계획왕",        "할 일 50개를 완료했어요.",                   "planner", "📋", 0},
            {"plan_perfect_day", "완벽한 하루",   "하루 할 일을 전부 완료했어요. (3개 이상)",   "planner", "🌟", 0},
            {"plan_dday_add",    "D-Day 설정",    "D-Day를 처음으로 추가했어요.",               "planner", "🎯", 0},
            {"plan_block_10",    "타임블로커",    "타임테이블 블록을 10개 만들었어요.",         "planner", "🗂", 0},
            {"plan_streak_plan", "꾸준한 계획자", "7일 연속 할 일을 추가했어요.",               "planner", "📆", 0},
            // 이스터에그
            {"egg_dawn",     "새벽 올빼미",  "새벽 3~5시에 공부 세션을 시작했어요.",        "easter",  "🦉", 1},
            {"egg_weekend",  "주말 전사",    "같은 주 토·일 모두 공부했어요.",              "easter",  "🏖", 1},
            {"egg_planner",  "완벽주의자",   "하루에 할 일 20개 이상을 완료했어요.",        "easter",  "🎪", 1},
            {"egg_dday",     "D-Day 영웅",   "D-Day 당일 공부 세션을 완료했어요.",          "easter",  "🎉", 1},
            {"egg_midnight", "자정의 학자",  "자정(00:00~00:30)에 세션을 시작했어요.",     "easter",  "🌙", 1},
        };
        for (Object[] row : data) {
            jdbcTemplate.update(sql, row);
        }
    }
}
