package com.watchman.repository;

import com.watchman.domain.Session;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public class SessionRepositoryImpl implements SessionRepository {

	private JdbcTemplate template;

	@Autowired
	public void setJdbcTemplate(JdbcTemplate template) {
		this.template = template;
	}

	@Override
	public List<Session> findByUserId(Long userId) {
		String sql = "SELECT session_id, user_id, name, focused_time, distracted_time, focus_rate, started_at " +
				     "FROM sessions WHERE user_id = ? ORDER BY started_at DESC";
		return this.template.query(sql, BeanPropertyRowMapper.newInstance(Session.class), userId);
	}

	@Override
	public List<Session> findTodayByUserId(Long userId) {
		String sql = "SELECT session_id, user_id, name, focused_time, distracted_time, focus_rate, started_at " +
				     "FROM sessions WHERE user_id = ? AND DATE(started_at) = CURDATE()";
		return this.template.query(sql, BeanPropertyRowMapper.newInstance(Session.class), userId);
	}

	@Override
	public List<Session> findWeekByUserId(Long userId) {
		String sql = "SELECT session_id, user_id, name, focused_time, distracted_time, focus_rate, started_at " +
				     "FROM sessions WHERE user_id = ? AND started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
		return this.template.query(sql, BeanPropertyRowMapper.newInstance(Session.class), userId);
	}

	@Override
	public List<Session> findRecentByUserId(Long userId, int limit) {
		String sql = "SELECT session_id, user_id, name, focused_time, distracted_time, focus_rate, started_at " +
				     "FROM sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT ?";
		return this.template.query(sql, BeanPropertyRowMapper.newInstance(Session.class), userId, limit);
	}

	@Override
	public List<Session> findByUserIdPaged(Long userId, int limit, int offset) {
		String sql = "SELECT session_id, user_id, name, focused_time, distracted_time, focus_rate, started_at " +
				     "FROM sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT ? OFFSET ?";
		return this.template.query(sql, BeanPropertyRowMapper.newInstance(Session.class), userId, limit, offset);
	}

	@Override
	public int countByUserId(Long userId) {
		String sql = "SELECT COUNT(*) FROM sessions WHERE user_id = ?";
		Integer count = this.template.queryForObject(sql, Integer.class, userId);
		return count != null ? count : 0;
	}

	@Override
	public Session findById(Long sessionId, Long userId) {
		String sql = "SELECT session_id, user_id, name, focused_time, distracted_time, focus_rate, started_at " +
				     "FROM sessions WHERE session_id = ? AND user_id = ?";
		return this.template.queryForObject(sql, BeanPropertyRowMapper.newInstance(Session.class), sessionId, userId);
	}

	@Override
	public void save(Session session) {
		String sql = "INSERT INTO sessions (user_id, name, focused_time, distracted_time, focus_rate, group_id) " +
				     "VALUES (?, ?, ?, ?, ?, ?)";
		this.template.update(sql,
				session.getUserId(),
				session.getName(),
				session.getFocusedTime(),
				session.getDistractedTime(),
				session.getFocusRate(),
				session.getGroupId());
	}

	@Override
	public void update(Long sessionId, Long userId, int focusedTime, int distractedTime, BigDecimal focusRate) {
		String sql = "UPDATE sessions SET focused_time = ?, distracted_time = ?, focus_rate = ? " +
				     "WHERE session_id = ? AND user_id = ?";
		this.template.update(sql, focusedTime, distractedTime, focusRate, sessionId, userId);
	}
}
