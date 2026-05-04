package com.watchman.repository;

import com.watchman.domain.Session;
import java.util.List;

public interface SessionRepository {

	// 해당 유저의 전체 세션 목록 조회 (stats 페이지 전체 히스토리)
	List<Session> findByUserId(Long userId);

	// 오늘 날짜의 세션만 조회 (대시보드 오늘 통계)
	List<Session> findTodayByUserId(Long userId);

	// 최근 7일간의 세션 조회 (주간 바 차트)
	List<Session> findWeekByUserId(Long userId);

	// 최근 N개 세션 조회 (대시보드 최근 세션 목록, limit=3)
	List<Session> findRecentByUserId(Long userId, int limit);

	// 새 세션 저장 (공부 종료 시 호출)
	void save(Session session);
}
