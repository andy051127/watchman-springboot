// notice.js — 공지사항

const TAG_CLASS = { '공지': 'tag-notice', '업데이트': 'tag-update', '이벤트': 'tag-event' };

let notices  = [];
let openId   = null;
let isAdmin  = false;
let editingId = null; // 수정 중인 공지 ID (null이면 신규 작성)

// ── 초기화 ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const nickEl = document.getElementById('nav-nickname');

  const user = await window.__authReady;
  if (user) {
    if (nickEl) nickEl.textContent = user.nickname;
    isAdmin = user.isAdmin === 1;
    if (isAdmin) document.getElementById('btn-write').style.display = 'inline-flex';
  }

  await loadNotices();
});

// ── 공지 목록 로드 ────────────────────────────────────────
async function loadNotices() {
  try {
    const res = await fetch('/watchman/api/notices');
    notices = await res.json();
  } catch (e) {
    notices = [];
  }
  renderNotices();
}

// ── 렌더링 ────────────────────────────────────────────────
function renderNotices() {
  const list   = document.getElementById('notice-list');
  const footer = document.getElementById('notice-footer');

  if (notices.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:52px 24px;color:var(--text-muted)">
      <div style="font-size:32px;margin-bottom:12px">📭</div>
      <p style="font-size:14px">아직 등록된 공지사항이 없습니다.</p>
    </div>`;
    footer.textContent = '';
    return;
  }

  list.innerHTML = notices.map(n => {
    const dateStr = n.createdAt ? n.createdAt.split('T')[0] : '';
    const adminBtns = isAdmin ? `
      <div class="notice-admin-btns" onclick="event.stopPropagation()">
        <button class="notice-edit-btn" onclick="openEditModal(${n.noticeId})">수정</button>
        <button class="notice-del-btn"  onclick="deleteNotice(${n.noticeId})">삭제</button>
      </div>` : '';

    return `
      <div class="notice-item ${n.pinned ? 'pinned' : ''}" id="notice-${n.noticeId}" onclick="toggleNotice(${n.noticeId})">
        <div class="notice-item-header">
          <div class="notice-item-left">
            ${n.pinned ? '<span class="notice-pin">📌</span>' : ''}
            <span class="notice-tag ${TAG_CLASS[n.tag] || 'tag-notice'}">${n.tag}</span>
            <span class="notice-item-title">${esc(n.title)}</span>
          </div>
          <div class="notice-item-right">
            ${adminBtns}
            <span class="notice-date">${dateStr}</span>
            <svg class="notice-chevron" id="chevron-${n.noticeId}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>
        <div class="notice-content" id="content-${n.noticeId}" style="display:none" onclick="event.stopPropagation()">
          <div class="notice-content-body">${esc(n.content).replace(/\n/g, '<br>')}</div>
          <div class="notice-writer">✍️ ${esc(n.writerNickname || '관리자')}</div>
        </div>
      </div>`;
  }).join('');

  footer.textContent = `총 ${notices.length}개의 공지사항이 있습니다.`;
}

// ── 아코디언 ──────────────────────────────────────────────
function toggleNotice(id) {
  const wasOpen = openId === id;
  notices.forEach(n => {
    const c = document.getElementById(`content-${n.noticeId}`);
    const v = document.getElementById(`chevron-${n.noticeId}`);
    if (c) c.style.display = 'none';
    if (v) v.classList.remove('up');
  });
  if (!wasOpen) {
    const c = document.getElementById(`content-${id}`);
    const v = document.getElementById(`chevron-${id}`);
    if (c) c.style.display = 'block';
    if (v) v.classList.add('up');
    openId = id;
  } else {
    openId = null;
  }
}

// ── 모달 열기/닫기 ────────────────────────────────────────
function openModal() {
  editingId = null;
  document.getElementById('modal-title-text').textContent = '공지 작성';
  document.getElementById('modal-submit').textContent = '등록';
  document.getElementById('modal-tag').value = '공지';
  document.getElementById('modal-pinned').checked = false;
  document.getElementById('modal-title').value = '';
  document.getElementById('modal-content').value = '';
  document.getElementById('notice-modal').style.display = 'flex';
}

function openEditModal(id) {
  const n = notices.find(x => x.noticeId === id);
  if (!n) return;
  editingId = id;
  document.getElementById('modal-title-text').textContent = '공지 수정';
  document.getElementById('modal-submit').textContent = '수정';
  document.getElementById('modal-tag').value = n.tag;
  document.getElementById('modal-pinned').checked = n.pinned;
  document.getElementById('modal-title').value = n.title;
  document.getElementById('modal-content').value = n.content;
  document.getElementById('notice-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('notice-modal').style.display = 'none';
}

function closeModalBg(e) {
  if (e.target === document.getElementById('notice-modal')) closeModal();
}

// ── 등록 / 수정 제출 ──────────────────────────────────────
async function submitNotice() {
  const title   = document.getElementById('modal-title').value.trim();
  const content = document.getElementById('modal-content').value.trim();
  const tag     = document.getElementById('modal-tag').value;
  const pinned  = document.getElementById('modal-pinned').checked;

  if (!title)   { alert('제목을 입력해 주세요.'); return; }
  if (!content) { alert('내용을 입력해 주세요.'); return; }

  const body = { tag, title, content, pinned };
  const url  = editingId ? `/watchman/api/notices/${editingId}` : '/watchman/api/notices';
  const method = editingId ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (res.ok) {
    closeModal();
    await loadNotices();
  } else {
    alert('처리 중 오류가 발생했습니다.');
  }
}

// ── 삭제 ──────────────────────────────────────────────────
async function deleteNotice(id) {
  if (!confirm('이 공지를 삭제하시겠습니까?')) return;
  const res = await fetch(`/watchman/api/notices/${id}`, { method: 'DELETE' });
  if (res.ok) {
    await loadNotices();
  } else {
    alert('삭제 중 오류가 발생했습니다.');
  }
}

// ── 유틸 ──────────────────────────────────────────────────
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function handleExit() {
  fetch('/watchman/api/auth/logout', { method: 'POST' }).finally(() => {
    sessionStorage.clear();
    window.location.href = 'index.html';
  });
}
