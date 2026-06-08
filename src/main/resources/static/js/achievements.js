// achievements.js

// ── 전체 업적 마스터 데이터 ────────────────────────────────
const ALL_ACHIEVEMENTS = [
  // 공부시간
  { id: 'study_first',  name: '첫 걸음',       icon: '📖', cat: 'study',   desc: '첫 번째 스터디 세션을 완료했어요.',           hidden: false },
  { id: 'study_1h',     name: '한 시간의 집중', icon: '⏱️', cat: 'study',   desc: '단일 세션 1시간 이상 공부했어요.',            hidden: false },
  { id: 'study_3h',     name: '마라토너',       icon: '🏃', cat: 'study',   desc: '단일 세션 3시간 이상 공부했어요.',            hidden: false },
  { id: 'study_10h',    name: '10시간 돌파',    icon: '🔥', cat: 'study',   desc: '누적 공부 시간 10시간을 달성했어요.',         hidden: false },
  { id: 'study_50h',    name: '공부 중독자',    icon: '💪', cat: 'study',   desc: '누적 공부 시간 50시간을 달성했어요.',         hidden: false },
  { id: 'study_100h',   name: '전설',           icon: '👑', cat: 'study',   desc: '누적 공부 시간 100시간을 달성했어요.',        hidden: false },

  // 집중률
  { id: 'focus_50',     name: '집중의 시작',    icon: '🎯', cat: 'focus',   desc: '집중률 50% 이상 세션을 달성했어요.',          hidden: false },
  { id: 'focus_80',     name: '예리한 집중',    icon: '🔍', cat: 'focus',   desc: '집중률 80% 이상 세션을 달성했어요.',          hidden: false },
  { id: 'focus_95',     name: '완벽',           icon: '⭐', cat: 'focus',   desc: '집중률 95% 이상 세션을 달성했어요.',          hidden: false },
  { id: 'focus_master', name: '집중 마스터',    icon: '🧘', cat: 'focus',   desc: '집중률 90% 이상 세션을 10회 달성했어요.',     hidden: false },

  // 연속출석
  { id: 'streak_3',     name: '3일 연속',       icon: '📅', cat: 'streak',  desc: '3일 연속 공부 세션을 완료했어요.',            hidden: false },
  { id: 'streak_7',     name: '1주일 전사',     icon: '🗓️', cat: 'streak',  desc: '7일 연속 공부 세션을 완료했어요.',            hidden: false },
  { id: 'streak_14',    name: '2주 전사',       icon: '💫', cat: 'streak',  desc: '14일 연속 공부 세션을 완료했어요.',           hidden: false },
  { id: 'streak_30',    name: '불굴',           icon: '🏆', cat: 'streak',  desc: '30일 연속 공부 세션을 완료했어요.',           hidden: false },

  // 그룹
  { id: 'group_join',      name: '첫 그룹',   icon: '👥', cat: 'group', desc: '스터디 그룹에 처음 참여했어요.',                hidden: false },
  { id: 'group_leader',    name: '방장',      icon: '👑', cat: 'group', desc: '스터디 그룹을 처음 만들었어요.',                hidden: false },
  { id: 'group_session_10',name: '함께라면',  icon: '🤝', cat: 'group', desc: '그룹 스터디 세션을 10회 완료했어요.',           hidden: false },
  { id: 'group_chat_50',   name: '수다쟁이',  icon: '💬', cat: 'group', desc: '스터디룸에서 채팅을 50개 전송했어요.',          hidden: false },

  // 플래너
  { id: 'plan_first_todo',  name: '계획의 시작',   icon: '📝', cat: 'planner', desc: '할 일을 처음으로 완료했어요.',              hidden: false },
  { id: 'plan_todo_10',     name: '할 일 정복자',  icon: '✅', cat: 'planner', desc: '할 일 10개를 완료했어요.',                  hidden: false },
  { id: 'plan_todo_50',     name: '계획왕',        icon: '📋', cat: 'planner', desc: '할 일 50개를 완료했어요.',                  hidden: false },
  { id: 'plan_perfect_day', name: '완벽한 하루',   icon: '🌟', cat: 'planner', desc: '하루 할 일을 전부 완료했어요. (3개 이상)', hidden: false },
  { id: 'plan_dday_add',    name: 'D-Day 설정',    icon: '🎯', cat: 'planner', desc: 'D-Day를 처음으로 추가했어요.',              hidden: false },
  { id: 'plan_block_10',    name: '타임블로커',    icon: '🗂️', cat: 'planner', desc: '타임테이블 블록을 10개 만들었어요.',        hidden: false },
  { id: 'plan_streak_plan', name: '꾸준한 계획자', icon: '📆', cat: 'planner', desc: '7일 연속 할 일을 추가했어요.',              hidden: false },

  // 이스터에그
  { id: 'egg_dawn',     name: '새벽 올빼미',  icon: '🦉', cat: 'easter', desc: '새벽 3~5시에 공부 세션을 시작했어요.',        hidden: true },
  { id: 'egg_weekend',  name: '주말 전사',    icon: '🏖️', cat: 'easter', desc: '같은 주 토요일과 일요일 모두 공부했어요.',     hidden: true },
  { id: 'egg_planner',  name: '완벽주의자',   icon: '🎪', cat: 'easter', desc: '하루에 할 일 20개 이상을 완료했어요.',         hidden: true },
  { id: 'egg_dday',     name: 'D-Day 영웅',   icon: '🎉', cat: 'easter', desc: 'D-Day 당일 공부 세션을 완료했어요.',           hidden: true },
  { id: 'egg_midnight', name: '자정의 학자',  icon: '🌙', cat: 'easter', desc: '자정(00:00~00:30)에 공부 세션을 시작했어요.', hidden: true },
];

