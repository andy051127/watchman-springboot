// planner.js — 플래너 (달력 + 노트북 + D-Day)

// ── 전역 상태 ─────────────────────────────────────────────────────────────────
let currentYear, currentMonth, selectedDate;

// todos[dateStr] = [{ id: todoId, text: content, done }]
let todos = {};

// ddays = [{ id: ddayId, name, date: ddayDate }]
let ddays = [];

// timetable[dateStr] = { [hourSlot]: { id: timetableId|null, content } }
// id가 null이면 아직 서버에 저장되지 않은 슬롯 (POST 대상)
// id가 있으면 이미 저장된 슬롯 (PUT 대상)
let timetable = {};

// ── 페이지 진입점 ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const now = new Date();
  currentYear  = now.getFullYear();
  currentMonth = now.getMonth();
  selectedDate = null; // 날짜를 클릭해야 노트북이 열림

  // 닉네임: 로그인 시 sessionStorage에 저장된 값 사용 (API 재호출 불필요)
  const nickEl = document.getElementById('nav-nickname');
  const cached = sessionStorage.getItem('nickname');
  if (cached) {
    if (nickEl) nickEl.textContent = cached;
  } else {
    try {
      const res = await fetch('/watchman/api/users/me');
      if (res.ok) {
        const user = await res.json();
        if (nickEl) nickEl.textContent = user.nickname;
        sessionStorage.setItem('nickname', user.nickname);
        sessionStorage.setItem('userId',   user.userId);
        sessionStorage.setItem('avatar',   user.avatar || '');
      }
    } catch (e) {}
  }

  await Promise.all([loadDDays(), loadMonthTodos()]);
  initCalendar();
});

// ── 월별 할 일 일괄 로드 (달력 미리보기용) ────────────────────────────────────
// 현재 달의 모든 할 일을 한 번에 가져와 todos 캐시에 날짜별로 저장한다.
async function loadMonthTodos() {
  try {
    const res = await fetch(`/watchman/api/planner/todos/month?year=${currentYear}&month=${currentMonth + 1}`);
    if (res.status === 401) { window.location.href = 'login.html'; return; }
    const data = await res.json();

    // 기존 이 달의 캐시를 초기화하고 날짜별로 재구성
    data.forEach(t => {
      const dateStr = t.todoDate; // "YYYY-MM-DD"
      if (!todos[dateStr]) todos[dateStr] = [];
      // 중복 방지: 같은 todoId가 없을 때만 추가
      if (!todos[dateStr].find(x => x.id === t.todoId)) {
        todos[dateStr].push({ id: t.todoId, text: t.content, done: t.done });
      }
    });
  } catch (err) {
    console.error('월별 할 일 로드 실패:', err);
  }
}

// ── 달력 ──────────────────────────────────────────────────────────────────────

// 이전/다음 달로 이동한다.
async function changeMonth(delta) {
  currentMonth += delta;
  if (currentMonth < 0)  { currentMonth = 11; currentYear--; }
  if (currentMonth > 11) { currentMonth = 0;  currentYear++; }
  await loadMonthTodos();
  initCalendar();
}

// 달력 그리드를 렌더링한다.
// 할 일이 있는 날짜에는 점(dot)을 표시한다.
function initCalendar() {
  document.getElementById('cal-month-label').textContent
    = `${currentYear}년 ${currentMonth + 1}월`;

  const grid        = document.getElementById('calendar-grid');
  const days        = ['일', '월', '화', '수', '목', '금', '토'];
  let html          = days.map(d => `<div class="cal-day-header">${d}</div>`).join('');

  const firstDay    = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrev  = new Date(currentYear, currentMonth, 0).getDate();
  const today       = toDateStr(new Date());

  // 이전 달 빈 칸
  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<div class="cal-day other-month"><span class="cal-day-num">${daysInPrev - i}</span></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr   = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dow       = new Date(currentYear, currentMonth, d).getDay();
    const isToday   = dateStr === today;
    const isSel     = dateStr === selectedDate;
    const dayTodos  = todos[dateStr] || [];
    const cls       = ['cal-day',
      dow === 0 ? 'sunday' : dow === 6 ? 'saturday' : '',
      isToday && !isSel ? 'today' : '',
      isSel ? 'selected' : ''
    ].filter(Boolean).join(' ');

    // 미리보기: 최대 2개 표시, 초과분은 "+N개" 표시
    const preview = dayTodos.slice(0, 2).map(t =>
      `<div class="cal-preview-item${t.done ? ' done' : ''}">${escHtml(t.text)}</div>`
    ).join('');
    const more = dayTodos.length > 2
      ? `<div class="cal-preview-more">+${dayTodos.length - 2}개</div>` : '';

    html += `<div class="${cls}" onclick="selectDate('${dateStr}')">
      <span class="cal-day-num">${d}</span>
      ${preview}${more}
    </div>`;
  }

  // 다음 달 빈 칸
  const total     = firstDay + daysInMonth;
  const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let d = 1; d <= remaining; d++) {
    html += `<div class="cal-day other-month"><span class="cal-day-num">${d}</span></div>`;
  }

  grid.innerHTML = html;
}

