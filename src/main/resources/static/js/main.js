// main.js — 메인 대시보드

// ── 페이지 진입점 ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initPage();
});

// ── 페이지 초기화 ─────────────────────────────────────────────────────────────
// URL 파라미터 ?guest=1 여부에 따라 비회원/로그인 모드로 분기한다.
async function initPage() {
  const isGuest = new URLSearchParams(window.location.search).get('guest') === '1';

  const nicknameEl = document.getElementById('nav-nickname');
  const exitBtn    = document.getElementById('btn-exit');

  if (isGuest) {
    // ── 비회원 모드 ────────────────────────────────────────────────────────────
    // API를 호출하지 않고 제한된 UI를 표시한다.
    nicknameEl.textContent = '비회원';
    nicknameEl.classList.add('nav-guest');
    nicknameEl.removeAttribute('href');
    document.getElementById('nav-avatar').removeAttribute('href');
    exitBtn.textContent = '나가기';

    // 통계·그룹 탭은 로그인 필요 → 비활성화
    ['nav-stats', 'nav-group'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.style.opacity = '0.4'; el.style.pointerEvents = 'none'; }
    });

    // 빈 데이터로 화면만 렌더링
    renderStats(null, [], []);
    renderRecentSessions([], true);
    return;
  }

  // ── 로그인 모드 ──────────────────────────────────────────────────────────────
  // 사용자 정보·세션 데이터를 병렬로 요청하여 로드 속도를 최소화한다.
  try {
    const [userRes, todayRes, weekRes, recentRes] = await Promise.all([
      fetch('/watchman/api/users/me'),                    // 사용자 정보
      fetch('/watchman/api/sessions/today'),              // 오늘 세션 목록
      fetch('/watchman/api/sessions/week'),               // 이번 주 세션 목록
      fetch('/watchman/api/sessions/recent?limit=3')      // 최근 3개 세션
    ]);

    // 세션 만료 또는 미로그인 → 로그인 페이지로 이동
    if (userRes.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const user           = await userRes.json();
    const todaySessions  = await todayRes.json();
    const weekSessions   = await weekRes.json();
    const recentSessions = await recentRes.json();

    // 네브바·배너 닉네임 표시
    nicknameEl.textContent = user.nickname;
    document.getElementById('banner-greeting').textContent
      = `${user.nickname}님, ${getGreeting()}`;

    // sessionStorage 갱신 — 다른 페이지(mypage 등)에서 닉네임·아바타 참조용
    sessionStorage.setItem('userId',   user.userId);
    sessionStorage.setItem('nickname', user.nickname);
    sessionStorage.setItem('avatar',   user.avatar || '');

    renderStats(user, todaySessions, weekSessions);
    renderRecentSessions(recentSessions, false);

  } catch (err) {
    // 네트워크 오류 또는 서버 다운
    console.error('메인 페이지 로드 실패:', err);
  }
}

// ── 통계 카드 렌더링 ──────────────────────────────────────────────────────────
// user: 사용자 객체 (streak 포함), null이면 비회원
// todaySessions: 오늘 세션 배열 → 오늘 집중 시간 계산에 사용
// weekSessions:  이번 주 세션 배열 → 주간 집중 시간 및 평균 집중률 계산에 사용
function renderStats(user, todaySessions, weekSessions) {
  // 오늘 총 집중 시간(초)
  const todaySecs = todaySessions.reduce((acc, s) => acc + s.focusedTime, 0);

  // 이번 주 총 집중 시간(초)
  const weekSecs  = weekSessions.reduce((acc, s) => acc + s.focusedTime, 0);

  // 이번 주 평균 집중률 (세션이 없으면 null)
  const avgFocusRate = weekSessions.length > 0
    ? Math.round(weekSessions.reduce((acc, s) => acc + Number(s.focusRate), 0) / weekSessions.length)
    : null;

  // 배너 칩
  document.getElementById('chip-today').textContent = todaySecs > 0 ? fmtSec(todaySecs) : '0분';
  document.getElementById('chip-week').textContent  = weekSecs  > 0 ? fmtSec(weekSecs)  : '0시간';

  // 통계 카드
  document.getElementById('stat-today').textContent
    = todaySecs > 0 ? fmtSec(todaySecs) : '0분';
  document.getElementById('stat-today-sub').textContent
    = todaySecs > 0 ? '잘 하고 있어요!' : '아직 시작 전이에요';
  document.getElementById('stat-focus').textContent
    = avgFocusRate !== null ? `${avgFocusRate}%` : '-%';

  // 연속 공부 카드 — 비회원이면 잠금 표시
  if (!user) {
    document.getElementById('stat-streak-card').innerHTML = `
      <div class="stat-card-label">연속 공부</div>
      <div class="stat-locked-msg">로그인 필요</div>`;
  } else {
    // user.streak: users 테이블의 streak 컬럼 값
    const streakEl = document.getElementById('stat-streak');
    if (streakEl) streakEl.textContent = `${user.streak}일`;
  }
}

