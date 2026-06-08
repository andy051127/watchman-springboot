package com.watchman.service;

import com.watchman.domain.Session;
import com.watchman.repository.SessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SessionServiceImpl implements SessionService {

    private SessionRepository sessionRepository;

    @Autowired
    public void setSessionRepository(SessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;
    }

    @Override
    public List<Session> getSessions(Long userId) {
        return this.sessionRepository.findByUserId(userId);
    }

    @Override
    public List<Session> getTodaySessions(Long userId) {
        return this.sessionRepository.findTodayByUserId(userId);
    }

    @Override
    public List<Session> getWeekSessions(Long userId) {
        return this.sessionRepository.findWeekByUserId(userId);
    }

    @Override
    public List<Session> getRecentSessions(Long userId, int limit) {
        return this.sessionRepository.findRecentByUserId(userId, limit);
    }

    @Override
    public Map<String, Object> getSessionsPaged(Long userId, int page, int size) {
        int offset = page * size;
        List<Session> sessions = this.sessionRepository.findByUserIdPaged(userId, size, offset);
        int total = this.sessionRepository.countByUserId(userId);

        Map<String, Object> result = new HashMap<>();
        result.put("sessions", sessions);
        result.put("total", total);
        result.put("page", page);
        result.put("size", size);
        return result;
    }

    @Override
    public Session getSession(Long sessionId, Long userId) {
        return this.sessionRepository.findById(sessionId, userId);
    }

    @Override
    public void saveSession(Long userId, String name, int focusedTime, int distractedTime) {
        saveSession(userId, name, focusedTime, distractedTime, null);
    }

    @Override
    public void saveSession(Long userId, String name, int focusedTime, int distractedTime, Long groupId) {
        String sessionName = (name != null && !name.isBlank())
                ? name
                : LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) + " 세션";

        Session session = new Session();
        session.setUserId(userId);
        session.setName(sessionName);
        session.setFocusedTime(focusedTime);
        session.setDistractedTime(distractedTime);
        session.setFocusRate(calcFocusRate(focusedTime, distractedTime));
        session.setGroupId(groupId);
        this.sessionRepository.save(session);
    }

    @Override
    public void updateSession(Long sessionId, Long userId, int focusedTime, int distractedTime) {
        BigDecimal focusRate = calcFocusRate(focusedTime, distractedTime);
        this.sessionRepository.update(sessionId, userId, focusedTime, distractedTime, focusRate);
    }

    private BigDecimal calcFocusRate(int focusedTime, int distractedTime) {
        int total = focusedTime + distractedTime;
        if (total == 0) return BigDecimal.ZERO;
        return BigDecimal.valueOf(focusedTime)
                .divide(BigDecimal.valueOf(total), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP);
    }
}
