package com.watchman.service;

import com.watchman.domain.Session;
import java.util.List;

public interface SessionService {

    // 전체 세션 목록 조회 (stats 페이지 히스토리)
    List<Session> getSessions(Long userId);

    // 오늘 세션 목록 조회 (대시보드 오늘 통계)
    List<Session> getTodaySessions(Long userId);

    // 최근 7일 세션 조회 (주간 바 차트)
    List<Session> getWeekSessions(Long userId);

    // 최근 N개 세션 조회 (대시보드 최근 세션 목록)
    List<Session> getRecentSessions(Long userId, int limit);

    // 세션 저장 (공부 종료 시 호출)
    // focusRate는 서비스 계층에서 자동 계산: focusedTime / (focusedTime + distractedTime) × 100
    void saveSession(Long userId, int focusedTime, int distractedTime);
}
