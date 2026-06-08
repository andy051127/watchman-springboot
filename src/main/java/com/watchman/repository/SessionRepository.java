package com.watchman.repository;

import com.watchman.domain.Session;
import java.math.BigDecimal;
import java.util.List;

public interface SessionRepository {

	List<Session> findByUserId(Long userId);
	List<Session> findTodayByUserId(Long userId);
	List<Session> findWeekByUserId(Long userId);
	List<Session> findRecentByUserId(Long userId, int limit);

	// 페이지네이션 조회 (세션 선택 모달)
	List<Session> findByUserIdPaged(Long userId, int limit, int offset);
	int countByUserId(Long userId);

	// 단건 조회 (이어하기 시 초기값 로드)
	Session findById(Long sessionId, Long userId);

	// 새 세션 INSERT
	void save(Session session);

	// 이어하기 UPDATE (focused_time, distracted_time, focus_rate 덮어쓰기)
	void update(Long sessionId, Long userId, int focusedTime, int distractedTime, BigDecimal focusRate);
}