// 날짜를 선택하면 해당 날짜의 할 일·시간표를 로드하고 노트북을 다시 그린다.
async function selectDate(dateStr) {
  selectedDate = dateStr;

  // 이미 캐시된 날짜라도 시간표는 항상 서버에서 최신 데이터를 가져온다
  await Promise.all([
    loadTodos(dateStr),
    loadTimetable(dateStr)
  ]);

  initCalendar();
  renderNotebook();
  showNotebook();
}

async function showCalendar() {
  document.getElementById('view-calendar').style.display = 'block';
  document.getElementById('view-notebook').style.display = 'none';
  await loadMonthTodos(); // 노트북에서 변경된 할 일 반영
  initCalendar();
}

function showNotebook() {
  document.getElementById('view-calendar').style.display = 'none';
  document.getElementById('view-notebook').style.display = 'block';
}

// Date → 'YYYY-MM-DD' 문자열 변환 유틸
function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── 노트북 ────────────────────────────────────────────────────────────────────

const WEEKDAYS  = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const MONTHS_KR = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

// 선택된 날짜 정보를 노트북 헤더에 표시하고 할 일·시간표를 렌더링한다.
function renderNotebook() {
  const d = new Date(selectedDate + 'T00:00:00');
  document.getElementById('nb-day').textContent        = d.getDate();
  document.getElementById('nb-weekday').textContent    = WEEKDAYS[d.getDay()];
  document.getElementById('nb-month-year').textContent = `${d.getFullYear()}년 ${MONTHS_KR[d.getMonth()]}`;

  renderMemo();
  renderTodoList();
  renderTimetable();
}

// ── 하루 메모 ─────────────────────────────────────────────────────────────────
// 메모는 localStorage에 날짜별로 저장된다 (서버 저장 없음).

function renderMemo() {
  const el = document.getElementById('nb-memo');
  if (!el) return;
  el.value = localStorage.getItem(`planner-memo-${selectedDate}`) || '';
}

let memoDebounce = null;
function saveMemo(value) {
  clearTimeout(memoDebounce);
  memoDebounce = setTimeout(() => {
    if (value.trim()) {
      localStorage.setItem(`planner-memo-${selectedDate}`, value);
    } else {
      localStorage.removeItem(`planner-memo-${selectedDate}`);
    }
  }, 400);
}

// ── 할 일 ─────────────────────────────────────────────────────────────────────

// GET /api/planner/todos?date=YYYY-MM-DD
// 서버 응답: [{ todoId, content, done, todoDate }]
// 클라이언트 형태: [{ id, text, done }]
async function loadTodos(date) {
  try {
    const res = await fetch(`/watchman/api/planner/todos?date=${date}`);
    if (res.status === 401) { window.location.href = 'login.html'; return; }
    const data = await res.json();
    // 서버 필드명을 클라이언트 필드명으로 변환
    todos[date] = data.map(t => ({ id: t.todoId, text: t.content, done: t.done }));
  } catch (err) {
    console.error('할 일 로드 실패:', err);
    todos[date] = [];
  }
}

