package com.watchman.service;

import com.watchman.domain.DDay;
import com.watchman.domain.Timetable;
import com.watchman.domain.TimetableBlock;
import com.watchman.domain.Todo;

import java.time.LocalDate;
import java.util.List;

public interface PlannerService {

    // ── Todo ───────────────────────────────────────────────────────

    // 특정 날짜의 할 일 목록 조회
    List<Todo> getTodos(Long userId, LocalDate date);

    // 특정 월의 할 일 전체 조회 (달력 미리보기용)
    List<Todo> getTodosByMonth(Long userId, int year, int month);

    // 할 일 추가
    void addTodo(Todo todo);

    // 할 일 완료 여부 변경 (체크박스 토글)
    void toggleTodo(Long todoId, boolean done);

    // 할 일 삭제
    void deleteTodo(Long todoId);

    // ── DDay ───────────────────────────────────────────────────────

    // D-Day 목록 조회
    List<DDay> getDDays(Long userId);

    // D-Day 추가
    void addDDay(DDay dday);

    // D-Day 삭제
    void deleteDDay(Long ddayId);

    // ── Timetable ──────────────────────────────────────────────────

    // 특정 날짜의 시간표 조회 (hour_slot 0~23 오름차순)
    List<Timetable> getTimetable(Long userId, LocalDate date);

    // 시간표 슬롯 저장 (처음 입력할 때)
    void saveTimetable(Timetable timetable);

    // 시간표 슬롯 수정 (이미 존재하는 슬롯 내용 변경)
    void updateTimetable(Timetable timetable);

    // ── TimetableBlock ─────────────────────────────────────────

    // 특정 날짜의 블록 전체 조회
    List<TimetableBlock> getBlocks(Long userId, LocalDate date);

    // 블록 생성
    void addBlock(TimetableBlock block);

    // 블록 수정
    void updateBlock(TimetableBlock block);

    // 블록 삭제
    void deleteBlock(Long blockId);
}
