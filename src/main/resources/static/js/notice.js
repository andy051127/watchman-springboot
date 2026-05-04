// notice.js — 공지사항 (아코디언)

// TODO: API 연동
// GET /api/notices → Notice[]

const NOTICES = [
  {
    id: 1,
    tag: '공지',
    title: 'Watchman 서비스 이용약관 안내',
    date: '2025-03-28',
    pinned: true,
    content: `Watchman을 이용해 주셔서 감사합니다.\n\n본 서비스는 카메라를 통해 사용자의 집중 상태를 감지하여 공부 효율을 높이는 데 도움을 드리기 위해 만들어졌습니다.\n\n- 카메라 영상은 서버에 전송되지 않으며, 모든 처리는 브라우저 내에서만 이루어집니다.\n- 공부 기록 및 포인트 데이터는 사용자 기기의 로컬 저장소에만 저장됩니다.\n- 서비스 이용 중 불편한 점이 있으시면 언제든지 피드백을 남겨주세요.`
  },
  {
    id: 2,
    tag: '업데이트',
    title: 'v1.2 업데이트 — 내 통계 페이지 추가',
    date: '2025-03-25',
    content: `이번 업데이트에서 새로운 기능이 추가되었습니다.\n\n✅ 내 통계 페이지\n- 총 공부 시간, 평균 집중률, 총 세션 수, 누적 포인트 확인 가능\n- 이번 주 일별 공부 시간 바 차트 제공\n- 최근 5개 세션 기록 조회\n\n✅ 비회원 모드 개선\n- 비회원도 공부 세션 이용 가능 (기록/포인트 저장 제외)\n\n앞으로도 더 나은 서비스로 찾아뵙겠습니다.`
  },
  {
    id: 3,
    tag: '이벤트',
    title: '첫 공부 세션 완료 이벤트 — 10P 보너스 지급',
    date: '2025-03-20',
    content: `회원가입 후 첫 번째 공부 세션을 완료하면 10P 보너스가 자동으로 지급됩니다!\n\n- 대상: 신규 가입 회원\n- 기간: 상시 운영\n- 지급 조건: 첫 세션 종료 시 (공부 시간 1분 이상)\n\n지금 바로 공부를 시작하고 포인트를 모아보세요. ⭐`
  },
  {
    id: 4,
    tag: '업데이트',
    title: 'v1.1 업데이트 — 포인트 시스템 도입',
    date: '2025-03-10',
    content: `집중할수록 포인트가 쌓이는 보상 시스템이 추가되었습니다.\n\n⭐ 30초 집중 시 +1P\n🔥 5분 연속 집중 시 +5P 보너스\n💎 10분 연속 집중 시 +10P 보너스\n\n포인트는 우측 상단에서 실시간으로 확인할 수 있습니다.`
  },
  {
    id: 5,
    tag: '공지',
    title: 'Watchman 베타 서비스 오픈 안내',
    date: '2025-03-01',
    content: `안녕하세요, Watchman 팀입니다.\n\n오늘부터 Watchman 베타 서비스를 시작합니다.\nAI 기반 집중 감지 기술로 여러분의 공부를 도와드리겠습니다.\n\n베타 기간 동안 발견되는 버그나 개선 사항은 빠르게 반영하겠습니다.\n많은 이용 부탁드립니다. 감사합니다.`
  }
];

const TAG_CLASS = { '공지': 'tag-notice', '업데이트': 'tag-update', '이벤트': 'tag-event' };

let openId = null;

document.addEventListener('DOMContentLoaded', () => {
  renderNotices();

  // 네브바 닉네임 (TODO: API에서 가져오기)
  const nickEl = document.getElementById('nav-nickname');
  if (nickEl) nickEl.textContent = '사용자';
});

function renderNotices() {
  const list = document.getElementById('notice-list');
  const footer = document.getElementById('notice-footer');

  list.innerHTML = NOTICES.map(n => `
    <div class="notice-item ${n.pinned ? 'pinned' : ''}" id="notice-${n.id}" onclick="toggleNotice(${n.id})">
      <div class="notice-item-header">
        <div class="notice-item-left">
          ${n.pinned ? '<span class="notice-pin">📌</span>' : ''}
          <span class="notice-tag ${TAG_CLASS[n.tag]}">${n.tag}</span>
          <span class="notice-item-title">${n.title}</span>
        </div>
        <div class="notice-item-right">
          <span class="notice-date">${n.date}</span>
          <svg class="notice-chevron" id="chevron-${n.id}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
      <div class="notice-content" id="content-${n.id}" style="display:none" onclick="event.stopPropagation()">
        ${n.content.split('\n').map(line => line === '' ? '<br>' : `<p>${line}</p>`).join('')}
      </div>
    </div>`).join('');

  footer.textContent = `총 ${NOTICES.length}개의 공지사항이 있습니다.`;
}

function toggleNotice(id) {
  const wasOpen = openId === id;

  // 모두 닫기
  NOTICES.forEach(n => {
    document.getElementById(`content-${n.id}`).style.display = 'none';
    document.getElementById(`chevron-${n.id}`).classList.remove('up');
    document.getElementById(`notice-${n.id}`).classList.remove('open');
  });

  if (!wasOpen) {
    document.getElementById(`content-${id}`).style.display = 'block';
    document.getElementById(`chevron-${id}`).classList.add('up');
    document.getElementById(`notice-${id}`).classList.add('open');
    openId = id;
  } else {
    openId = null;
  }
}

function handleExit() {
  window.location.href = 'index.html';
}