// 할 일 목록을 화면에 렌더링한다.
// 체크박스·삭제 버튼은 배열 인덱스로 toggleTodo/deleteTodo를 호출한다.
function renderTodoList() {
  const list      = todos[selectedDate] || [];
  const container = document.getElementById('todo-list');

  container.innerHTML = list.length === 0
    ? `<div style="padding:20px 0;font-size:13px;color:var(--text-light);text-align:center">아직 할 일이 없어요</div>`
    : list.map((item, i) => `
    <div class="todo-item">
      <input type="checkbox" class="todo-checkbox" ${item.done ? 'checked' : ''}
        onchange="toggleTodo(${i})" />
      <span class="todo-text ${item.done ? 'done' : ''}">${escHtml(item.text)}</span>
      <button class="todo-delete-btn" onclick="deleteTodo(${i})">✕</button>
    </div>`).join('');

  // 완료 카운트 표시
  const countEl = document.getElementById('todo-count-display');
  if (countEl) {
    const done = list.filter(t => t.done).length;
    countEl.textContent = list.length > 0 ? `${done} / ${list.length}` : '';
    countEl.style.display = list.length > 0 ? 'inline' : 'none';
  }

  updateStats();
}

// POST /api/planner/todos { todoDate, content }
// 추가 후 서버 목록을 다시 불러와 todoId를 동기화한다.
async function addTodo() {
  const input = document.getElementById('todo-input');
  const text  = input.value.trim();
  if (!text) return;

  try {
    const res = await fetch('/watchman/api/planner/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ todoDate: selectedDate, content: text })
    });
    if (res.status === 401) { window.location.href = 'login.html'; return; }

    input.value = '';
    // 서버에서 부여된 todoId를 반영하기 위해 목록 재로드
    await loadTodos(selectedDate);
    renderTodoList();
    initCalendar(); // 할 일 점 업데이트
  } catch (err) {
    console.error('할 일 추가 실패:', err);
  }
}

