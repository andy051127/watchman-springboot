// planner.js — 플래너 (달력 + 노트북 + D-Day)

// ── 전역 상태 ─────────────────────────────────────────────────────────────────
let currentYear, currentMonth, selectedDate;

// todos[dateStr] = [{ id: todoId, text: content, done }]
let todos = {};

// ddays = [{ id: ddayId, name, date: ddayDate }]
let ddays = [];

// blocks[dateStr] = [{ blockId, startTime, endTime, color, label }]
let blocks = {};

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
async function loadMonthTodos() {
  try {
    const res = await fetch(`/watchman/api/planner/todos/month?year=${currentYear}&month=${currentMonth + 1}`);
    if (res.status === 401) { window.location.href = 'login.html'; return; }
    const data = await res.json();

    data.forEach(t => {
      const dateStr = t.todoDate;
      if (!todos[dateStr]) todos[dateStr] = [];
      if (!todos[dateStr].find(x => x.id === t.todoId)) {
        todos[dateStr].push({ id: t.todoId, text: t.content, done: t.done });
      }
    });
  } catch (err) {
    console.error('월별 할 일 로드 실패:', err);
  }
}

// ── 달력 ──────────────────────────────────────────────────────────────────────

async function changeMonth(delta) {
  currentMonth += delta;
  if (currentMonth < 0)  { currentMonth = 11; currentYear--; }
  if (currentMonth > 11) { currentMonth = 0;  currentYear++; }
  await loadMonthTodos();
  initCalendar();
}

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

  const total     = firstDay + daysInMonth;
  const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let d = 1; d <= remaining; d++) {
    html += `<div class="cal-day other-month"><span class="cal-day-num">${d}</span></div>`;
  }

  grid.innerHTML = html;
}

async function selectDate(dateStr) {
  selectedDate = dateStr;

  await Promise.all([
    loadTodos(dateStr),
    loadBlocks(dateStr)
  ]);

  initCalendar();
  renderNotebook();
  showNotebook();
}

async function showCalendar() {
  document.getElementById('view-calendar').style.display = 'block';
  document.getElementById('view-notebook').style.display = 'none';
  await loadMonthTodos();
  initCalendar();
}

function showNotebook() {
  document.getElementById('view-calendar').style.display = 'none';
  document.getElementById('view-notebook').style.display = 'block';
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── 노트북 ────────────────────────────────────────────────────────────────────

const WEEKDAYS  = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const MONTHS_KR = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

function renderNotebook() {
  const d = new Date(selectedDate + 'T00:00:00');
  document.getElementById('nb-day').textContent        = d.getDate();
  document.getElementById('nb-weekday').textContent    = WEEKDAYS[d.getDay()];
  document.getElementById('nb-month-year').textContent = `${d.getFullYear()}년 ${MONTHS_KR[d.getMonth()]}`;

  renderMemo();
  renderTodoList();
  renderBlockGrid();
}

// ── 하루 메모 ─────────────────────────────────────────────────────────────────

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

async function loadTodos(date) {
  try {
    const res = await fetch(`/watchman/api/planner/todos?date=${date}`);
    if (res.status === 401) { window.location.href = 'login.html'; return; }
    const data = await res.json();
    todos[date] = data.map(t => ({ id: t.todoId, text: t.content, done: t.done }));
  } catch (err) {
    console.error('할 일 로드 실패:', err);
    todos[date] = [];
  }
}

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

  const countEl = document.getElementById('todo-count-display');
  if (countEl) {
    const done = list.filter(t => t.done).length;
    countEl.textContent = list.length > 0 ? `${done} / ${list.length}` : '';
    countEl.style.display = list.length > 0 ? 'inline' : 'none';
  }

  updateStats();
}

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
    await loadTodos(selectedDate);
    renderTodoList();
    initCalendar();
  } catch (err) {
    console.error('할 일 추가 실패:', err);
  }
}

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

    const data = await res.json().catch(() => ({}));
    if (data.newAchievements?.length) showAchievementToasts(data.newAchievements);
    todo.done = !todo.done;
    renderTodoList();
  } catch (err) {
    console.error('완료 여부 변경 실패:', err);
  }
}

