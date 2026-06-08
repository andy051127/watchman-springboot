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
- MariaDB 10.11+ running locally with database `watchman`, user `watchman_db` / password `watchman1234`
- Schema is auto-initialized from `schema.sql` on every startup (`spring.sql.init.mode=always`)

## Architecture

**Spring Boot 3.5 MVC** with a clean 3-tier architecture: Controller → Service (interface + impl) → Repository (interface + impl).

- **Package root:** `com.watchman`
- **Context path:** `/watchman`
- **API prefix:** `/watchman/api/*`
- **Auth:** HTTP session-based; `userId` stored in `HttpSession` after login

### Layers

| Layer | Package | Notes |
|-------|---------|-------|
| Controllers | `controller/` | REST endpoints; return `ResponseEntity` |
| Services | `service/` | Business logic; interface + `Impl` class |
| Repositories | `repository/` | JDBC via `JdbcTemplate`; interface + `Impl` class |
| Domain | `domain/` | Plain Java objects (no JPA) |

### Domain Models

`User`, `Session` (study session), `Todo`, `DDay`, `TimetableBlock`, `Notice`, `Contact`, `StudyGroup`, `StudyGroupMember`

### Frontend

Static files in `src/main/resources/static/`. Vanilla HTML/CSS/JS — no build step, no framework. Pages communicate with backend via `fetch()` REST calls. Shared navigation via `nav.js`.

Key JS files: `auth-guard.js` (session protection), `nav.js` (common header), per-page JS files matching HTML filenames.

### Database

MariaDB; all queries use plain JDBC (`JdbcTemplate`). Schema in `src/main/resources/schema.sql` — uses `IF NOT EXISTS` and includes `ALTER TABLE` migration statements for column additions. Default admin: `admin@watchman.com` / `admin1234!`.

### WebSocket

STOMP over WebSocket (`/ws` endpoint, SockJS fallback). `WebSocketConfig` 설정. `StudyRoomController`가 4채널 브로드캐스트 처리:
- `/topic/room/{groupId}/presence` — 입장/퇴장
- `/topic/room/{groupId}/focus` — 집중 상태
- `/topic/room/{groupId}/chat` — 채팅
- `/topic/room/{groupId}/signal` — WebRTC 시그널링

프론트엔드는 SockJS + stomp.js v2 (CDN) 사용.
