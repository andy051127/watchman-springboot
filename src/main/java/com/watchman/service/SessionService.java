package com.watchman.service;

import com.watchman.domain.Session;
import java.util.List;
import java.util.Map;

public interface SessionService {

    List<Session> getSessions(Long userId);
    List<Session> getTodaySessions(Long userId);
    List<Session> getWeekSessions(Long userId);
    List<Session> getRecentSessions(Long userId, int limit);

    // 페이지네이션 조회 (세션 선택 모달) — { sessions, total, page, size }
    Map<String, Object> getSessionsPaged(Long userId, int page, int size);

    // 단건 조회 (이어하기 초기값 로드)
    Session getSession(Long sessionId, Long userId);

    // 새 세션 저장 (name 포함)
    void saveSession(Long userId, String name, int focusedTime, int distractedTime);

    // 이어하기 저장 (기존 세션에 누적)
    void updateSession(Long sessionId, Long userId, int focusedTime, int distractedTime);
}
