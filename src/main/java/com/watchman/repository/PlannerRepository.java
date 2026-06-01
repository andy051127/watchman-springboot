package com.watchman.repository;

import com.watchman.domain.DDay;
import com.watchman.domain.TimetableBlock;
import com.watchman.domain.Todo;

import java.time.LocalDate;
import java.util.List;

public interface PlannerRepository {

	// ── Todo ───────────────────────────────────────────────────────

	// 특정 날짜의 할 일 목록 조회 (플래너 달력에서 날짜 클릭 시 사용)
	List<Todo> findTodosByDate(Long userId, LocalDate date);

	// 특정 월의 할 일 전체 조회 (달력 미리보기용)
	List<Todo> findTodosByMonth(Long userId, LocalDate monthStart, LocalDate monthEnd);

	// 새 할 일 추가
	void saveTodo(Todo todo);

	// 할 일 완료 여부(done) 변경 (체크박스 클릭 시 사용)
	void updateTodoDone(Long todoId, boolean done);

	// 할 일 삭제
	void deleteTodo(Long todoId);

	// ── DDay ───────────────────────────────────────────────────────

	// 해당 유저의 전체 D-Day 목록 조회 (날짜 오름차순)
	List<DDay> findDDaysByUserId(Long userId);

	// 새 D-Day 추가
	void saveDDay(DDay dday);

	// D-Day 삭제
	void deleteDDay(Long ddayId);
	
	// ── TimetableBlock ─────────────────────────────────────────

	// 특정 날짜의 블록 전체 조회 (start_time 오름차순)
	List<TimetableBlock> findBlocksByDate(Long userId, LocalDate date);

	// 블록 INSERT
	void saveBlock(TimetableBlock block);

	// 블록 UPDATE (color, label, start_time, end_time 수정)
	void updateBlock(TimetableBlock block);

	// 블록 DELETE
	void deleteBlock(Long blockId, Long userId);
}
