-- ============================================================
--  Watchman — 서버 시작 시 자동 실행되는 스키마 초기화 파일
--  모두 IF NOT EXISTS 조건이므로 기존 데이터는 유지됩니다.
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    user_id    BIGINT       NOT NULL AUTO_INCREMENT,
    email      VARCHAR(255) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    nickname   VARCHAR(100) NOT NULL,
    avatar     MEDIUMTEXT   DEFAULT NULL,
    streak     INT          NOT NULL DEFAULT 0,
    is_admin   TINYINT(1)   NOT NULL DEFAULT 0,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


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

-- 스터디 그룹
CREATE TABLE IF NOT EXISTS study_groups (
    group_id    BIGINT       NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(500) DEFAULT NULL,
    invite_code VARCHAR(10)  NOT NULL UNIQUE,
    leader_id   BIGINT       NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id),
    FOREIGN KEY (leader_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS group_members (
    group_id BIGINT NOT NULL,
    user_id  BIGINT NOT NULL,
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES study_groups(group_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES users(user_id)         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- timetable_blocks: 플래너 드래그 블록 (시작시간·끝시간·색상·텍스트)
CREATE TABLE IF NOT EXISTS timetable_blocks (
  block_id    BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT       NOT NULL,
  block_date  DATE         NOT NULL,
  start_time  TIME         NOT NULL,
  end_time    TIME         NOT NULL,
  color       VARCHAR(20)  NOT NULL DEFAULT '#bfdbfe',
  label       VARCHAR(200) NOT NULL DEFAULT '',
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