// PATCH /api/planner/todos/{todoId} { done: boolean }
// index로 todoId를 찾아 완료 여부를 서버에 전달한다.
async function toggleTodo(index) {
  const list = todos[selectedDate];
  if (!list || !list[index]) return;
  const todo = list[index];

  try {
    const res = await fetch(`/watchman/api/planner/todos/${todo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !todo.done })
    });
    if (res.status === 401) { window.location.href = 'login.html'; return; }

    // 서버 반영 성공 시 인메모리 업데이트 후 재렌더링
    todo.done = !todo.done;
    renderTodoList();
  } catch (err) {
    console.error('완료 여부 변경 실패:', err);
  }
}

// DELETE /api/planner/todos/{todoId}
async function deleteTodo(index) {
  const list = todos[selectedDate];
  if (!list || !list[index]) return;
  const todo = list[index];

  try {
    const res = await fetch(`/watchman/api/planner/todos/${todo.id}`, { method: 'DELETE' });
    if (res.status === 401) { window.location.href = 'login.html'; return; }

    // 서버 삭제 성공 시 인메모리에서도 제거
    list.splice(index, 1);
    renderTodoList();
    initCalendar(); // 점 업데이트
  } catch (err) {
    console.error('할 일 삭제 실패:', err);
  }
}

// ── 시간표 ────────────────────────────────────────────────────────────────────

// GET /api/planner/timetable?date=YYYY-MM-DD
// 서버 응답: [{ timetableId, hourSlot, content }]
// 클라이언트 형태: { [hourSlot]: { id: timetableId, content } }
async function loadTimetable(date) {
  try {
    const res = await fetch(`/watchman/api/planner/timetable?date=${date}`);
    if (res.status === 401) { window.location.href = 'login.html'; return; }
    const data = await res.json();
    // 배열 → 시간 슬롯 키 맵으로 변환
    timetable[date] = {};
    data.forEach(t => {
      timetable[date][t.hourSlot] = { id: t.timetableId, content: t.content };
    });
  } catch (err) {
    console.error('시간표 로드 실패:', err);
    timetable[date] = {};
  }
}

// 하이라이트 색상 팔레트
const TT_COLORS = [
  { value: 'edit',    label: '✏️',  bg: 'none' },
  { value: 'erase',   label: '✕',   bg: 'none' },
  { value: '#fecaca', label: '',    bg: '#fecaca' },
  { value: '#fed7aa', label: '',    bg: '#fed7aa' },
  { value: '#fef08a', label: '',    bg: '#fef08a' },
  { value: '#bbf7d0', label: '',    bg: '#bbf7d0' },
  { value: '#bfdbfe', label: '',    bg: '#bfdbfe' },
  { value: '#e9d5ff', label: '',    bg: '#e9d5ff' },
];
let ttMode = 'edit'; // 'edit' | 'erase' | '#hex'

// 0시 ~ 23시(24시간) 슬롯 렌더링. 색상 팔레트 + 하이라이트 지원.
function renderTimetable() {
  const container = document.getElementById('timetable-grid');
  const dayTable  = timetable[selectedDate] || {};

  const palette = `
    <div class="tt-palette">
      ${TT_COLORS.map(c => `
        <button class="tt-swatch${ttMode === c.value ? ' active' : ''}"
          style="${c.bg !== 'none' ? `background:${c.bg}` : ''}"
          onclick="setTtMode('${c.value}')"
          title="${c.label || c.value}">${c.label}</button>
      `).join('')}
    </div>`;

  let rows = '';
  for (let h = 0; h <= 23; h++) {
    const entry   = dayTable[h];
    const val     = entry ? entry.content : '';
    const hlColor = localStorage.getItem(`tt-hl-${selectedDate}-${h}`) || '';
    const rowStyle = hlColor ? `background:${hlColor}` : '';

    rows += `
      <div class="timetable-row${hlColor ? ' hl' : ''}" style="${rowStyle}"
           onclick="handleTtRowClick(${h}, event)">
        <span class="timetable-hour">${String(h).padStart(2, '0')}:00</span>
        <div class="timetable-cell${val ? ' filled' : ''}" id="tt-cell-${h}">
          ${val ? escHtml(val) : ''}
        </div>
      </div>`;
  }

  container.innerHTML = palette + rows;
}

function setTtMode(mode) {
  ttMode = mode;
  renderTimetable();
}

function handleTtRowClick(hour, event) {
  if (ttMode === 'edit') {
    // 텍스트 입력 모드: 셀 클릭 시 편집
    const cell = document.getElementById(`tt-cell-${hour}`);
    editTimetableCell(hour, cell);
  } else if (ttMode === 'erase') {
    localStorage.removeItem(`tt-hl-${selectedDate}-${hour}`);
    renderTimetable();
  } else {
    // 색상 적용
    localStorage.setItem(`tt-hl-${selectedDate}-${hour}`, ttMode);
    renderTimetable();
  }
}

// 시간표 셀을 클릭하면 인라인 input으로 전환하고,
// blur 또는 Enter 키 입력 시 서버에 저장한다.
function editTimetableCell(hour, cell) {
  const current = cell.textContent.trim();
  const input   = document.createElement('input');
  input.type        = 'text';
  input.className   = 'timetable-cell-input';
  input.value       = current;
  input.placeholder = '일정 입력...';
  cell.innerHTML    = '';
  cell.appendChild(input);
  input.focus();

  async function save() {
    const val      = input.value.trim();
    const existing = timetable[selectedDate]?.[hour]; // 이미 저장된 슬롯 여부 확인

    try {
      if (existing?.id) {
        // 이미 존재하는 슬롯 → PUT으로 내용 수정
        // body에 tableDate와 hourSlot도 함께 전달 (컨트롤러 요구사항)
        await fetch(`/watchman/api/planner/timetable/${existing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tableDate: selectedDate, hourSlot: hour, content: val })
        });
      } else if (val) {
        // 새 슬롯이고 내용이 있을 때만 POST로 신규 저장
        await fetch('/watchman/api/planner/timetable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tableDate: selectedDate, hourSlot: hour, content: val })
        });
      }

      // 저장 후 서버에서 재로드하여 timetableId를 동기화한다
      await loadTimetable(selectedDate);
    } catch (err) {
      console.error('시간표 저장 실패:', err);
    }

    renderTimetable();
  }

  input.addEventListener('blur', save);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
  });
}

// ── D-Day ─────────────────────────────────────────────────────────────────────

