package com.watchman.service;

import com.watchman.domain.Session;
import com.watchman.repository.SessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
public class SessionServiceImpl implements SessionService {

    private SessionRepository sessionRepository;

    @Autowired
    public void setSessionRepository(SessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;
    }

    // 전체 세션 목록 조회
    @Override
    public List<Session> getSessions(Long userId) {
        return this.sessionRepository.findByUserId(userId);
    }

    // 오늘 세션 조회
    @Override
    public List<Session> getTodaySessions(Long userId) {
        return this.sessionRepository.findTodayByUserId(userId);
    }

    // 최근 7일 세션 조회
    @Override
    public List<Session> getWeekSessions(Long userId) {
        return this.sessionRepository.findWeekByUserId(userId);
    }

    // 최근 N개 세션 조회
    @Override
    public List<Session> getRecentSessions(Long userId, int limit) {
        return this.sessionRepository.findRecentByUserId(userId, limit);
    }

    // 세션 저장: focusRate를 직접 계산해서 Session 객체에 세팅 후 저장
    // 총 시간이 0이면 집중률 0으로 처리 (0 나누기 방지)
    @Override
    public void saveSession(Long userId, int focusedTime, int distractedTime) {
        int total = focusedTime + distractedTime;
        BigDecimal focusRate = BigDecimal.ZERO;
        if (total > 0) {
            focusRate = BigDecimal.valueOf(focusedTime)
                    .divide(BigDecimal.valueOf(total), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
        }

        Session session = new Session();
        session.setUserId(userId);
        session.setFocusedTime(focusedTime);
        session.setDistractedTime(distractedTime);
        session.setFocusRate(focusRate);
        this.sessionRepository.save(session);
    }
}
