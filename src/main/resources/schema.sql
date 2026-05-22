-- ============================================================
--  Watchman — 서버 시작 시 자동 실행되는 스키마 초기화 파일
--  모두 IF NOT EXISTS 조건이므로 기존 데이터는 유지됩니다.
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    user_id    BIGINT       NOT NULL AUTO_INCREMENT,
    email      VARCHAR(255) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    nickname   VARCHAR(100) NOT NULL,
    avatar     VARCHAR(50)  DEFAULT NULL,
    streak     INT          NOT NULL DEFAULT 0,
    is_admin   TINYINT(1)   NOT NULL DEFAULT 0,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 기존 DB에 is_admin 컬럼이 없으면 추가, role 컬럼이 있으면 제거
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE users DROP COLUMN IF EXISTS role;

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

CREATE TABLE IF NOT EXISTS todos (
    todo_id   BIGINT       NOT NULL AUTO_INCREMENT,
    user_id   BIGINT       NOT NULL,
    todo_date DATE         NOT NULL,
    content   VARCHAR(500) NOT NULL,
    done      TINYINT(1)   NOT NULL DEFAULT 0,
    PRIMARY KEY (todo_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ddays (
    dday_id   BIGINT       NOT NULL AUTO_INCREMENT,
    user_id   BIGINT       NOT NULL,
    name      VARCHAR(200) NOT NULL,
    dday_date DATE         NOT NULL,
    PRIMARY KEY (dday_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS timetable (
    timetable_id BIGINT       NOT NULL AUTO_INCREMENT,
    user_id      BIGINT       NOT NULL,
    table_date   DATE         NOT NULL,
    hour_slot    INT          NOT NULL,
    content      VARCHAR(500) NOT NULL,
    PRIMARY KEY (timetable_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

CREATE TABLE IF NOT EXISTS contacts (
    contact_id BIGINT       NOT NULL AUTO_INCREMENT,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(200) NOT NULL,
    type       VARCHAR(50)  NOT NULL,
    content    TEXT         NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (contact_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

-- ============================================================
--  기본 관리자 계정
--  서버 시작 시 존재하지 않으면 자동 생성됩니다.
--  비밀번호는 최초 로그인 후 마이페이지에서 변경하세요.
-- ============================================================
INSERT IGNORE INTO users (email, password, nickname, is_admin)
VALUES ('admin@watchman.com', 'admin1234!', '관리자', 1);