// ── 최근 세션 목록 렌더링 ─────────────────────────────────────────────────────
// sessions: 최근 세션 배열 (startedAt, focusedTime, distractedTime, focusRate)
// isGuest: 비회원 여부
function renderRecentSessions(sessions, isGuest) {
  const container = document.getElementById('recent-sessions-content');
  const moreBtn   = document.getElementById('btn-all-sessions');

  if (isGuest) {
    // 비회원: 잠금 안내 메시지 표시
    container.innerHTML = `
      <div class="guest-lock-state">
        <p>세션 기록은 로그인 후 이용할 수 있어요.</p>
        <p class="guest-lock-sub">지금 공부는 할 수 있지만 기록은 저장되지 않아요.</p>
      </div>`;
    return;
  }

  if (sessions.length === 0) {
    // 세션 없음: 빈 상태 안내
    container.innerHTML = `
      <div class="empty-state">
        아직 세션 기록이 없어요.<br />첫 번째 공부 세션을 시작해보세요!
      </div>`;
    return;
  }

  moreBtn.style.display = 'inline';

  // 세션 행 렌더링
  // s.startedAt: 세션 시작 시각 (DB의 started_at → Jackson이 ISO 8601 문자열로 직렬화)
  // s.focusRate: BigDecimal → JSON에서 숫자로 전달되므로 Number()로 변환
  container.innerHTML = `<div class="recent-session-list">${sessions.map(s => {
    const total = s.focusedTime + s.distractedTime;
    const rate  = Number(s.focusRate);
    const rc    = rate >= 70 ? 'good' : rate >= 40 ? 'ok' : 'bad'; // 집중률 등급 색상 클래스
    return `
      <div class="recent-session-row">
        <div class="rs-date">
          <span class="rs-date-label">${fmtDate(s.startedAt)}</span>
          <span class="rs-time">${fmtTime(s.startedAt)}</span>
        </div>
        <div class="rs-mid">
          <span class="rs-duration">${fmtSec(total)}</span>
          <div class="rs-bar-wrap">
            <div class="rs-bar ${rc}" style="width:${rate}%"></div>
          </div>
        </div>
        <div class="rs-rate ${rc}">${rate}%</div>
      </div>`;
  }).join('')}</div>`;
}

// ── 로그아웃 처리 ─────────────────────────────────────────────────────────────
// POST /api/auth/logout → 서버 세션 무효화 → index.html로 이동
// 비회원(나가기 버튼)일 때는 API 호출 없이 바로 이동
async function handleExit() {
  const isGuest = new URLSearchParams(window.location.search).get('guest') === '1';

  if (!isGuest) {
    try {
      await fetch('/watchman/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('로그아웃 요청 실패:', err);
    }
    // sessionStorage 초기화
    sessionStorage.clear();
  }

  window.location.href = 'index.html';
}

// ── 유틸: 시간 포맷 ──────────────────────────────────────────────────────────
// 초(sec)를 "N시간 M분" 또는 "M분" 형태로 변환
function fmtSec(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분`;
  return `${sec}초`;
}

// ── 유틸: 날짜 포맷 ──────────────────────────────────────────────────────────
// ISO 8601 문자열을 "오늘", "어제", "M월 D일" 형태로 변환
function fmtDate(iso) {
  const d         = new Date(iso);
  const today     = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString())     return '오늘';
  if (d.toDateString() === yesterday.toDateString()) return '어제';
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// ── 유틸: 시각 포맷 ──────────────────────────────────────────────────────────
// ISO 8601 문자열을 "오전/오후 H:MM" 형태로 변환
function fmtTime(iso) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${m}`;
}

// ── 유틸: 시간대별 인사말 ─────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 6)  return '밤에도 열심이네요';
  if (h < 12) return '좋은 아침이에요';
  if (h < 18) return '오후도 화이팅이에요';
  return '오늘 하루도 수고했어요';
}
