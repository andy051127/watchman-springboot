// stats.js — 통계 페이지

// ── 페이지 진입점 ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initStats();
});

// ── 페이지 초기화 ─────────────────────────────────────────────────────────────
// 전체 세션과 이번 주 세션을 병렬로 불러와 각 섹션을 렌더링한다.
async function initStats() {
  try {
    const [allRes, weekRes, todayRes] = await Promise.all([
      fetch('/watchman/api/sessions'),          // 전체 세션 (KPI 합계 + 세션 테이블)
      fetch('/watchman/api/sessions/week'),      // 이번 주 세션 (주간 막대 차트)
      fetch('/watchman/api/sessions/today')      // 오늘 세션 (오늘 공부 현황)
    ]);

    // 세션 만료 또는 미로그인 → 로그인 페이지로 이동
    if (allRes.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const allSessions   = await allRes.json();
    const weekSessions  = await weekRes.json();
    const todaySessions = await todayRes.json();

    // 네브바 닉네임 + 아바타
    const cached = sessionStorage.getItem('nickname');
    if (cached) {
      document.getElementById('nav-nickname').textContent = cached;
    } else {
      try {
        const uRes = await fetch('/watchman/api/users/me');
        if (uRes.ok) {
          const u = await uRes.json();
          document.getElementById('nav-nickname').textContent = u.nickname;
          sessionStorage.setItem('nickname', u.nickname);
          sessionStorage.setItem('userId',   u.userId);
          sessionStorage.setItem('avatar',   u.avatar || '');
        }
      } catch (e) {}
    }
    applyNavAvatar();

    renderBanner(allSessions);
    renderKPI(allSessions, todaySessions);
    renderWeeklyChart(weekSessions);
    renderTodaySessions(todaySessions);
    renderBestSession(allSessions);
    renderSessionTable(allSessions);

  } catch (err) {
    console.error('통계 페이지 로드 실패:', err);
  }
}

// ── 배너 렌더링 ───────────────────────────────────────────────────────────────
// 전체 집중 시간 합산과 총 세션 횟수를 표시한다.
function renderBanner(sessions) {
  const totalFocused = sessions.reduce((acc, s) => acc + s.focusedTime, 0);
  document.getElementById('banner-total-time').textContent
    = totalFocused > 0 ? fmtSec(totalFocused) : '0분';
  document.getElementById('banner-total-sessions').textContent
    = `${sessions.length}회`;
}

// ── KPI 카드 렌더링 ───────────────────────────────────────────────────────────
// 전체 세션 기반 누적 통계와 오늘 통계를 나란히 표시한다.
function renderKPI(allSessions, todaySessions) {
  const totalFocused = allSessions.reduce((acc, s) => acc + s.focusedTime, 0);
  const todayFocused = todaySessions.reduce((acc, s) => acc + s.focusedTime, 0);

  // 평균 집중률: focusRate는 BigDecimal → Number()로 변환
  const avgRate = allSessions.length > 0
    ? Math.round(allSessions.reduce((acc, s) => acc + Number(s.focusRate), 0) / allSessions.length)
    : 0;

  document.getElementById('kpi-total-time').textContent
    = allSessions.length > 0 ? fmtSec(totalFocused) : '-';
  document.getElementById('kpi-today-time').textContent
    = `오늘 ${todayFocused > 0 ? fmtSec(todayFocused) : '0분'}`;
  document.getElementById('kpi-avg-rate').textContent
    = allSessions.length > 0 ? `${avgRate}%` : '-';
  if (allSessions.length > 0) {
    document.getElementById('kpi-avg-rate').className
      = `stats-kpi-value ${rateClass(avgRate)}`;
  }
  document.getElementById('kpi-total-sessions').textContent
    = allSessions.length > 0 ? `${allSessions.length}회` : '-';
  document.getElementById('kpi-today-sessions').textContent
    = `오늘 ${todaySessions.length}회`;
}

// ── 주간 막대 차트 렌더링 ─────────────────────────────────────────────────────
// 이번 주 세션 배열을 받아 요일별로 집중 시간을 합산한 뒤 차트를 그린다.
// 별도의 chart API 없이 클라이언트에서 계산한다.
function renderWeeklyChart(weekSessions) {
  const container = document.getElementById('weekly-chart');

  // 이번 주 월요일 ~ 오늘까지의 요일 레이블 생성
  const today    = new Date();
  const dayOfWeek = today.getDay();                      // 0=일, 1=월 ... 6=토
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 이번 주 월요일까지의 오프셋
  const labels = ['월', '화', '수', '목', '금', '토', '일'];

  // 요일별 집중 시간(초) 집계
  const buckets = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + mondayOffset + i);
    return { label: i === (dayOfWeek === 0 ? 6 : dayOfWeek - 1) ? '오늘' : labels[i], date: d, seconds: 0 };
  });

  weekSessions.forEach(s => {
    const d = new Date(s.startedAt);
    const idx = buckets.findIndex(b =>
      b.date.toDateString() === d.toDateString()
    );
    if (idx !== -1) buckets[idx].seconds += s.focusedTime;
  });

  const maxVal = Math.max(...buckets.map(b => b.seconds), 1);
  const hasData = buckets.some(b => b.seconds > 0);

  if (!hasData) {
    container.innerHTML = `<div class="stats-empty"><p>아직 공부 기록이 없어요</p></div>`;
    return;
  }

  container.innerHTML = buckets.map(item => {
    const pct     = Math.round((item.seconds / maxVal) * 100);
    const isToday = item.label === '오늘';
    return `
      <div class="stats-chart-col">
        <div class="stats-chart-bar-wrap">
          ${item.seconds > 0
            ? `<div class="stats-chart-val">${item.seconds >= 3600
                ? Math.floor(item.seconds / 3600) + 'h'
                : Math.floor(item.seconds / 60) + 'm'}</div>`
            : ''}
          <div class="stats-chart-bar ${isToday ? 'today' : ''}"
               style="height:${Math.max(pct, item.seconds > 0 ? 6 : 0)}%"></div>
        </div>
        <div class="stats-chart-label ${isToday ? 'today' : ''}">${item.label}</div>
      </div>`;
  }).join('');
}

