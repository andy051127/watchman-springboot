package com.watchman.service;

import com.watchman.domain.DDay;
import com.watchman.domain.Timetable;
import com.watchman.domain.Todo;
import com.watchman.repository.PlannerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class PlannerServiceImpl implements PlannerService {

    private PlannerRepository plannerRepository;

    @Autowired
    public void setPlannerRepository(PlannerRepository plannerRepository) {
        this.plannerRepository = plannerRepository;
    }

    // ── Todo ───────────────────────────────────────────────────────

    // 특정 날짜의 할 일 목록 조회
    @Override
    public List<Todo> getTodos(Long userId, LocalDate date) {
        return this.plannerRepository.findTodosByDate(userId, date);
    }

    // 할 일 추가
    @Override
    public void addTodo(Todo todo) {
        this.plannerRepository.saveTodo(todo);
    }

    // 완료 여부 변경
    @Override
    public void toggleTodo(Long todoId, boolean done) {
        this.plannerRepository.updateTodoDone(todoId, done);
    }

    // 할 일 삭제
    @Override
    public void deleteTodo(Long todoId) {
        this.plannerRepository.deleteTodo(todoId);
    }

    // ── DDay ───────────────────────────────────────────────────────

    // D-Day 목록 조회
    @Override
    public List<DDay> getDDays(Long userId) {
        return this.plannerRepository.findDDaysByUserId(userId);
    }

    // D-Day 추가
    @Override
    public void addDDay(DDay dday) {
        this.plannerRepository.saveDDay(dday);
    }

    // D-Day 삭제
    @Override
    public void deleteDDay(Long ddayId) {
        this.plannerRepository.deleteDDay(ddayId);
    }

    // ── Timetable ──────────────────────────────────────────────────

    // 특정 날짜 시간표 조회
    @Override
    public List<Timetable> getTimetable(Long userId, LocalDate date) {
        return this.plannerRepository.findTimetableByDate(userId, date);
    }

    // 시간표 슬롯 저장
    @Override
    public void saveTimetable(Timetable timetable) {
        this.plannerRepository.saveTimetable(timetable);
    }

    // 시간표 슬롯 수정
    @Override
    public void updateTimetable(Timetable timetable) {
        this.plannerRepository.updateTimetable(timetable);
    }
}
