package com.watchman.repository;

import com.watchman.domain.DDay;
import com.watchman.domain.TimetableBlock;
import com.watchman.domain.Todo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public class PlannerRepositoryImpl implements PlannerRepository {

	private JdbcTemplate template;

	// servlet-context.xml에 등록된 JdbcTemplate Bean을 주입받음
	@Autowired
	public void setJdbcTemplate(JdbcTemplate template) {
		this.template = template;
	}

	// ── Todo ───────────────────────────────────────────────────────

	// 특정 날짜의 할 일 목록 조회
	// todo_date = ? : LocalDate가 SQL DATE 타입으로 자동 변환됨
	@Override
	public List<Todo> findTodosByDate(Long userId, LocalDate date) {
		String sql = "SELECT todo_id, user_id, todo_date, content, done " +
				     "FROM todos WHERE user_id = ? AND todo_date = ?";
		return this.template.query(sql,
				BeanPropertyRowMapper.newInstance(Todo.class), userId, date);
	}

	// 특정 월의 할 일 전체 조회 (달력 미리보기용)
	@Override
	public List<Todo> findTodosByMonth(Long userId, LocalDate monthStart, LocalDate monthEnd) {
		String sql = "SELECT todo_id, user_id, todo_date, content, done " +
				     "FROM todos WHERE user_id = ? AND todo_date BETWEEN ? AND ? ORDER BY todo_date, todo_id";
		return this.template.query(sql,
				BeanPropertyRowMapper.newInstance(Todo.class), userId, monthStart, monthEnd);
	}

	// 새 할 일 INSERT
	// done 컬럼은 DEFAULT 0(미완료)이므로 별도 입력 불필요
	@Override
	public void saveTodo(Todo todo) {
		String sql = "INSERT INTO todos (user_id, todo_date, content) VALUES (?, ?, ?)";
		this.template.update(sql,
				todo.getUserId(), todo.getTodoDate(), todo.getContent());
	}

	// 완료 여부(done) 만 UPDATE
	// done: true → 1(완료), false → 0(미완료) 으로 저장됨
	@Override
	public void updateTodoDone(Long todoId, boolean done) {
		String sql = "UPDATE todos SET done = ? WHERE todo_id = ?";
		this.template.update(sql, done, todoId);
	}

	// 할 일 DELETE
	@Override
	public void deleteTodo(Long todoId) {
		String sql = "DELETE FROM todos WHERE todo_id = ?";
		this.template.update(sql, todoId);
	}

	// ── DDay ───────────────────────────────────────────────────────

	// 해당 유저의 D-Day 전체 조회 (날짜가 가까운 순으로 정렬)
	@Override
	public List<DDay> findDDaysByUserId(Long userId) {
		String sql = "SELECT dday_id, user_id, name, dday_date " +
				     "FROM ddays WHERE user_id = ? ORDER BY dday_date ASC";
		return this.template.query(sql,
				BeanPropertyRowMapper.newInstance(DDay.class), userId);
	}

	// 새 D-Day INSERT
	@Override
	public void saveDDay(DDay dday) {
		String sql = "INSERT INTO ddays (user_id, name, dday_date) VALUES (?, ?, ?)";
		this.template.update(sql,
				dday.getUserId(), dday.getName(), dday.getDdayDate());
	}

	// D-Day DELETE
	@Override
	public void deleteDDay(Long ddayId) {
		String sql = "DELETE FROM ddays WHERE dday_id = ?";
		this.template.update(sql, ddayId);
	}

	// ── TimetableBlock ─────────────────────────────────────────

	@Override
	public List<TimetableBlock> findBlocksByDate(Long userId, LocalDate date) {
		String sql = "SELECT block_id, user_id, block_date, start_time, end_time, color, label " +
				     "FROM timetable_blocks WHERE user_id = ? AND block_date = ? ORDER BY start_time ASC";
		return this.template.query(sql,
				BeanPropertyRowMapper.newInstance(TimetableBlock.class), userId, date);
	}

	@Override
	public void saveBlock(TimetableBlock block) {
		String sql = "INSERT INTO timetable_blocks (user_id, block_date, start_time, end_time, color, label) " +
				     "VALUES (?, ?, ?, ?, ?, ?)";
		this.template.update(sql,
				block.getUserId(), block.getBlockDate(),
				block.getStartTime(), block.getEndTime(),
				block.getColor(), block.getLabel());
	}

	@Override
	public void updateBlock(TimetableBlock block) {
		String sql = "UPDATE timetable_blocks SET start_time = ?, end_time = ?, color = ?, label = ? " +
				     "WHERE block_id = ? AND user_id = ?";
		this.template.update(sql,
				block.getStartTime(), block.getEndTime(),
				block.getColor(), block.getLabel(),
				block.getBlockId(), block.getUserId());
	}

	@Override
	public void deleteBlock(Long blockId, Long userId) {
		String sql = "DELETE FROM timetable_blocks WHERE block_id = ? AND user_id = ?";
		this.template.update(sql, blockId, userId);
	}
}