async function deleteTodo(index) {
  const list = todos[selectedDate];
  if (!list || !list[index]) return;
  const todo = list[index];

  try {
    const res = await fetch(`/watchman/api/planner/todos/${todo.id}`, { method: 'DELETE' });
    if (res.status === 401) { window.location.href = 'login.html'; return; }

    list.splice(index, 1);
    renderTodoList();
    initCalendar();
  } catch (err) {
    console.error('할 일 삭제 실패:', err);
  }
}

// ── D-Day ─────────────────────────────────────────────────────────────────────

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

    const data = await res.json().catch(() => ({}));
    if (data.newAchievements?.length) showAchievementToasts(data.newAchievements);
    document.getElementById('dday-name').value = '';
    document.getElementById('dday-date').value = '';
    await loadDDays();
  } catch (err) {
    console.error('D-Day 추가 실패:', err);
  }
}

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

// ── 타임테이블 블록 ───────────────────────────────────────────────────────────

const BLOCK_COLORS = ['#fecaca','#fed7aa','#fef08a','#bbf7d0','#bfdbfe','#e9d5ff'];

// GET /api/planner/blocks?date=YYYY-MM-DD
async function loadBlocks(date) {
  try {
    const res = await fetch(`/watchman/api/planner/blocks?date=${date}`);
    if (res.status === 401) { window.location.href = 'login.html'; return; }
    const data = await res.json();
    blocks[date] = data.map(b => ({
      blockId:   b.blockId,
      startTime: b.startTime,
      endTime:   b.endTime,
      color:     b.color,
      label:     b.label
    }));
  } catch (err) {
    console.error('블록 로드 실패:', err);
    blocks[date] = [];
  }
}

