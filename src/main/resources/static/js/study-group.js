// study-group.js — 스터디 그룹

let groups = [];
let myUserId = null;
let myNickname = '사용자';

document.addEventListener('DOMContentLoaded', async () => {
  await loadMyInfo();
  await loadGroups();
});

// ── 내 정보 로드 ───────────────────────────────────────────
async function loadMyInfo() {
  try {
    const cached = sessionStorage.getItem('nickname');
    const cachedId = sessionStorage.getItem('userId');
    if (cached && cachedId) {
      myNickname = cached;
      myUserId = Number(cachedId);
    } else {
      const res = await fetch('/watchman/api/users/me');
      if (res.ok) {
        const user = await res.json();
        myNickname = user.nickname;
        myUserId   = user.userId;
        sessionStorage.setItem('nickname', user.nickname);
        sessionStorage.setItem('userId',   user.userId);
        sessionStorage.setItem('avatar',   user.avatar || '');
      }
    }
  } catch (e) {}
  const nickEl = document.getElementById('nav-nickname');
  if (nickEl) nickEl.textContent = myNickname;
}

// ── 그룹 목록 로드 ────────────────────────────────────────
async function loadGroups() {
  try {
    const res = await fetch('/watchman/api/groups');
    if (res.ok) groups = await res.json();
    else groups = [];
  } catch (e) { groups = []; }
  renderGroupList();
}

// ── 패널 전환 ─────────────────────────────────────────────
function showPanel(name) {
  ['list', 'create', 'join'].forEach(p => {
    const el = document.getElementById(`panel-${p}`);
    if (el) el.style.display = p === name ? 'block' : 'none';
  });
  if (name === 'create') {
    document.getElementById('new-group-name').value = '';
    document.getElementById('new-group-desc').value = '';
    document.getElementById('create-msg').style.display = 'none';
  }
  if (name === 'join') {
    document.getElementById('join-code').value = '';
    document.getElementById('join-msg').style.display = 'none';
  }
}

// ── 그룹 목록 렌더링 ──────────────────────────────────────
function renderGroupList() {
  const container = document.getElementById('group-list-content');
  if (groups.length === 0) {
    container.innerHTML = `
      <div class="sg-empty">
        <p>아직 참여한 그룹이 없어요.</p>
        <p class="sg-empty-sub">그룹을 만들거나 초대 코드로 참여해 보세요!</p>
      </div>`;
    return;
  }
  container.innerHTML = `<div class="sg-group-list">${groups.map(g => {
    const sorted = [...g.members].sort((a, b) => b.totalTime - a.totalTime);
    const myRank = sorted.findIndex(m => m.userId == myUserId) + 1;
    const totalGroupTime = g.members.reduce((a, m) => a + (m.totalTime || 0), 0);
    const amLeader = g.leaderId == myUserId;
    return `
      <div class="sg-group-card" onclick="openDetail(${g.groupId})">
        <div class="sg-group-card-top">
          <div class="sg-group-card-info">
            <div class="sg-group-card-name">${esc(g.name)}${amLeader ? '<span class="sg-leader-badge">그룹장</span>' : ''}</div>
            ${g.description ? `<div class="sg-group-card-desc">${esc(g.description)}</div>` : ''}
          </div>
          <svg class="sg-group-card-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
        <div class="sg-group-card-bottom">
          <div class="sg-group-chip"><span class="sg-chip-label">멤버</span><span class="sg-chip-value">${g.members.length}명</span></div>
          <div class="sg-group-chip"><span class="sg-chip-label">내 순위</span><span class="sg-chip-value">${myRank > 0 ? myRank + '위' : '-'}</span></div>
          <div class="sg-group-chip"><span class="sg-chip-label">그룹 총 공부</span><span class="sg-chip-value">${totalGroupTime > 0 ? fmtSec(totalGroupTime) : '-'}</span></div>
        </div>
      </div>`;
  }).join('')}</div>`;
}

// ── 그룹 상세 ─────────────────────────────────────────────
function openDetail(groupId) {
  window.location.href = 'study-group-info.html?groupId=' + groupId;
}

// ── 그룹 만들기 ───────────────────────────────────────────
async function handleCreateGroup() {
  const name = document.getElementById('new-group-name').value.trim();
  const desc = document.getElementById('new-group-desc').value.trim();
  const msg  = document.getElementById('create-msg');

  if (!name) { showMsg(msg, '그룹 이름을 입력해 주세요.'); return; }

  try {
    const res = await fetch('/watchman/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: desc })
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.newAchievements?.length) showAchievementToasts(data.newAchievements);
      await loadGroups();
      showPanel('list');
    } else {
      const data = await res.json();
      showMsg(msg, data.message || '그룹 생성에 실패했습니다.');
    }
  } catch (e) {
    showMsg(msg, '서버 오류가 발생했습니다.');
  }
}

// ── 초대코드 참여 ─────────────────────────────────────────
async function handleJoinGroup() {
  const code = document.getElementById('join-code').value.trim();
  const msg  = document.getElementById('join-msg');

  if (!code) { showMsg(msg, '초대 코드를 입력해 주세요.'); return; }

  try {
    const res = await fetch('/watchman/api/groups/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode: code })
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.newAchievements?.length) showAchievementToasts(data.newAchievements);
      await loadGroups();
      showPanel('list');
    } else {
      const data = await res.json();
      showMsg(msg, data.message || '참여에 실패했습니다.');
    }
  } catch (e) {
    showMsg(msg, '서버 오류가 발생했습니다.');
  }
}

// ── 유틸 ──────────────────────────────────────────────────
function showMsg(el, text) {
  el.textContent = text;
  el.style.display = 'block';
}

function fmtSec(sec) {
  const s = Number(sec) || 0;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분`;
  return `${s}초`;
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