// ── 오늘 공부 현황 렌더링 ─────────────────────────────────────────────────────
// 오늘 세션 목록을 시각 순으로 표시하고 총 집중 시간을 합산한다.
// s.startedAt: sessions 테이블의 started_at 컬럼 (Jackson이 ISO 8601 문자열로 직렬화)
function renderTodaySessions(sessions) {
  const container   = document.getElementById('today-sessions-content');
  const totalFocused = sessions.reduce((acc, s) => acc + s.focusedTime, 0);

  if (sessions.length === 0) {
    container.innerHTML = '<div class="stats-empty-sm">아직 오늘 세션이 없어요.</div>';
    return;
  }

  container.innerHTML = `
    <div class="stats-today-list">
      ${sessions.map(s => {
        const rate = Number(s.focusRate); // BigDecimal → number
        return `
        <div class="stats-today-row">
          <span class="stats-today-time">${fmtTime(s.startedAt)}</span>
          <div class="stats-today-bar-wrap">
            <div class="stats-today-bar ${rateClass(rate)}" style="width:${rate}%"></div>
          </div>
          <span class="stats-today-rate ${rateClass(rate)}">${rate}%</span>
        </div>`;
      }).join('')}
      <div class="stats-today-total">오늘 총 <strong>${fmtSec(totalFocused)}</strong> 집중</div>
    </div>`;
}

// ── 최고 세션 렌더링 ──────────────────────────────────────────────────────────
// 전체 세션 중 focusRate가 가장 높은 세션을 찾아 표시한다.
function renderBestSession(sessions) {
  const container = document.getElementById('best-session-content');
  if (sessions.length === 0) {
    container.innerHTML = '<div class="stats-empty-sm">세션을 시작해보세요.</div>';
    return;
  }

  // focusRate가 가장 높은 세션 탐색
  const best = sessions.reduce((b, s) =>
    !b || Number(s.focusRate) > Number(b.focusRate) ? s : b, null);
  const rate = Number(best.focusRate);

  container.innerHTML = `
    <div class="stats-best">
      <div class="stats-best-rate ${rateClass(rate)}">${rate}%</div>
      <div class="stats-best-info">
        <span>${fmtDate(best.startedAt)} ${fmtTime(best.startedAt)}</span>
        <span>${fmtSec(best.focusedTime + best.distractedTime)} 세션</span>
      </div>
    </div>`;
}

// ── 세션 테이블 ───────────────────────────────────────────────────────────────

let currentPage = 1;
const PAGE_SIZE  = 10;
let allSessionsCache = []; // 페이지 이동 시 재사용하기 위해 캐시