const CATEGORY_LABELS = {
  study:   '📚 공부시간',
  focus:   '🎯 집중률',
  streak:  '🔥 연속출석',
  group:   '👥 그룹',
  planner: '📅 플래너',
  easter:  '🥚 이스터에그',
};

// earnedMap: achievementId → earnedAt string
let earnedMap = {};
let currentCat = 'all';

// ── 초기화 ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadEarned();
  setupTabs();
  render();
});

async function loadEarned() {
  try {
    const res = await fetch('/watchman/api/achievements/my');
    if (res.status === 401) { window.location.href = 'login.html'; return; }
    if (!res.ok) return;
    const data = await res.json(); // [{ id, userId, achievementId, earnedAt, achievement }]
    data.forEach(ua => {
      earnedMap[ua.achievementId] = ua.earnedAt;
    });
  } catch (_) {
    // 백엔드 오류 시 전부 잠금 상태로 표시
  }
}

function setupTabs() {
  document.querySelectorAll('.ach-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ach-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCat = btn.dataset.cat;
      render();
    });
  });
}

// ── 렌더 ─────────────────────────────────────────────────
function render() {
  const grid = document.getElementById('ach-grid');
  const earnedCount = ALL_ACHIEVEMENTS.filter(a => earnedMap[a.id]).length;

  // 헤더 카운트
  document.getElementById('ach-earned-count').textContent = earnedCount;
  document.getElementById('ach-subtitle').textContent =
    `${earnedCount}개 달성 · ${30 - earnedCount}개 남음`;

  const filtered = currentCat === 'all'
    ? ALL_ACHIEVEMENTS
    : ALL_ACHIEVEMENTS.filter(a => a.cat === currentCat);

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="ach-loading">해당 카테고리 업적이 없습니다.</div>';
    return;
  }

  let html = '';

  if (currentCat === 'all') {
    // 전체: 카테고리별 섹션 구분
    const cats = ['study', 'focus', 'streak', 'group', 'planner', 'easter'];
    cats.forEach(cat => {
      const items = ALL_ACHIEVEMENTS.filter(a => a.cat === cat);
      html += `<div class="ach-section-title">${CATEGORY_LABELS[cat]}</div>`;
      items.forEach(a => { html += buildCard(a); });
    });
  } else {
    filtered.forEach(a => { html += buildCard(a); });
  }

  grid.innerHTML = html;
}

function buildCard(a) {
  const earned   = !!earnedMap[a.id];
  const earnedAt = earned ? fmtDate(earnedMap[a.id]) : null;
  const isHiddenLocked = a.hidden && !earned;

  let cls = 'ach-card';
  if (earned)        cls += ' earned';
  if (!earned)       cls += ' locked';
  if (isHiddenLocked) cls += ' hidden-locked';

  const icon = isHiddenLocked ? '🔒' : a.icon;
  const name = isHiddenLocked ? '???' : escHtml(a.name);
  const desc = isHiddenLocked ? '조건을 달성하면 공개됩니다.' : escHtml(a.desc);
  const badge = earned ? '<div class="ach-badge">획득!</div>' : '';
  const dateHtml = earnedAt ? `<div class="ach-earned-at">${earnedAt}</div>` : '';

  return `<div class="${cls}">
    ${badge}
    <div class="ach-icon">${icon}</div>
    <div class="ach-name">${name}</div>
    <div class="ach-desc">${desc}</div>
    ${dateHtml}
  </div>`;
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
  } catch { return ''; }
}

function escHtml(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
