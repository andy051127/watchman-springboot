package com.watchman.config;

import com.watchman.domain.User;
import com.watchman.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * 서버 시작 시 기존 plain-text 비밀번호를 BCrypt로 마이그레이션.
 * admin 계정: schema.sql의 INSERT IGNORE로 삽입된 plain-text 비밀번호를 해싱.
 */
@Component
public class DataInitializer implements ApplicationRunner {

    private UserRepository userRepository;
    private BCryptPasswordEncoder passwordEncoder;

    @Autowired
    public void setUserRepository(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Autowired
    public void setPasswordEncoder(BCryptPasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        migrateAdminPassword();
    }

    // BCrypt 해시는 항상 $2a$, $2b$, $2y$ 로 시작
    private void migrateAdminPassword() {
        try {
            User admin = userRepository.findByEmail("admin@watchman.com");
            if (!admin.getPassword().startsWith("$2")) {
                String hashed = passwordEncoder.encode(admin.getPassword());
                userRepository.updatePassword(admin.getUserId(), hashed);
            }
        } catch (EmptyResultDataAccessException ignored) {
            // admin 계정 없으면 skip
        }
    }
}
