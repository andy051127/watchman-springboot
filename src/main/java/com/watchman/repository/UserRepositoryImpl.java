package com.watchman.repository;

import com.watchman.domain.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepositoryImpl implements UserRepository {

	private JdbcTemplate template;

	// servlet-context.xml에 등록된 JdbcTemplate Bean을 주입받음
	@Autowired
	public void setJdbcTemplate(JdbcTemplate template) {
		this.template = template;
	}

	// 이메일로 유저 1명 조회
	// queryForObject: 결과가 반드시 1행일 때 사용 (없으면 예외 발생)
	// BeanPropertyRowMapper: 컬럼명(snake_case) → 필드명(camelCase) 자동 매핑
	@Override
	public User findByEmail(String email) {
		String sql = "SELECT user_id, email, password, nickname, avatar, streak, is_admin, created_at " +
				     "FROM users WHERE email = ?";
		return this.template.queryForObject(sql,
				BeanPropertyRowMapper.newInstance(User.class), email);
	}

	// user_id로 유저 1명 조회
	@Override
	public User findById(Long userId) {
		String sql = "SELECT user_id, email, password, nickname, avatar, streak, is_admin, created_at " +
				     "FROM users WHERE user_id = ?";
		return this.template.queryForObject(sql,
				BeanPropertyRowMapper.newInstance(User.class), userId);
	}

	// 새 유저 INSERT (회원가입)
	// update(): INSERT / UPDATE / DELETE 에 사용, ?에 순서대로 값이 대입됨
	@Override
	public void save(User user) {
		String sql = "INSERT INTO users (email, password, nickname) VALUES (?, ?, ?)";
		this.template.update(sql,
				user.getEmail(), user.getPassword(), user.getNickname());
	}

	// 닉네임만 UPDATE
	@Override
	public void updateNickname(Long userId, String nickname) {
		String sql = "UPDATE users SET nickname = ? WHERE user_id = ?";
		this.template.update(sql, nickname, userId);
	}

	// 비밀번호만 UPDATE
	@Override
	public void updatePassword(Long userId, String password) {
		String sql = "UPDATE users SET password = ? WHERE user_id = ?";
		this.template.update(sql, password, userId);
	}

	// 아바타만 UPDATE
	@Override
	public void updateAvatar(Long userId, String avatar) {
		String sql = "UPDATE users SET avatar = ? WHERE user_id = ?";
		this.template.update(sql, avatar, userId);
	}

	// 전체 유저 조회 (관리자용)
	@Override
	public java.util.List<User> findAll() {
		String sql = "SELECT user_id, email, nickname, avatar, streak, is_admin, created_at FROM users ORDER BY created_at DESC";
		return this.template.query(sql, BeanPropertyRowMapper.newInstance(User.class));
	}

	// 관리자 여부 변경 (관리자용)
	@Override
	public void updateAdmin(Long userId, int isAdmin) {
		String sql = "UPDATE users SET is_admin = ? WHERE user_id = ?";
		this.template.update(sql, isAdmin, userId);
	}

	// 유저 DELETE — sessions, todos, ddays 등 연관 데이터도 CASCADE로 함께 삭제됨
	@Override
	public void delete(Long userId) {
		String sql = "DELETE FROM users WHERE user_id = ?";
		this.template.update(sql, userId);
	}
}
