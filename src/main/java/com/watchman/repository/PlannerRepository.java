package com.watchman.repository;

import com.watchman.domain.DDay;
import com.watchman.domain.Timetable;
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
	
	// ── Timetable ──────────────────────────────────────────────────

	// 특정 날짜의 시간표 전체 조회 (hour_slot 0~23 오름차순)
	List<Timetable> findTimetableByDate(Long userId, LocalDate date);

	// 시간표 행 추가 (해당 날짜·시간 슬롯에 처음 내용 입력할 때)
	void saveTimetable(Timetable timetable);

	// 시간표 내용 수정 (이미 존재하는 슬롯의 내용을 바꿀 때)
	void updateTimetable(Timetable timetable);

	// ── TimetableBlock (드래그 블록) ───────────────────────────

	List<TimetableBlock> findBlocksByDate(Long userId, LocalDate date);
	void saveBlock(TimetableBlock block);
	void deleteBlock(Long blockId);
}
