# Watchman 기술 스택

## 언어

| 언어 | 버전 | 용도 |
|------|------|------|
| Java | 25 (Amazon Corretto) | 백엔드 서버 |
| HTML5 | - | 프론트엔드 마크업 |
| CSS3 | - | 프론트엔드 스타일 |
| JavaScript | ES2022+ | 프론트엔드 로직 |
| SQL | MySQL 방언 | 데이터베이스 쿼리 |

---

## 프레임워크 / 라이브러리

| 이름 | 버전 | 역할 |
|------|------|------|
| Spring Boot | 3.5.14 | 백엔드 애플리케이션 프레임워크 |
| Spring MVC | (Boot 내장) | REST API |
| Spring WebSocket | (Boot 내장) | STOMP 기반 실시간 통신 |
| Spring JDBC | (Boot 내장) | JdbcTemplate DB 접근 |
| Spring Security Crypto | (Boot 관리) | BCrypt 비밀번호 해싱 |
| SockJS | 1.6.1 (CDN) | WebSocket 폴백 |
| STOMP.js | 2.3.3 (CDN) | WebSocket 메시지 프로토콜 |
| MediaPipe Tasks Vision | 0.10.3 (CDN) | 얼굴 랜드마크 감지 |

---

## 데이터베이스

| 항목 | 값 |
|------|----|
| DBMS | MySQL 8.0 |
| 포트 | 3308 |
| DB명 | watchman |
| 접속 유저 | watchman_db |
| 드라이버 | mysql-connector-j |
| 커넥션 풀 | HikariCP (최대 10) |

---

## 서버 / 인프라

| 항목 | 값 |
|------|----|
| WAS | 내장 Tomcat (Spring Boot) |
| 포트 | 8080 |
| 컨텍스트 경로 | /watchman |
| 빌드 도구 | Maven (mvnw wrapper) |
| 배포 단위 | Executable JAR |
| 대상 인프라 | AWS EC2 + RDS MySQL |

---

## 개발 환경

| 항목 | 값 |
|------|----|
| OS | Windows 11 |
| JDK | Amazon Corretto 25 |
| DB 클라이언트 | MySQL Workbench 또는 CLI |
| 로컬 실행 | `mvnw.cmd spring-boot:run` |
| 접속 URL | `http://localhost:8080/watchman` |
