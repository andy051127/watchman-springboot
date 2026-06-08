# MariaDB → MySQL 교체 가이드

AWS RDS는 MariaDB를 지원하지 않고 MySQL만 제공하므로, 로컬 개발 환경과 프로덕션 모두 MySQL로 전환한다.

---

## 목차

1. [MariaDB vs MySQL 차이 (이 프로젝트 기준)](#1-mariadb-vs-mysql-차이)
2. [로컬 MySQL 설치 (Windows)](#2-로컬-mysql-설치-windows)
3. [로컬 DB 초기 설정](#3-로컬-db-초기-설정)
4. [코드 변경사항](#4-코드-변경사항)
5. [AWS RDS MySQL 설정](#5-aws-rds-mysql-설정)
6. [application.properties 분리 (로컬 / 프로덕션)](#6-applicationproperties-분리)
7. [기존 MariaDB 데이터 이전 (선택)](#7-기존-mariadb-데이터-이전)
8. [체크리스트](#8-체크리스트)

---

## 1. MariaDB vs MySQL 차이

이 프로젝트에서 실제로 영향 받는 차이점만 정리.

| 항목 | MariaDB | MySQL 8.0 |
|------|---------|-----------|
| JDBC 드라이버 | `org.mariadb.jdbc.Driver` | `com.mysql.cj.jdbc.Driver` |
| JDBC URL prefix | `jdbc:mariadb://` | `jdbc:mysql://` |
| `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` | ✅ 지원 | ❌ 미지원 |
| `ALTER TABLE ... DROP COLUMN IF EXISTS` | ✅ 지원 | ❌ 미지원 |
| `INSERT IGNORE` | ✅ | ✅ |
| `TINYINT(1)` | ✅ | ✅ (경고 없음) |
| `MEDIUMTEXT` | ✅ | ✅ |
| `utf8mb4` charset | ✅ | ✅ |
| `ON DELETE CASCADE` | ✅ | ✅ |

**핵심:** `IF NOT EXISTS` / `IF EXISTS` in ALTER TABLE은 MariaDB 전용 문법. MySQL에서 실행하면 에러. schema.sql에서 제거 필요.

---

## 2. 로컬 MySQL 설치 (Windows)

### 방법 A: MySQL Installer (권장)

1. [MySQL Installer 다운로드](https://dev.mysql.com/downloads/installer/)
   - `mysql-installer-community-8.0.x.msi` 선택
2. 설치 유형: **Custom** 선택
3. 필요 제품만 선택:
   - MySQL Server 8.0.x
   - MySQL Workbench 8.0.x (선택)
4. 설치 진행 → **Root password 설정** (기억할 것)
5. Windows Service 이름: `MySQL80` (기본값 유지)
6. 설치 완료 후 서비스 자동 시작 확인

### 방법 B: ZIP 아카이브 (포터블)

1. [MySQL Community Server ZIP 다운로드](https://dev.mysql.com/downloads/mysql/)
2. 압축 해제 (예: `C:\mysql`)
3. `C:\mysql\bin\`을 환경변수 PATH에 추가
4. `C:\mysql\my.ini` 생성:
   ```ini
   [mysqld]
   basedir=C:/mysql
   datadir=C:/mysql/data
   port=3306
   ```
5. 초기화: `mysqld --initialize --console` (임시 root 비밀번호 콘솔 출력됨)
6. 서비스 등록: `mysqld --install`
7. 시작: `net start MySQL`

### 설치 확인

```bash
mysql -u root -p
# 비밀번호 입력 후 mysql> 프롬프트 나오면 성공
```

---

## 3. 로컬 DB 초기 설정

MySQL에 접속 후 아래 SQL 실행.

```sql
-- 데이터베이스 생성
CREATE DATABASE watchman CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 전용 계정 생성
CREATE USER 'watchman_db'@'localhost' IDENTIFIED BY 'watchman1234';

-- 권한 부여
GRANT ALL PRIVILEGES ON watchman.* TO 'watchman_db'@'localhost';
FLUSH PRIVILEGES;

-- 확인
SHOW DATABASES;
```

---

## 4. 코드 변경사항

### 4-1. pom.xml — 드라이버 교체

**기존:**
```xml
<dependency>
    <groupId>org.mariadb.jdbc</groupId>
    <artifactId>mariadb-java-client</artifactId>
    <scope>runtime</scope>
</dependency>
```

**변경:**
```xml
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
</dependency>
```

> `spring-boot-starter-parent`가 버전을 자동 관리하므로 `<version>` 태그 불필요.

---

### 4-2. application.properties — 드라이버·URL 변경

**기존:**
```properties
spring.datasource.driver-class-name=org.mariadb.jdbc.Driver
spring.datasource.url=jdbc:mariadb://localhost:3306/watchman?useUnicode=true&characterEncoding=UTF-8
```

**변경:**
```properties
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
spring.datasource.url=jdbc:mysql://localhost:3306/watchman?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Seoul
```

> MySQL은 `serverTimezone` 파라미터를 명시해야 타임존 에러가 없다.

---

### 4-3. schema.sql — MariaDB 전용 문법 제거

MySQL은 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`와 `DROP COLUMN IF EXISTS`를 지원하지 않는다. 이 구문들은 기존 MariaDB DB를 마이그레이션하기 위한 일회성 코드였으므로 제거한다.

**제거 대상 (기존 schema.sql의 마이그레이션 블록):**
```sql
-- 아래 3줄 삭제
ALTER TABLE users MODIFY COLUMN avatar MEDIUMTEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE users DROP COLUMN IF EXISTS role;
```

`MODIFY COLUMN`은 MySQL에서 지원하지만, 신규 MySQL DB에서는 `CREATE TABLE`에 이미 올바른 정의가 있으므로 불필요하다. 세 줄 모두 제거.

---

## 5. AWS RDS MySQL 설정

### 5-1. RDS 인스턴스 생성

1. AWS 콘솔 → RDS → **Create database**
2. 설정:
   - Engine: **MySQL**
   - Version: **8.0.x** (최신 8.0 권장)
   - Template: **Free tier** (개발/테스트) 또는 Production
   - DB instance identifier: `watchman-db`
   - Master username: `admin`
   - Master password: 안전한 비밀번호 설정
   - DB instance class: `db.t3.micro` (Free tier)
   - Storage: 20GB gp2
   - **Public access: Yes** (EC2에서 접근하는 경우 No, 로컬 테스트는 Yes)
3. VPC security group: 3306 포트 인바운드 허용
   - 소스: EC2 보안 그룹 or 개발 PC IP

### 5-2. RDS에서 DB/계정 생성

RDS endpoint로 접속:
```bash
mysql -h <rds-endpoint> -u admin -p
```

```sql
CREATE DATABASE watchman CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'watchman_db'@'%' IDENTIFIED BY 'watchman1234';
GRANT ALL PRIVILEGES ON watchman.* TO 'watchman_db'@'%';
FLUSH PRIVILEGES;
```

> 로컬과 달리 `@'%'`로 설정 (어느 호스트에서든 접속 허용).

### 5-3. RDS JDBC URL 형식

```
jdbc:mysql://<rds-endpoint>:3306/watchman?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Seoul
```

예시:
```
jdbc:mysql://watchman-db.xxxxxxxxx.ap-northeast-2.rds.amazonaws.com:3306/watchman?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Seoul
```

---

## 6. application.properties 분리

로컬 개발과 프로덕션(RDS)의 DB 정보를 분리 관리하는 방법.

### 방법: 프로파일 분리

**`src/main/resources/application.properties`** (공통 설정):
```properties
spring.application.name=watchman
server.port=8080
server.servlet.context-path=/watchman
server.servlet.session.timeout=8h

spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.connection-timeout=30000

spring.sql.init.mode=always
spring.sql.init.schema-locations=classpath:schema.sql

spring.jackson.serialization.write-dates-as-timestamps=false

logging.level.com.watchman=DEBUG
logging.level.org.springframework.web=DEBUG
logging.level.org.springframework.jdbc.core=DEBUG
```

**`src/main/resources/application-local.properties`** (로컬 개발):
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/watchman?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Seoul
spring.datasource.username=watchman_db
spring.datasource.password=watchman1234
```

**`src/main/resources/application-prod.properties`** (AWS 프로덕션):
```properties
spring.datasource.url=jdbc:mysql://<rds-endpoint>:3306/watchman?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Seoul
spring.datasource.username=watchman_db
spring.datasource.password=<실제 비밀번호>
# 프로덕션에서는 로그 레벨 낮춤
logging.level.com.watchman=INFO
logging.level.org.springframework.web=WARN
logging.level.org.springframework.jdbc.core=WARN
```

### 프로파일 활성화

**로컬 실행:**
```bash
mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
```

**EC2 JAR 실행:**
```bash
java -jar watchman-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
```

> `application-prod.properties`에 비밀번호가 있으므로 `.gitignore`에 추가:
> ```
> src/main/resources/application-prod.properties
> ```

---

## 7. 기존 MariaDB 데이터 이전 (선택)

기존 MariaDB의 데이터를 MySQL로 옮겨야 할 경우.

### mysqldump 사용

**MariaDB에서 덤프:**
```bash
mysqldump -u watchman_db -p watchman \
  --no-tablespaces \
  --column-statistics=0 \
  --result-file=watchman_dump.sql
```

**MySQL에 임포트:**
```bash
mysql -u watchman_db -p watchman < watchman_dump.sql
```

### 주의사항

- 덤프 파일에 `ALTER TABLE ... IF NOT EXISTS` 구문이 없는지 확인
- `schema.sql`이 `spring.sql.init.mode=always`로 실행되므로, 임포트 전 테이블이 이미 생성됨. 데이터만 임포트하려면:
  ```bash
  mysqldump -u watchman_db -p watchman --no-create-info --result-file=data_only.sql
  mysql -u watchman_db -p watchman < data_only.sql
  ```

---

## 8. 체크리스트

### 로컬 전환

- [ ] MySQL 8.0 설치 완료
- [ ] `watchman` DB + `watchman_db` 계정 생성
- [ ] `pom.xml`: `mariadb-java-client` → `mysql-connector-j`
- [ ] `application.properties`: driver, URL, serverTimezone 변경
- [ ] `schema.sql`: MariaDB 전용 ALTER TABLE 3줄 제거
- [ ] `mvnw.cmd spring-boot:run` 정상 시작 확인
- [ ] 로그인, 그룹 생성, 세션 저장 정상 동작 확인

### AWS 배포

- [ ] RDS MySQL 8.0 인스턴스 생성
- [ ] 보안 그룹 3306 포트 개방
- [ ] RDS에 `watchman` DB + `watchman_db` 계정 생성
- [ ] `application-prod.properties` 작성 (gitignore 등록)
- [ ] EC2에서 `java -jar ... --spring.profiles.active=prod` 실행 확인
- [ ] `spring.sql.init.mode=always` → 첫 배포 후 `never`로 변경 권장 (불필요한 실행 방지)
