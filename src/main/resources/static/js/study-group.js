// study-group.js — 스터디 그룹

let groups = [];
let myUserId = null;
let myNickname = '사용자';
let selectedGroup = null;

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
    }
    const user = await window.__authReady;
    if (user) {
      myNickname = user.nickname;
      myUserId   = user.userId;
      sessionStorage.setItem('nickname', user.nickname);
      sessionStorage.setItem('userId',   String(user.userId));
      if (user.avatar) {
        sessionStorage.setItem('avatar', user.avatar);
        const emojiEl = document.getElementById('nav-avatar-emoji');
        const imgEl   = document.getElementById('nav-avatar-img');
        if (emojiEl) emojiEl.style.display = 'none';
        if (imgEl)   { imgEl.src = user.avatar; imgEl.style.display = 'block'; }
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
  ['list', 'create', 'join', 'detail'].forEach(p => {
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
  selectedGroup = groups.find(g => g.groupId === groupId);
  if (!selectedGroup) return;
  const g = selectedGroup;
  const amLeader = g.leaderId == myUserId;

  document.getElementById('detail-group-name').textContent = g.name;

  const sorted = [...g.members].sort((a, b) => b.totalTime - a.totalTime);
  const myRank = sorted.findIndex(m => m.userId == myUserId) + 1;

  document.getElementById('detail-body').innerHTML = `
    <div class="sg-info-card">
      <div class="sg-info-left">
        <div>
          <div class="sg-group-name">${esc(g.name)}${amLeader ? '<span class="sg-leader-badge">그룹장</span>' : ''}</div>
          ${g.description ? `<div class="sg-group-desc">${esc(g.description)}</div>` : ''}
          <div class="sg-group-meta">멤버 ${g.members.length}명 · ${fmtDate(g.createdAt)} 개설</div>
        </div>
      </div>
      <div class="sg-invite-wrap">
        <div class="sg-invite-label">초대 코드</div>
        <div class="sg-invite-code-row">
          <span class="sg-invite-code">${g.inviteCode}</span>
          <button class="sg-copy-btn" id="copy-btn" onclick="copyCode('${g.inviteCode}')">복사</button>
        </div>
      </div>
    </div>

    ${myRank > 0 ? `
    <div class="sg-myrank-card">
      <span class="sg-myrank-label">내 순위</span>
      <span class="sg-myrank-value">${myRank}위</span>
      <span class="sg-myrank-sub">/ ${g.members.length}명 중</span>
    </div>` : ''}

    <div class="sg-section">
      <div class="sg-section-title">공부 시간 랭킹</div>
      <div class="sg-rank-list">
        ${sorted.map((m, i) => {
          const isMe = m.userId == myUserId;
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
          const rateN = Math.round(Number(m.focusRate) || 0);
          const rateC = rateN >= 70 ? 'good' : rateN >= 40 ? 'ok' : 'bad';
          const maxTime = sorted[0].totalTime || 1;
          const barW = Math.round(((m.totalTime || 0) / maxTime) * 100);
          const kickBtn = amLeader && !isMe
            ? `<button class="sg-kick-btn" onclick="event.stopPropagation();kickMember(${m.userId},'${esc(m.nickname)}')">강퇴</button>`
            : '';
          return `
            <div class="sg-rank-row ${isMe ? 'me' : ''}">
              <div class="sg-rank-num">${medal ?? `<span class="sg-rank-plain">${i + 1}</span>`}</div>
              <div class="sg-rank-avatar">${(m.nickname || '?').charAt(0)}</div>
              <div class="sg-rank-info">
                <div class="sg-rank-name">
                  ${esc(m.nickname)}
                  ${m.isLeader ? '<span class="sg-leader-mini">그룹장</span>' : ''}
                  ${isMe ? '<span class="sg-me-badge">나</span>' : ''}
                </div>
                <div class="sg-rank-bar-wrap"><div class="sg-rank-bar" style="width:${barW}%"></div></div>
              </div>
              <div class="sg-rank-stats">
                <div class="sg-rank-time">${m.totalTime > 0 ? fmtSec(m.totalTime) : '-'}</div>
                <div class="sg-rank-rate ${rateC}">${m.totalTime > 0 ? rateN + '%' : '-'}</div>
              </div>
              ${kickBtn}
            </div>`;
        }).join('')}
      </div>
    </div>

    <div class="sg-detail-actions">
      ${amLeader
        ? `<button class="sg-disband-btn" onclick="handleDisband(${g.groupId})">그룹 폐쇄</button>`
        : `<button class="sg-leave-btn" onclick="handleLeave(${g.groupId})">그룹 나가기</button>`
      }
    </div>`;

  showPanel('detail');
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

// ── 그룹 나가기 (일반 멤버) ───────────────────────────────
async function handleLeave(groupId) {
  if (!confirm('그룹을 나가시겠습니까?')) return;
  try {
    const res = await fetch(`/watchman/api/groups/${groupId}/members/me`, { method: 'DELETE' });
    if (res.ok) {
      await loadGroups();
      showPanel('list');
    } else {
      const data = await res.json();
      alert(data.message || '나가기에 실패했습니다.');
    }
  } catch (e) {
    alert('서버 오류가 발생했습니다.');
  }
}

// ── 그룹 폐쇄 (그룹장) ───────────────────────────────────
async function handleDisband(groupId) {
  if (!confirm('그룹을 폐쇄하시겠습니까?\n모든 멤버가 그룹에서 제거되며 되돌릴 수 없습니다.')) return;
  try {
    const res = await fetch(`/watchman/api/groups/${groupId}`, { method: 'DELETE' });
    if (res.ok) {
      await loadGroups();
      showPanel('list');
    } else {
      const data = await res.json();
      alert(data.message || '폐쇄에 실패했습니다.');
    }
  } catch (e) {
    alert('서버 오류가 발생했습니다.');
  }
}

// ── 멤버 강퇴 (그룹장) ───────────────────────────────────
async function kickMember(targetUserId, nickname) {
  if (!confirm(`'${nickname}' 님을 강퇴하시겠습니까?`)) return;
  const g = selectedGroup;
  if (!g) return;
  try {
    const res = await fetch(`/watchman/api/groups/${g.groupId}/members/${targetUserId}`, { method: 'DELETE' });
    if (res.ok) {
      await loadGroups();
      const updated = groups.find(x => x.groupId === g.groupId);
      if (updated) openDetail(g.groupId);
      else showPanel('list');
    } else {
      const data = await res.json();
      alert(data.message || '강퇴에 실패했습니다.');
    }
  } catch (e) {
    alert('서버 오류가 발생했습니다.');
  }
}

// ── 복사 ──────────────────────────────────────────────────
function copyCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('copy-btn');
    if (btn) { btn.textContent = '복사됨 ✓'; setTimeout(() => { btn.textContent = '복사'; }, 1500); }
  });
}

function handleExit() {
  fetch('/watchman/api/auth/logout', { method: 'POST' }).finally(() => {
    sessionStorage.clear();
    window.location.href = 'index.html';
  });
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
