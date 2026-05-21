# Watchman — AWS 서비스 신청 정리

학교 AWS 지원을 받기 위한 서비스 목록 및 사용 근거입니다.

---

## 프로젝트 개요

**Watchman**은 웹캠 기반 집중도 측정 및 학습 관리 서비스입니다.
Spring Boot 백엔드 + Vanilla JS 프론트엔드로 구성되며,
아래 기능들이 현재 구현되어 있거나 향후 추가될 예정입니다.

| 구분 | 기능 |
|------|------|
| 현재 | 집중도 측정 (MediaPipe), 세션 기록, 플래너, 공지사항, 마이페이지, 관리자 페이지 |
| 예정 | 그룹 스터디 (실시간 집중 상태 공유, 카메라 공유), 업적 시스템 |

테스트 단계로 동시 접속 인원은 최대 5명 수준입니다.
Scale-out 없이 EC2 단일 인스턴스로 운영하며, 필요한 서비스만 최소한으로 사용합니다.

---

## 신청 AWS 서비스 목록

### 1. EC2 (Elastic Compute Cloud)
**용도:** Spring Boot 애플리케이션 서버 실행

- Spring Boot JAR 파일을 EC2 인스턴스에 배포하여 서비스 운영
- WebSocket 연결(그룹 스터디)을 위해 지속적으로 실행되는 서버 필요
- Nginx를 함께 설치하여 HTTPS(Let's Encrypt) 처리 및 리버스 프록시로 활용
- 권장 사양: `t3.small`

---

### 2. RDS (Relational Database Service) — MariaDB
**용도:** 주요 도메인 데이터 영구 저장

저장 데이터:
- `users` — 회원 정보, 관리자 여부
- `sessions` — 집중/딴짓 시간, 집중률
- `todos`, `timetable`, `ddays` — 플래너 데이터
- `notices`, `contacts` — 공지사항, 문의
- `user_achievements` — 업적 획득 기록 (예정)

로컬 MariaDB를 RDS로 전환 시 `application.properties`의 DB URL만 교체하면 됩니다.

---

### 3. ElastiCache — Redis 
**용도:** 그룹 스터디 실시간 메시지 브로드캐스트

- WebSocket으로 수신한 집중 상태 변경 이벤트를 같은 방 참가자 전체에게 전달
- EC2 단일 인스턴스 환경에서도 Spring의 WebSocket 메시지 브로커를 Redis로 위임하여 안정적인 Pub/Sub 처리

> 그룹 스터디 기능을 구현하지 않는다면 불필요합니다.

---

## 서비스 간 구성도

```
사용자 브라우저
      │ HTTPS / WSS
      ▼
   EC2 인스턴스
   ┌─────────────────────────┐
   │  Nginx (443)            │  ← Let's Encrypt 인증서 (무료, AWS 외부)
   │    │ 리버스 프록시       │
   │    ▼                    │
   │  Spring Boot (8080)     │
   └──────┬──────────────────┘
          │              │
          ▼              ▼
         RDS          ElastiCache
       (MariaDB)        (Redis)
```

---

## 기능별 필요 서비스 요약

| 기능 | EC2 | RDS | ElastiCache |
|------|:---:|:---:|:-----------:|
| 집중도 측정 (현재) | ✅ | ✅ | |
| 플래너 / 마이페이지 | ✅ | ✅ | |
| 그룹 스터디 (예정) | ✅ | ✅ | ✅ |
| 업적 시스템 (예정) | ✅ | ✅ | |
