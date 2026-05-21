# DB 설계

## 기본 설정

- DB명: `watchman`
- 사용자: `watchman_db`
- 문자셋: `utf8mb4`

```sql
CREATE DATABASE watchman
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'watchman_db'@'localhost' IDENTIFIED BY 'watchman1234';
GRANT ALL PRIVILEGES ON watchman.* TO 'watchman_db'@'localhost';
FLUSH PRIVILEGES;
```

> 테이블은 서버 시작 시 `schema.sql`이 자동 실행되어 생성됩니다.

---

## 테이블 목록

### users — 사용자

| 컬럼 | 타입 | 설명 |
|---|---|---|
| user_id | BIGINT PK | 사용자 ID |
| email | VARCHAR(255) UNIQUE | 이메일 (로그인 ID) |
| password | VARCHAR(255) | 암호화된 비밀번호 |
| nickname | VARCHAR(100) | 닉네임 |
| avatar | MEDIUMTEXT | 아바타 이미지 (base64) |
| streak | INT | 연속 공부 일수 |
| role | VARCHAR(20) | 계정 역할 (`user` / `admin`) |
| created_at | TIMESTAMP | 가입일 |

```sql
CREATE TABLE IF NOT EXISTS users (
    user_id    BIGINT       NOT NULL AUTO_INCREMENT,
    email      VARCHAR(255) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    nickname   VARCHAR(100) NOT NULL,
    avatar     VARCHAR(50)  DEFAULT NULL,
    streak     INT          NOT NULL DEFAULT 0,
    role       VARCHAR(20)  NOT NULL DEFAULT 'user',
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### sessions — 스터디 세션 기록

| 컬럼 | 타입 | 설명 |
|---|---|---|
| session_id | BIGINT PK | 세션 ID |
| user_id | BIGINT FK | 사용자 ID |
| focused_time | INT | 집중 시간 (초) |
| distracted_time | INT | 이탈 시간 (초) |
| focus_rate | DOUBLE | 집중률 (%) |
| started_at | DATETIME | 세션 시작 시각 |

```sql
CREATE TABLE IF NOT EXISTS sessions (
    session_id      BIGINT   NOT NULL AUTO_INCREMENT,
    user_id         BIGINT   NOT NULL,
    focused_time    INT      NOT NULL DEFAULT 0,
    distracted_time INT      NOT NULL DEFAULT 0,
    focus_rate      DOUBLE   NOT NULL DEFAULT 0,
    started_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (session_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### todos — 플래너 할 일

| 컬럼 | 타입 | 설명 |
|---|---|---|
| todo_id | BIGINT PK | 할 일 ID |
| user_id | BIGINT FK | 사용자 ID |
| todo_date | DATE | 날짜 |
| content | VARCHAR(500) | 할 일 내용 |
| done | TINYINT(1) | 완료 여부 (0/1) |

```sql
CREATE TABLE IF NOT EXISTS todos (
    todo_id   BIGINT       NOT NULL AUTO_INCREMENT,
    user_id   BIGINT       NOT NULL,
    todo_date DATE         NOT NULL,
    content   VARCHAR(500) NOT NULL,
    done      TINYINT(1)   NOT NULL DEFAULT 0,
    PRIMARY KEY (todo_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### ddays — D-Day

| 컬럼 | 타입 | 설명 |
|---|---|---|
| dday_id | BIGINT PK | D-Day ID |
| user_id | BIGINT FK | 사용자 ID |
| name | VARCHAR(200) | D-Day 이름 |
| dday_date | DATE | 목표 날짜 |

```sql
CREATE TABLE IF NOT EXISTS ddays (
    dday_id   BIGINT       NOT NULL AUTO_INCREMENT,
    user_id   BIGINT       NOT NULL,
    name      VARCHAR(200) NOT NULL,
    dday_date DATE         NOT NULL,
    PRIMARY KEY (dday_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### timetable — 시간표

| 컬럼 | 타입 | 설명 |
|---|---|---|
| timetable_id | BIGINT PK | 시간표 ID |
| user_id | BIGINT FK | 사용자 ID |
| table_date | DATE | 날짜 |
| hour_slot | INT | 시간대 (0~23) |
| content | VARCHAR(500) | 내용 |

```sql
CREATE TABLE IF NOT EXISTS timetable (
    timetable_id BIGINT       NOT NULL AUTO_INCREMENT,
    user_id      BIGINT       NOT NULL,
    table_date   DATE         NOT NULL,
    hour_slot    INT          NOT NULL,
    content      VARCHAR(500) NOT NULL,
    PRIMARY KEY (timetable_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### contacts — 문의

| 컬럼 | 타입 | 설명 |
|---|---|---|
| contact_id | BIGINT PK | 문의 ID |
| name | VARCHAR(100) | 작성자 이름 |
| email | VARCHAR(200) | 작성자 이메일 |
| type | VARCHAR(50) | 유형 (`bug` / `feature` / `account` / `general` / `other`) |
| content | TEXT | 문의 내용 |
| created_at | DATETIME | 접수일 |

```sql
CREATE TABLE IF NOT EXISTS contacts (
    contact_id BIGINT       NOT NULL AUTO_INCREMENT,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(200) NOT NULL,
    type       VARCHAR(50)  NOT NULL,
    content    TEXT         NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (contact_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### notices — 공지사항

| 컬럼 | 타입 | 설명 |
|---|---|---|
| notice_id | BIGINT PK | 공지 ID |
| tag | VARCHAR(20) | 태그 (`공지` / `업데이트` / `이벤트`) |
| title | VARCHAR(200) | 제목 |
| content | TEXT | 내용 |
| pinned | TINYINT(1) | 고정 여부 (0/1) |
| writer_nickname | VARCHAR(100) | 작성자 닉네임 |
| created_at | DATETIME | 작성일 |

```sql
CREATE TABLE IF NOT EXISTS notices (
    notice_id       BIGINT       NOT NULL AUTO_INCREMENT,
    tag             VARCHAR(20)  NOT NULL DEFAULT '공지',
    title           VARCHAR(200) NOT NULL,
    content         TEXT         NOT NULL,
    pinned          TINYINT(1)   NOT NULL DEFAULT 0,
    writer_nickname VARCHAR(100) NOT NULL DEFAULT '관리자',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (notice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### timetable_blocks — 타임테이블 드래그 블록

| 컬럼 | 타입 | 설명 |
|---|---|---|
| block_id | BIGINT PK | 블록 ID |
| user_id | BIGINT FK | 사용자 ID |
| block_date | DATE | 날짜 |
| start_min | INT | 시작 시각 (자정 기준 분, 0~1439) |
| end_min | INT | 종료 시각 (자정 기준 분, 1~1440) |
| color | VARCHAR(20) | 블록 색상 (HEX) |
| content | VARCHAR(200) | 일정 이름 (선택) |

```sql
CREATE TABLE IF NOT EXISTS timetable_blocks (
    block_id   BIGINT       NOT NULL AUTO_INCREMENT,
    user_id    BIGINT       NOT NULL,
    block_date DATE         NOT NULL,
    start_min  INT          NOT NULL,
    end_min    INT          NOT NULL,
    color      VARCHAR(20)  NOT NULL DEFAULT '#bfdbfe',
    content    VARCHAR(200) DEFAULT NULL,
    PRIMARY KEY (block_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```
