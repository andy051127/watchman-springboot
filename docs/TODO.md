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