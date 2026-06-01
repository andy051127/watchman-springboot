package com.watchman.controller;

import com.watchman.domain.DDay;
import com.watchman.domain.TimetableBlock;
import com.watchman.domain.Todo;
import com.watchman.service.PlannerService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/planner")
public class PlannerController {

    private PlannerService plannerService;

    @Autowired
    public void setPlannerService(PlannerService plannerService) {
        this.plannerService = plannerService;
    }

    private Long getSessionUserId(HttpSession session) {
        return (Long) session.getAttribute("userId");
    }

    // ── Todo ───────────────────────────────────────────────────────

    // 특정 날짜의 할 일 목록 조회
    // GET /api/planner/todos?date=2026-04-29
    @GetMapping("/todos")
    public ResponseEntity<?> getTodos(
            @RequestParam String date,
            HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }

        List<Todo> todos = this.plannerService.getTodos(userId, LocalDate.parse(date));
        return ResponseEntity.ok(todos);
    }

    // 특정 월 전체 할 일 조회 (달력 미리보기용)
    // GET /api/planner/todos/month?year=2026&month=5
    @GetMapping("/todos/month")
    public ResponseEntity<?> getTodosByMonth(
            @RequestParam int year,
            @RequestParam int month,
            HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }
        List<Todo> todos = this.plannerService.getTodosByMonth(userId, year, month);
        return ResponseEntity.ok(todos);
    }

    // 할 일 추가
    // POST /api/planner/todos
    // body: { "todoDate": "2026-04-29", "content": "수학 공부" }
    @PostMapping("/todos")
    public ResponseEntity<?> addTodo(@RequestBody Map<String, String> body, HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }

        Todo todo = new Todo();
        todo.setUserId(userId);
        todo.setTodoDate(LocalDate.parse(body.get("todoDate")));
        todo.setContent(body.get("content"));
        todo.setDone(false);
        this.plannerService.addTodo(todo);
        return ResponseEntity.ok(Map.of("message", "할 일이 추가되었습니다."));
    }

    // 할 일 완료 여부 변경 (체크박스 토글)
    // PATCH /api/planner/todos/{todoId}
    // body: { "done": true }
    @PatchMapping("/todos/{todoId}")
    public ResponseEntity<?> toggleTodo(
            @PathVariable Long todoId,
            @RequestBody Map<String, Boolean> body,
            HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }

        this.plannerService.toggleTodo(todoId, body.get("done"));
        return ResponseEntity.ok(Map.of("message", "완료 여부가 변경되었습니다."));
    }

    // 할 일 삭제
    // DELETE /api/planner/todos/{todoId}
    @DeleteMapping("/todos/{todoId}")
    public ResponseEntity<?> deleteTodo(@PathVariable Long todoId, HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }

        this.plannerService.deleteTodo(todoId);
        return ResponseEntity.ok(Map.of("message", "할 일이 삭제되었습니다."));
    }

    // ── DDay ───────────────────────────────────────────────────────

    // D-Day 목록 조회
    // GET /api/planner/ddays
    @GetMapping("/ddays")
    public ResponseEntity<?> getDDays(HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }

        List<DDay> ddays = this.plannerService.getDDays(userId);
        return ResponseEntity.ok(ddays);
    }

    // D-Day 추가
    // POST /api/planner/ddays
    // body: { "name": "수능", "ddayDate": "2026-11-19" }
    @PostMapping("/ddays")
    public ResponseEntity<?> addDDay(@RequestBody Map<String, String> body, HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }

        DDay dday = new DDay();
        dday.setUserId(userId);
        dday.setName(body.get("name"));
        dday.setDdayDate(LocalDate.parse(body.get("ddayDate")));
        this.plannerService.addDDay(dday);
        return ResponseEntity.ok(Map.of("message", "D-Day가 추가되었습니다."));
    }

    // D-Day 삭제
    // DELETE /api/planner/ddays/{ddayId}
    @DeleteMapping("/ddays/{ddayId}")
    public ResponseEntity<?> deleteDDay(@PathVariable Long ddayId, HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }

        this.plannerService.deleteDDay(ddayId);
        return ResponseEntity.ok(Map.of("message", "D-Day가 삭제되었습니다."));
    }

    // ── TimetableBlock ──────────────────────────────────────────────────────────────────────

    // 특정 날짜의 블록 전체 조회
    // GET /api/planner/blocks?date=2026-05-22
    @GetMapping("/blocks")
    public ResponseEntity<?> getBlocks(
            @RequestParam String date,
            HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }
        List<TimetableBlock> blocks = this.plannerService.getBlocks(userId, LocalDate.parse(date));
        return ResponseEntity.ok(blocks);
    }

    // 블록 생성
    // POST /api/planner/blocks
    // body: { "blockDate": "2026-05-22", "startTime": "09:00", "endTime": "09:35", "color": "#bfdbfe", "label": "수학" }
    @PostMapping("/blocks")
    public ResponseEntity<?> addBlock(@RequestBody Map<String, String> body, HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }
        TimetableBlock block = new TimetableBlock();
        block.setUserId(userId);
        block.setBlockDate(LocalDate.parse(body.get("blockDate")));
        block.setStartTime(java.time.LocalTime.parse(body.get("startTime")));
        block.setEndTime(java.time.LocalTime.parse(body.get("endTime")));
        block.setColor(body.get("color"));
        block.setLabel(body.getOrDefault("label", ""));
        this.plannerService.addBlock(block);
        return ResponseEntity.ok(Map.of("message", "블록이 생성되었습니다."));
    }

    // 블록 수정
    // PUT /api/planner/blocks/{blockId}
    // body: { "blockDate": "2026-05-22", "startTime": "09:00", "endTime": "09:35", "color": "#bfdbfe", "label": "수학" }
    @PutMapping("/blocks/{blockId}")
    public ResponseEntity<?> updateBlock(
            @PathVariable Long blockId,
            @RequestBody Map<String, String> body,
            HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }
        TimetableBlock block = new TimetableBlock();
        block.setBlockId(blockId);
        block.setUserId(userId);
        block.setBlockDate(LocalDate.parse(body.get("blockDate")));
        block.setStartTime(java.time.LocalTime.parse(body.get("startTime")));
        block.setEndTime(java.time.LocalTime.parse(body.get("endTime")));
        block.setColor(body.get("color"));
        block.setLabel(body.getOrDefault("label", ""));
        this.plannerService.updateBlock(block);
        return ResponseEntity.ok(Map.of("message", "블록이 수정되었습니다."));
    }

    // 블록 삭제
    // DELETE /api/planner/blocks/{blockId}
    @DeleteMapping("/blocks/{blockId}")
    public ResponseEntity<?> deleteBlock(@PathVariable Long blockId, HttpSession session) {
        Long userId = getSessionUserId(session);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }
        this.plannerService.deleteBlock(blockId, userId);
        return ResponseEntity.ok(Map.of("message", "블록이 삭제되었습니다."));
    }
}
