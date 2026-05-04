package com.watchman.repository;

import com.watchman.domain.DDay;
import com.watchman.domain.Timetable;
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

	// ── Timetable ──────────────────────────────────────────────────

	// 특정 날짜의 시간표 조회
	// ORDER BY hour_slot ASC: 0시 → 23시 순으로 정렬하여 반환
	@Override
	public List<Timetable> findTimetableByDate(Long userId, LocalDate date) {
		String sql = "SELECT timetable_id, user_id, table_date, hour_slot, content " +
				     "FROM timetable WHERE user_id = ? AND table_date = ? ORDER BY hour_slot ASC";
		return this.template.query(sql,
				BeanPropertyRowMapper.newInstance(Timetable.class), userId, date);
	}

	// 시간표 행 INSERT (해당 날짜·시간 슬롯에 처음 내용을 입력할 때)
	@Override
	public void saveTimetable(Timetable timetable) {
		String sql = "INSERT INTO timetable (user_id, table_date, hour_slot, content) " +
				     "VALUES (?, ?, ?, ?)";
		this.template.update(sql,
				timetable.getUserId(), timetable.getTableDate(),
				timetable.getHourSlot(), timetable.getContent());
	}

	// 시간표 내용 UPDATE (이미 존재하는 슬롯의 내용을 바꿀 때)
	// user_id + table_date + hour_slot 3개 조건으로 정확한 1행을 특정
	@Override
	public void updateTimetable(Timetable timetable) {
		String sql = "UPDATE timetable SET content = ? " +
				     "WHERE user_id = ? AND table_date = ? AND hour_slot = ?";
		this.template.update(sql,
				timetable.getContent(), timetable.getUserId(),
				timetable.getTableDate(), timetable.getHourSlot());
	}
}
