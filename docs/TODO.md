# Watchman — TODO

앞으로 구현할 주요 기능 목록입니다.

---

## 1. 그룹 스터디 (Group Study)

여러 유저가 실시간으로 함께 공부하는 방 기능.

- 스터디 룸 생성 / 참가 / 퇴장
- 실시간 집중 상태 공유 (WebSocket)
- 서로의 카메라가 보임 (WebSocket)
- 참가자 목록 및 각자의 집중/딴짓 상태 표시
- 방장 권한 (강퇴, 방 종료 등)
- 그룹 세션 기록 저장 (선택)

**필요 기술:** WebSocket (`spring-boot-starter-websocket`), Redis Pub/Sub (ElastiCache — 그룹 스터디 구현 시 신청)
**인프라:** EC2 단일 인스턴스 + Nginx(HTTPS) + RDS + ElastiCache

---

## 2. 업적 시스템 (Achievement System)

특정 조건을 달성하면 게임 업적처럼 배지가 부여되는 기능.

- 업적 목록 정의 (예: 첫 세션 완료, 연속 7일 공부, 집중률 90% 달성 등)
- 조건 달성 시 자동 업적 부여
- 마이페이지 또는 별도 페이지에서 획득 업적 / 미획득 업적 표시
- 업적 획득 시 알림 (토스트 등)

**필요 기술:** `user_achievements` 테이블, 세션 저장 시점에 조건 체크 로직 (Service 레이어)
**인프라:** 추가 AWS 서비스 불필요 (EC2 + RDS로 충분)