// GET /api/planner/ddays
// 서버 응답: [{ ddayId, name, ddayDate }]
// 클라이언트 형태: [{ id: ddayId, name, date: ddayDate }]
async function loadDDays() {
  try {
    const res = await fetch('/watchman/api/planner/ddays');
    if (res.status === 401) { window.location.href = 'login.html'; return; }
    const data = await res.json();
    ddays = data.map(d => ({ id: d.ddayId, name: d.name, date: d.ddayDate }));
    renderDdays();
    updateStats();
  } catch (err) {
    console.error('D-Day 로드 실패:', err);
  }
}

// POST /api/planner/ddays { name, ddayDate }
// 추가 후 서버 목록을 재로드하여 ddayId를 동기화한다.
async function addDday() {
  const name = document.getElementById('dday-name').value.trim();
  const date = document.getElementById('dday-date').value;
  if (!name || !date) return;

  try {
    const res = await fetch('/watchman/api/planner/ddays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ddayDate: date })
    });
    if (res.status === 401) { window.location.href = 'login.html'; return; }

    document.getElementById('dday-name').value = '';
    document.getElementById('dday-date').value = '';
    await loadDDays(); // 서버에서 ddayId 포함 재로드
  } catch (err) {
    console.error('D-Day 추가 실패:', err);
  }
}

// DELETE /api/planner/ddays/{ddayId}
async function removeDday(id) {
  try {
    const res = await fetch(`/watchman/api/planner/ddays/${id}`, { method: 'DELETE' });
    if (res.status === 401) { window.location.href = 'login.html'; return; }

    ddays = ddays.filter(d => d.id !== id);
    renderDdays();
    updateStats();
  } catch (err) {
    console.error('D-Day 삭제 실패:', err);
  }
}

// D-Day 배지 목록을 렌더링한다.
// diff > 0: D-N (N일 남음), diff === 0: D-Day, diff < 0: D+N (N일 지남)
function renderDdays() {
  const container = document.getElementById('dday-list');
  if (ddays.length === 0) {
    container.innerHTML = '<span class="dday-empty">D-Day를 추가해 보세요.</span>';
    return;
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  container.innerHTML = ddays.map(d => {
    const target = new Date(d.date); target.setHours(0, 0, 0, 0);
    const diff   = Math.round((target - today) / (1000 * 60 * 60 * 24));
    const label  = diff === 0 ? 'D-Day' : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
    return `
      <div class="dday-badge">
        <span class="dday-badge-name">${escHtml(d.name)}</span>
        <span class="dday-badge-count">${label}</span>
        <button class="dday-delete-btn" onclick="removeDday(${d.id})">✕</button>
      </div>`;
  }).join('');
}

// ── 통계 칩 업데이트 ──────────────────────────────────────────────────────────
// 선택된 날짜의 할 일 통계와 가장 가까운 D-Day를 헤더 칩에 표시한다.
function updateStats() {
  const list = todos[selectedDate] || [];
  document.getElementById('stat-todo-total').textContent = `${list.length}개`;
  document.getElementById('stat-todo-done').textContent  = `${list.filter(t => t.done).length}개`;

  const today       = new Date(); today.setHours(0, 0, 0, 0);
  const nearestDday = ddays
    .map(d => { const t = new Date(d.date); t.setHours(0, 0, 0, 0); return { name: d.name, diff: Math.round((t - today) / (1000 * 60 * 60 * 24)) }; })
    .filter(d => d.diff >= 0)
    .sort((a, b) => a.diff - b.diff)[0];

  document.getElementById('stat-dday').textContent = nearestDday
    ? (nearestDday.diff === 0 ? 'D-Day!' : `D-${nearestDday.diff}`)
    : '없음';
}

// ── 로그아웃 처리 ─────────────────────────────────────────────────────────────
async function handleExit() {
  try {
    await fetch('/watchman/api/auth/logout', { method: 'POST' });
  } catch (err) {
    console.error('로그아웃 요청 실패:', err);
  }
  sessionStorage.clear();
  window.location.href = 'index.html';
}

// ── 유틸: HTML 이스케이프 ─────────────────────────────────────────────────────
// XSS 방지를 위해 사용자 입력 텍스트를 HTML에 삽입하기 전에 반드시 이스케이프한다.
function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
