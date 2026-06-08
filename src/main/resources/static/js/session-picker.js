// session-picker.js

const PAGE_SIZE = 10;
let currentPage = 0;

document.addEventListener('DOMContentLoaded', () => loadPage(0));

async function loadPage(page) {
  currentPage = page;
  const list = document.getElementById('picker-list');
  list.innerHTML = '<div class="picker-loading">불러오는 중...</div>';
  document.getElementById('picker-pagination').innerHTML = '';

  try {
    const res = await fetch(`/watchman/api/sessions/list?page=${page}&size=${PAGE_SIZE}`);
    if (res.status === 401) { window.location.href = 'login.html'; return; }
    if (!res.ok) throw new Error();
    const data = await res.json();
    render(data);
  } catch {
    list.innerHTML = '<div class="picker-loading">불러오기에 실패했습니다. 새로고침 해주세요.</div>';
  }
}

function render(data) {
  const list = document.getElementById('picker-list');
  list.innerHTML = '';

  if (!data.sessions || data.sessions.length === 0) {
    list.innerHTML = '<div class="picker-empty">세션 기록이 없습니다.<br>새 세션을 시작해보세요!</div>';
    return;
  }

  data.sessions.forEach(s => {
    const card = document.createElement('a');
    card.className = 'picker-card';
    card.href = `study-session.html?sessionId=${s.sessionId}`;

    const total = s.focusedTime + s.distractedTime;
    const rate  = total > 0 ? Math.round((s.focusedTime / total) * 100) : 0;
    const date  = s.startedAt ? s.startedAt.substring(0, 10) : '날짜 없음';

    card.innerHTML = `
      <div class="picker-card-name">${s.name || '이름 없음'}</div>
      <div class="picker-card-meta">
        <span class="picker-meta-item">📅 ${date}</span>
        <span class="picker-meta-item">⏱ ${fmtTime(total)}</span>
        <span class="picker-meta-item">🎯 집중률 ${rate}%</span>
      </div>
      <div class="picker-card-bar-wrap">
        <div class="picker-card-bar ${rateClass(rate)}" style="width:${rate}%"></div>
      </div>`;

    list.appendChild(card);
  });

  renderPagination(data.total, data.page);
}

function renderPagination(total, page) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return;

  const pag = document.getElementById('picker-pagination');
  pag.innerHTML = '';

  const prev = document.createElement('button');
  prev.className = 'picker-page-btn';
  prev.textContent = '이전';
  prev.disabled = page === 0;
  prev.onclick = () => loadPage(page - 1);

  const info = document.createElement('span');
  info.className = 'picker-page-info';
  info.textContent = `${page + 1} / ${totalPages}`;

  const next = document.createElement('button');
  next.className = 'picker-page-btn';
  next.textContent = '다음';
  next.disabled = page >= totalPages - 1;
  next.onclick = () => loadPage(page + 1);

  pag.append(prev, info, next);
}

function fmtTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분`;
  return `${sec}초`;
}

function rateClass(r) {
  return r >= 70 ? 'good' : r >= 40 ? 'ok' : 'bad';
}
