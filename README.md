# Watchman

카메라로 얼굴 방향을 감지해 공부 집중도를 실시간으로 분석하는 스터디 세션 관리 애플리케이션입니다.

---

## 개발 환경 설정 (처음 셋업하는 경우)

아래 순서대로 진행하면 어떤 PC에서도 동일한 개발 환경을 구성할 수 있습니다.

---

### 1. Java 25 설치 (Amazon Corretto 25)

이 프로젝트는 **Java 25**를 사용합니다.

1. Amazon Corretto 25 다운로드 페이지 접속:
   `https://docs.aws.amazon.com/corretto/latest/corretto-25-ug/downloads-list.html`
2. 운영체제에 맞는 설치 파일 다운로드 후 설치합니다.
   - **Windows**: `.msi` 파일 실행 → 기본 설정으로 설치
   - **macOS**: `.pkg` 파일 실행
   - **Linux**: 패키지 관리자 사용 (공식 문서 참고)
3. 설치 확인:
   ```bash
   java -version
   # 출력 예: openjdk version "25" ...
   ```
4. **환경 변수 설정** (Windows):
   - `시스템 환경 변수 편집` → `환경 변수` → `시스템 변수`
   - `JAVA_HOME` 변수 새로 만들기: `C:\Program Files\Amazon Corretto\jdk25.x.x_x` (실제 설치 경로)
   - `Path` 변수에 `%JAVA_HOME%\bin` 추가

---

### 2. VS Code 설치

1. `https://code.visualstudio.com` 에서 다운로드 후 설치합니다.

---

### 3. VS Code 확장(Extension) 설치

VS Code를 열고 왼쪽 사이드바의 **확장(Extensions)** 탭(`Ctrl+Shift+X`)에서 아래 확장을 검색해 설치합니다.

#### 필수 확장

| 확장 이름 | Extension ID | 설명 |
|---|---|---|
| Extension Pack for Java | `vscjava.vscode-java-pack` | Java 언어 지원, 디버거, Maven, 테스트 러너 포함 |
| Spring Boot Extension Pack | `vmware.vscode-boot-dev-pack` | Spring Boot Tools, Dashboard, Initializr 포함 |

설치 후 VS Code를 **재시작**합니다.

> **확인 방법**: 하단 상태바에 Java 버전이 표시되면 정상입니다.

---

### 4. MariaDB 설치

1. MariaDB 공식 사이트에서 다운로드:
   `https://mariadb.org/download/`
   - **버전**: 10.11 LTS 이상 권장
   - **Windows**: `.msi` 설치 파일 선택
2. 설치 마법사 진행:
   - `root` 계정의 비밀번호를 설정합니다 (기억해두세요).
   - `Install as service` 옵션을 체크해 Windows 서비스로 등록합니다.
   - `Enable networking` 옵션을 체크합니다 (기본 포트: 3306).
3. 설치 완료 후 **HeidiSQL** (MariaDB 설치 시 함께 설치됨)을 열어 `root` 계정으로 접속합니다.

---

### 5. 데이터베이스 및 사용자 생성

HeidiSQL 또는 터미널에서 MariaDB에 `root`로 접속한 후 아래 SQL을 순서대로 실행합니다.

#### 5-1. 데이터베이스 생성

```sql
CREATE DATABASE watchman
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

#### 5-2. 전용 사용자 생성 및 권한 부여

> 비밀번호(`'YOUR_PASSWORD'` 부분)는 팀에서 공유받은 값으로 교체하세요.

```sql
CREATE USER 'watchman_db'@'localhost' IDENTIFIED BY 'YOUR_PASSWORD';
GRANT ALL PRIVILEGES ON watchman.* TO 'watchman_db'@'localhost';
FLUSH PRIVILEGES;
```

#### 5-3. 테이블 생성 — 자동 처리됨

**별도로 실행할 필요 없습니다.**

서버를 시작하면 `src/main/resources/schema.sql` 파일이 자동으로 실행되어 필요한 테이블이 모두 생성됩니다.
모두 `CREATE TABLE IF NOT EXISTS`로 작성되어 있어 이미 테이블이 존재하면 건너뛰고, 기존 데이터는 유지됩니다.

> 생성되는 테이블: `users`, `sessions`, `todos`, `ddays`, `timetable`, `contacts`, `notices`, `study_groups`, `group_members`

---

### 6. 저장소 클론

```bash
git clone <저장소_URL>
cd watchman
```

---

### 7. `application.properties` 비밀번호 확인

`src/main/resources/application.properties` 파일에서 아래 항목의 비밀번호가 5-2단계에서 설정한 값과 일치하는지 확인합니다.

```properties
spring.datasource.username=watchman_db
spring.datasource.password=YOUR_PASSWORD   ← 팀에서 공유받은 값
```

---

### 8. VS Code에서 프로젝트 열기

1. VS Code → `파일` → `폴더 열기` → 클론한 `watchman` 폴더 선택
2. Java 확장이 프로젝트를 인식할 때까지 잠시 기다립니다 (하단 상태바에 로딩 표시).
3. Maven이 의존성을 자동으로 다운로드합니다 (최초 실행 시 수 분 소요).

---

### 9. 애플리케이션 실행

#### 방법 A — Spring Boot Dashboard (권장)

왼쪽 사이드바 하단의 **Spring Boot Dashboard** 패널에서 `watchman` 앱 옆 ▷ 버튼을 클릭합니다.

#### 방법 B — 터미널

```bash
# Windows
mvnw.cmd spring-boot:run

# macOS / Linux
./mvnw spring-boot:run
```

#### 실행 확인

브라우저에서 `http://localhost:8080/watchman` 접속 시 메인 페이지가 열리면 정상입니다.

---

## 주요 명령어

```bash
# 빌드
./mvnw clean package        # macOS/Linux
mvnw.cmd clean package      # Windows

# 전체 테스트 실행
./mvnw test

# 특정 테스트 클래스만 실행
./mvnw test -Dtest=WatchmanApplicationTests
```

---

## API 기본 정보

- **Base URL**: `http://localhost:8080/watchman`
- **API prefix**: `/watchman/api/*`
- **인증**: HTTP 세션 기반 (`userId` 세션 속성)

| 기능 | Base path |
|---|---|
| 인증 (로그인/회원가입/로그아웃) | `/api/auth` |
| 사용자 정보 | `/api/users` |
| 스터디 세션 | `/api/sessions` |
| 플래너 (할 일/D-Day/시간표) | `/api/planner` |
