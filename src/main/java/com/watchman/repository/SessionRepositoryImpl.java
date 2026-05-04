package com.watchman.repository;

import com.watchman.domain.Session;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class SessionRepositoryImpl implements SessionRepository {

	private JdbcTemplate template;

	// servlet-context.xml에 등록된 JdbcTemplate Bean을 주입받음
	@Autowired
	public void setJdbcTemplate(JdbcTemplate template) {
		this.template = template;
	}

	// 해당 유저의 전체 세션을 최신순으로 조회
	// query(): 결과가 0행 이상일 때 사용, List로 반환
	@Override
	public List<Session> findByUserId(Long userId) {
		String sql = "SELECT session_id, user_id, focused_time, distracted_time, focus_rate, started_at " +
				     "FROM sessions WHERE user_id = ? ORDER BY started_at DESC";
		return this.template.query(sql,
				BeanPropertyRowMapper.newInstance(Session.class), userId);
	}

	// 오늘 날짜(CURDATE())와 일치하는 세션만 조회
	// DATE(started_at): datetime에서 날짜 부분만 추출하여 비교
	@Override
	public List<Session> findTodayByUserId(Long userId) {
		String sql = "SELECT session_id, user_id, focused_time, distracted_time, focus_rate, started_at " +
				     "FROM sessions WHERE user_id = ? AND DATE(started_at) = CURDATE()";
		return this.template.query(sql,
				BeanPropertyRowMapper.newInstance(Session.class), userId);
	}

	// 현재 시각 기준 7일 이내의 세션 조회
	// DATE_SUB(NOW(), INTERVAL 7 DAY): 현재 시각에서 7일을 뺀 날짜
	@Override
	public List<Session> findWeekByUserId(Long userId) {
		String sql = "SELECT session_id, user_id, focused_time, distracted_time, focus_rate, started_at " +
				     "FROM sessions WHERE user_id = ? AND started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
		return this.template.query(sql,
				BeanPropertyRowMapper.newInstance(Session.class), userId);
	}

	// 최근 세션을 N개만 조회
	// LIMIT ?: 가져올 최대 행 수를 동적으로 지정 (보통 3개)
	@Override
	public List<Session> findRecentByUserId(Long userId, int limit) {
		String sql = "SELECT session_id, user_id, focused_time, distracted_time, focus_rate, started_at " +
				     "FROM sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT ?";
		return this.template.query(sql,
				BeanPropertyRowMapper.newInstance(Session.class), userId, limit);
	}

	// 세션 INSERT (공부 종료 시 집중 시간, 딴짓 시간, 집중률을 저장)
	// started_at은 DEFAULT CURRENT_TIMESTAMP이므로 INSERT 시 별도 입력 불필요
	@Override
	public void save(Session session) {
		String sql = "INSERT INTO sessions (user_id, focused_time, distracted_time, focus_rate) " +
				     "VALUES (?, ?, ?, ?)";
		this.template.update(sql,
				session.getUserId(),
				session.getFocusedTime(),
				session.getDistractedTime(),
				session.getFocusRate());
	}
}