// "HH:MM" 또는 "HH:MM:SS" → 분(0~1439) 변환
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// 분(0~1439) → "HH:MM" 변환
function minutesToTime(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

// 그리드 렌더링: 엑셀 셀 방식 (24행 × 12셀, 각 셀 = 5분)
function renderBlockGrid() {
  const container = document.getElementById('timetable-grid');
  const dayBlocks = blocks[selectedDate] || [];

  // 각 5분 셀(288개)에 어떤 블록이 걸려있는지 매핑
  // cellMap[min] = { blockId, color, label, isStart, isEnd, startTime, endTime }
  const cellMap = {};
  dayBlocks.forEach(b => {
    const s = timeToMinutes(b.startTime);
    const e = timeToMinutes(b.endTime);
    for (let m = s; m < e; m += 5) {
      cellMap[m] = {
        blockId: b.blockId, color: b.color, label: b.label,
        isStart:  m === s,
        isSecond: m === s + 5,
        isEnd:    m === e - 5,
        startTime: b.startTime.substring(0,5), endTime: b.endTime.substring(0,5)
      };
    }
  });

  // 헤더 (분 눈금)
  const minuteLabels = [0,5,10,15,20,25,30,35,40,45,50,55]
    .map(m => `<div class="tt-header-cell">${String(m).padStart(2,'0')}</div>`).join('');

  // 24행 렌더링
  let rowsHtml = '';
  for (let h = 0; h < 24; h++) {
    let cellsHtml = '';
    for (let c = 0; c < 12; c++) {
      const min  = h * 60 + c * 5;
      const info = cellMap[min];
      if (info) {
        const startTag = info.isStart
          ? `<span class="tt-cell-time tt-cell-start">${info.startTime}</span>` : '';
        const endTag = info.isEnd
          ? `<span class="tt-cell-time tt-cell-end">${info.endTime}</span>` : '';
        const nameTag = info.isSecond && info.label
          ? `<span class="tt-cell-name">${escHtml(info.label)}</span>` : '';
        cellsHtml += `<div class="tt-cell has-block" data-min="${min}"
          style="background:${info.color}"
          data-block-id="${info.blockId}">${startTag}${endTag}${nameTag}</div>`;
      } else {
        cellsHtml += `<div class="tt-cell" data-min="${min}"></div>`;
      }
    }
    rowsHtml += `<div class="tt-row">
      <div class="tt-time-label">${String(h).padStart(2,'0')}</div>
      <div class="tt-cells">${cellsHtml}</div>
    </div>`;
  }

  container.innerHTML = `
    <p class="tt-hint">셀을 드래그해서 일정을 추가하고, 색칠된 블록을 클릭하면 수정할 수 있어요.</p>
    <div class="timetable-grid-wrap" id="tt-wrap">
      <div class="tt-header-row">
        <div class="tt-header-spacer"></div>
        <div class="tt-header-cells">${minuteLabels}</div>
      </div>
      ${rowsHtml}
    </div>`;

  // 현재 시각 근처로 자동 스크롤
  const wrap = document.getElementById('tt-wrap');
  if (wrap) {
    const now = new Date();
    const rowH = 30; // .tt-cell height
    const headerH = 22;
    wrap.scrollTop = Math.max(0, now.getHours() * rowH - 90 + headerH);
  }

  initGridDrag();
}

// ── 엑셀 드래그 선택 ──────────────────────────────────────────────────────────

let dragStartMin     = null;
let dragEndMin       = null;
let dragActive       = false;
let _dragUpHandler   = null;
let _dragMoveHandler = null;

function getMinFromCell(e) {
  const cell = e.target.closest('.tt-cell');
  if (!cell) return null;
  return parseInt(cell.dataset.min);
}

function applySelectHighlight(minA, minB) {
  const lo = Math.min(minA, minB);
  const hi = Math.max(minA, minB);
  document.querySelectorAll('#tt-wrap .tt-cell').forEach(cell => {
    const m = parseInt(cell.dataset.min);
    cell.classList.toggle('selecting', m >= lo && m <= hi);
  });
}

function clearSelectHighlight() {
  document.querySelectorAll('#tt-wrap .tt-cell.selecting')
    .forEach(c => c.classList.remove('selecting'));
}

function initGridDrag() {
  const wrap = document.getElementById('tt-wrap');
  if (!wrap) return;

  if (_dragUpHandler)   document.removeEventListener('mouseup',   _dragUpHandler);
  if (_dragMoveHandler) document.removeEventListener('mousemove', _dragMoveHandler);

  wrap.addEventListener('mousedown', e => {
    // 블록 셀 클릭은 드래그 시작 안 함
    const cell = e.target.closest('.tt-cell');
    if (!cell) return;
    if (cell.classList.contains('has-block')) {
      // 블록 클릭 → 모달 오픈
      openBlockModal(parseInt(cell.dataset.blockId));
      return;
    }
    const min = parseInt(cell.dataset.min);
    dragActive   = true;
    dragStartMin = min;
    dragEndMin   = min;
    applySelectHighlight(min, min);
    e.preventDefault();
  });

  _dragMoveHandler = e => {
    if (!dragActive) return;
    const min = getMinFromCell(e);
    if (min === null) return;
    dragEndMin = min;
    applySelectHighlight(dragStartMin, dragEndMin);
  };
  document.addEventListener('mousemove', _dragMoveHandler);

  _dragUpHandler = () => {
    if (!dragActive) return;
    dragActive = false;
    clearSelectHighlight();

    const s  = dragStartMin;
    const en = dragEndMin;
    dragStartMin = null;
    dragEndMin   = null;

    if (s !== null && en !== null) {
      const startMin = Math.min(s, en);
      const endMin   = Math.max(s, en) + 5; // 마지막 셀의 끝(+5분)
      openNewBlockModal(startMin, endMin);
    }
  };
  document.addEventListener('mouseup', _dragUpHandler);
}

// ── 블록 모달 ─────────────────────────────────────────────────────────────────

let modalBlockId   = null;
let modalStartMin  = null;
let modalEndMin    = null;
let modalColor     = BLOCK_COLORS[4];

function openNewBlockModal(startMin, endMin) {
  modalBlockId  = null;
  modalStartMin = startMin;
  modalEndMin   = endMin;
  modalColor    = BLOCK_COLORS[4];
  showModal('', modalColor);
}

function openBlockModal(blockId) {
  const b = (blocks[selectedDate] || []).find(x => x.blockId === blockId);
  if (!b) return;
  modalBlockId  = blockId;
  modalStartMin = timeToMinutes(b.startTime);
  modalEndMin   = timeToMinutes(b.endTime);
  modalColor    = b.color;
  showModal(b.label, b.color);
}

function showModal(labelValue, selectedColor) {
  const existing = document.getElementById('tt-modal-overlay');
  if (existing) existing.remove();

  const timeLabel = `${minutesToTime(modalStartMin)} ~ ${minutesToTime(modalEndMin)}`;

  const overlay = document.createElement('div');
  overlay.id        = 'tt-modal-overlay';
  overlay.className = 'tt-modal-overlay';

  const swatches = BLOCK_COLORS.map(c =>
    `<div class="tt-modal-swatch${c === selectedColor ? ' selected' : ''}"
          style="background:${c}"
          data-color="${c}"
          onclick="selectModalColor('${c}')"></div>`
  ).join('');

  const deleteBtn = modalBlockId !== null
    ? `<button class="tt-modal-btn danger" onclick="deleteBlock(${modalBlockId})">삭제</button>`
    : '';

  overlay.innerHTML = `
    <div class="tt-modal">
      <div class="tt-modal-time">${timeLabel}</div>
      <div class="tt-modal-palette">${swatches}</div>
      <input class="tt-modal-input" id="tt-modal-label" type="text"
             placeholder="일정 이름 (선택)" value="${escHtml(labelValue)}" />
      <div class="tt-modal-actions">
        ${deleteBtn}
        <button class="tt-modal-btn" onclick="closeModal()">취소</button>
        <button class="tt-modal-btn primary" onclick="saveModalBlock()">저장</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  document.getElementById('tt-modal-label').focus();
}

function selectModalColor(color) {
  modalColor = color;
  document.querySelectorAll('.tt-modal-swatch').forEach(el => {
    el.classList.toggle('selected', el.dataset.color === color);
  });
}

function closeModal() {
  const overlay = document.getElementById('tt-modal-overlay');
  if (overlay) overlay.remove();
}

async function saveModalBlock() {
  const label = document.getElementById('tt-modal-label').value.trim();
  const body  = {
    blockDate: selectedDate,
    startTime: minutesToTime(modalStartMin),
    endTime:   minutesToTime(modalEndMin),
    color:     modalColor,
    label:     label
  };

  try {
    if (modalBlockId === null) {
      const res = await fetch('/watchman/api/planner/blocks', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body)
      });
      if (res.status === 401) { window.location.href = 'login.html'; return; }
      const data = await res.json().catch(() => ({}));
      if (data.newAchievements?.length) showAchievementToasts(data.newAchievements);
    } else {
      const res = await fetch(`/watchman/api/planner/blocks/${modalBlockId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body)
      });
      if (res.status === 401) { window.location.href = 'login.html'; return; }
    }
    closeModal();
    await loadBlocks(selectedDate);
    renderBlockGrid();
  } catch (err) {
    console.error('블록 저장 실패:', err);
  }
}

async function deleteBlock(blockId) {
  try {
    const res = await fetch(`/watchman/api/planner/blocks/${blockId}`, { method: 'DELETE' });
    if (res.status === 401) { window.location.href = 'login.html'; return; }
    closeModal();
    await loadBlocks(selectedDate);
    renderBlockGrid();
  } catch (err) {
    console.error('블록 삭제 실패:', err);
  }
}

// ── 유틸: HTML 이스케이프 ─────────────────────────────────────────────────────
function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
