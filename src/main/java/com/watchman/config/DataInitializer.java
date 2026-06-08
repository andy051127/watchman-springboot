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

/**
 * 서버 시작 시 실행되는 마이그레이션.
 * 1. admin 계정 plain-text 비밀번호 → BCrypt 해싱
 * 2. sessions 테이블 name 컬럼 추가 (신규 MySQL DB에서는 schema.sql이 처리)
 */
@Component
public class DataInitializer implements ApplicationRunner {

    private UserRepository userRepository;
    private BCryptPasswordEncoder passwordEncoder;
    private JdbcTemplate jdbcTemplate;

    @Autowired
    public void setUserRepository(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Autowired
    public void setPasswordEncoder(BCryptPasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
    }

    @Autowired
    public void setJdbcTemplate(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        migrateAdminPassword();
        migrateSessionsNameColumn();
    }

    private void migrateAdminPassword() {
        try {
            User admin = userRepository.findByEmail("admin@watchman.com");
            if (!admin.getPassword().startsWith("$2")) {
                String hashed = passwordEncoder.encode(admin.getPassword());
                userRepository.updatePassword(admin.getUserId(), hashed);
            }
        } catch (EmptyResultDataAccessException ignored) {
        }
    }

    // MySQL은 ALTER TABLE ... ADD COLUMN IF NOT EXISTS 미지원 → information_schema로 체크
    private void migrateSessionsNameColumn() {
        String check = """
                SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME   = 'sessions'
                  AND COLUMN_NAME  = 'name'
                """;
        Integer count = jdbcTemplate.queryForObject(check, Integer.class);
        if (count == null || count == 0) {
            jdbcTemplate.execute(
                "ALTER TABLE sessions ADD COLUMN name VARCHAR(100) NOT NULL DEFAULT '' AFTER user_id"
            );
        }
    }
}
