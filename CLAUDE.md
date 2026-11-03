# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run application
./mvnw spring-boot:run          # macOS/Linux
mvnw.cmd spring-boot:run        # Windows

# Build
./mvnw clean package

# Run all tests
./mvnw test

# Run specific test
./mvnw test -Dtest=WatchmanApplicationTests
```

Application runs at `http://localhost:8080/watchman`.

## Prerequisites

- Java 25 (Amazon Corretto)
- MySQL running locally on **port 3308** with database `watchman`, user `watchman_db` / password `watchman1234`
- Schema is auto-initialized from `schema.sql` on every startup (`spring.sql.init.mode=always`)

## Architecture

**Spring Boot 3.5 MVC** with a clean 3-tier architecture: Controller → Service (interface + impl) → Repository (interface + impl).

- **Package root:** `com.watchman`
- **Context path:** `/watchman`
- **API prefix:** `/watchman/api/*`
- **Auth:** HTTP session-based; `userId` (Long) stored in `HttpSession` after login. Session timeout: 8h. Remember-me sets a 30-day persistent JSESSIONID cookie.

### Layers

| Layer | Package | Notes |
|-------|---------|-------|
| Controllers | `controller/` | REST endpoints; return `ResponseEntity` |
| Services | `service/` | Business logic; interface + `Impl` class |
| Repositories | `repository/` | JDBC via `JdbcTemplate`; interface + `Impl` class |
| Domain | `domain/` | Plain Java objects (no JPA) |

### Domain Models

`User`, `Session` (study session), `Todo`, `DDay`, `TimetableBlock`, `Notice`, `Contact`, `StudyGroup`, `StudyGroupMember`, `Achievement`, `UserAchievement`

### Database

No ORM — pure JDBC via `JdbcTemplate`. `BeanPropertyRowMapper` auto-maps snake_case columns to camelCase fields. Schema in `src/main/resources/schema.sql` uses `IF NOT EXISTS` + `ALTER TABLE` migration statements so it is idempotent.

**DataInitializer** (runs on startup): migrates the admin account password via BCrypt, adds any missing columns, and inserts all 30 achievement seed records. Default admin: `admin@watchman.com` / `admin1234!`.

### Response Conventions

- Success: `200 OK` with data or `Map.of("message", "...")`
- Auth required but missing: `401 Unauthorized`
- Admin-only endpoint accessed by non-admin: `403 Forbidden`
- Duplicate email / validation failure: `409 Conflict` or `400 Bad Request`
- Service-layer errors surface as `IllegalArgumentException` (business rule) or `IllegalStateException` (invalid state, e.g. kicking the leader).

### Achievement System

30 achievements across 5 categories (`study`, `focus`, `streak`, `group`, `planner`) plus hidden easter eggs. Achievements are checked via `AchievementService.checkAndAward(userId, triggerType)` called from multiple controllers after their primary action completes. Trigger types: `"session"`, `"todo_complete"`, `"dday_add"`, `"block_add"`, `"group_join"`, `"group_create"`, `"chat"`. New awards are returned in the API response under `"newAchievements"` and shown as toasts client-side via `achievement-toast.js`.

### Frontend

Static files in `src/main/resources/static/`. Vanilla HTML/CSS/JS — no build step, no framework. Pages communicate with the backend via `fetch()` REST calls.

**Auth guard pattern:** `auth-guard.js` fetches `/api/users/me` and exposes `window.__authReady` (a Promise). Protected pages `await window.__authReady` before rendering. Shared navigation rendered by `nav.js`.

### Focus Detection (client-side)

Study sessions detect distraction via face tracking done entirely in the browser — no backend ML/CV. `study-session.js` and `study-group-session.js` dynamically load `@mediapipe/tasks-vision` (FaceLandmarker, 478 landmarks) from a CDN and derive head yaw/pitch from landmarks each frame; exceeding a threshold counts as "distracted" time. `calibration.js` (standalone `/calibration.html` page, also reachable from the nav) runs a 10s natural-movement capture and computes personalized thresholds from the 5th/95th percentiles, stored in `sessionStorage`. Solo sessions reuse the stored calibration; group sessions recalibrate on each room entry (or via a manual nav button). Only the resulting `focusedTime`/`distractedTime` (seconds) are sent to the backend, which derives `focusRate` as a `BigDecimal`.

### WebSocket

STOMP over WebSocket (`/ws` endpoint, SockJS fallback). `StudyRoomController` broadcasts on 4 channels per group:
- `/topic/room/{groupId}/presence` — join/leave events
- `/topic/room/{groupId}/focus` — focus state updates
- `/topic/room/{groupId}/chat` — chat messages (also increments `chat_count` in `user_stats`)
- `/topic/room/{groupId}/signal` — WebRTC signaling

Frontend uses SockJS + stomp.js v2 (CDN).

### Notes

- Codebase comments are primarily in Korean.
- `BigDecimal` (HALF_UP, 2 decimal places) is used for focus rate calculations.
- `LocalDate` / `LocalDateTime` throughout — never `java.util.Date`.