function renderSessionTable(sessions) {
  allSessionsCache = sessions;
  document.getElementById('table-desc').textContent
    = `최근 ${Math.min(sessions.length, PAGE_SIZE)}개 세션`;
  renderPage(1, false);
}

// 페이지 단위로 세션 테이블을 렌더링한다.
// PAGE_SIZE(10)개씩 잘라 표시하며, 여러 페이지면 페이지네이션 버튼을 추가한다.
// scroll=true: 페이지 전환 시 테이블 상단으로 스크롤 (초기 렌더 시 false)
function renderPage(page, scroll = true) {
  currentPage = page;
  const container  = document.getElementById('sessions-table-content');

  if (allSessionsCache.length === 0) {
    container.innerHTML = `<div class="stats-empty"><span>📋</span><p>아직 세션 기록이 없어요. 공부를 시작해보세요!</p></div>`;
    return;
  }

  const totalPages = Math.ceil(allSessionsCache.length / PAGE_SIZE);
  const paged      = allSessionsCache.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  let html = `<div class="stats-table-wrap">
    <table class="stats-table">
      <thead><tr><th>날짜</th><th>시간</th><th>세션 길이</th><th>집중률</th><th>집중 시간</th></tr></thead>
      <tbody>
        ${paged.map(s => {
          const total = s.focusedTime + s.distractedTime;
          const rate  = Number(s.focusRate); // BigDecimal → number
          const rc    = rateClass(rate);
          return `<tr>
            <td class="stats-td-date">${fmtDate(s.startedAt)}</td>
            <td class="stats-td-time">${fmtTime(s.startedAt)}</td>
            <td>${fmtSec(total)}</td>
            <td>
              <div class="stats-td-rate-wrap">
                <div class="stats-td-bar-bg">
                  <div class="stats-td-bar ${rc}" style="width:${rate}%"></div>
                </div>
                <span class="stats-td-rate ${rc}">${rate}%</span>
              </div>
            </td>
            <td>${fmtSec(s.focusedTime)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;

  if (totalPages > 1) {
    html += `<div class="stats-pagination">
      <button class="stats-page-btn stats-page-arrow" onclick="renderPage(${page - 1})" ${page === 1 ? 'disabled' : ''}>←</button>
      ${Array.from({ length: totalPages }, (_, i) => i + 1).map(n =>
        `<button class="stats-page-btn${n === page ? ' active' : ''}" onclick="renderPage(${n})">${n}</button>`
      ).join('')}
      <button class="stats-page-btn stats-page-arrow" onclick="renderPage(${page + 1})" ${page === totalPages ? 'disabled' : ''}>→</button>
    </div>`;
  }

  html += '</div>';
  container.innerHTML = html;

  if (scroll) {
    document.getElementById('session-table-card')
      .scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ── 로그아웃 처리 ─────────────────────────────────────────────────────────────
// POST /api/auth/logout → 서버 세션 무효화 → index.html로 이동
async function handleExit() {
  try {
    await fetch('/watchman/api/auth/logout', { method: 'POST' });
  } catch (err) {
    console.error('로그아웃 요청 실패:', err);
  }
  sessionStorage.clear();
  window.location.href = 'index.html';
}

// ── 유틸: 시간 포맷 ──────────────────────────────────────────────────────────
function fmtSec(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분`;
  return `${sec}초`;
}

// ── 유틸: 날짜 포맷 ──────────────────────────────────────────────────────────
function fmtDate(iso) {
  const d         = new Date(iso);
  const today     = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString())     return '오늘';
  if (d.toDateString() === yesterday.toDateString()) return '어제';
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// ── 유틸: 시각 포맷 ──────────────────────────────────────────────────────────
function fmtTime(iso) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${m}`;
}

// ── 네브바 아바타 표시 ────────────────────────────────────────────────────────
function applyNavAvatar() {
  const avatar = sessionStorage.getItem('avatar') || '';
  if (!avatar) return;
  const emojiEl = document.getElementById('nav-avatar-emoji');
  const imgEl   = document.getElementById('nav-avatar-img');
  if (emojiEl) emojiEl.style.display = 'none';
  if (imgEl)   { imgEl.src = avatar; imgEl.style.display = 'block'; }
}

// ── 유틸: 집중률 등급 클래스 ─────────────────────────────────────────────────
// 70% 이상: good(초록), 40% 이상: ok(노랑), 미만: bad(빨강)
function rateClass(r) { return r >= 70 ? 'good' : r >= 40 ? 'ok' : 'bad'; }
