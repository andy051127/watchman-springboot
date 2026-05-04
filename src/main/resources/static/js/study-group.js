// study-group.js — 스터디 그룹 패널 UI

// TODO: API 연동
// GET /api/groups → StudyGroup[]
// POST /api/groups { name, description } → StudyGroup
// POST /api/groups/join { inviteCode } → StudyGroup
// DELETE /api/groups/:id/members/me → 그룹 나가기

let groups = getDemoGroups();
let selectedGroupId = null;

document.addEventListener('DOMContentLoaded', () => {
  renderGroupList();
  const nickEl = document.getElementById('nav-nickname');
  if (nickEl) nickEl.textContent = '사용자';
});

function showPanel(name) {
  ['list','create','join','detail'].forEach(p => {
    const el = document.getElementById(`panel-${p}`);
    if (el) el.style.display = p === name ? 'block' : 'none';
  });
  // 에러 메시지 초기화
  if (name === 'create') { document.getElementById('create-msg').style.display = 'none'; }
  if (name === 'join') { document.getElementById('join-msg').style.display = 'none'; }
}

function renderGroupList() {
  const container = document.getElementById('group-list-content');
  if (groups.length === 0) {
    container.innerHTML = `
      <div class="sg-empty">
        <span>👥</span>
        <p>아직 참여한 그룹이 없어요.</p>
        <p class="sg-empty-sub">그룹을 만들거나 초대 코드로 참여해 보세요!</p>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="sg-group-list">${groups.map(g => {
    const sorted = [...g.members].sort((a,b) => b.totalTime - a.totalTime);
    const myRank = sorted.findIndex(m => m.nickname === '사용자') + 1;
    const totalGroupTime = g.members.reduce((a,m) => a + m.totalTime, 0);
    return `
      <div class="sg-group-card" onclick="openDetail('${g.id}')">
        <div class="sg-group-card-top">
          <div class="sg-group-card-icon">👥</div>
          <div class="sg-group-card-info">
            <div class="sg-group-card-name">${g.name}</div>
            ${g.description ? `<div class="sg-group-card-desc">${g.description}</div>` : ''}
          </div>
          <svg class="sg-group-card-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
        <div class="sg-group-card-bottom">
          <div class="sg-group-chip"><span class="sg-chip-label">멤버</span><span class="sg-chip-value">${g.members.length}명</span></div>
          <div class="sg-group-chip"><span class="sg-chip-label">내 순위</span><span class="sg-chip-value">${myRank > 0 ? myRank+'위' : '-'}</span></div>
          <div class="sg-group-chip"><span class="sg-chip-label">그룹 총 공부</span><span class="sg-chip-value">${totalGroupTime > 0 ? fmtSec(totalGroupTime) : '-'}</span></div>
        </div>
      </div>`;
  }).join('')}</div>`;
}

function openDetail(id) {
  selectedGroupId = id;
  const g = groups.find(x => x.id === id);
  if (!g) return;

  document.getElementById('detail-group-name').textContent = g.name;
  const sorted = [...g.members].sort((a,b) => b.totalTime - a.totalTime);
  const myNickname = '사용자';
  const myRank = sorted.findIndex(m => m.nickname === myNickname) + 1;

  document.getElementById('detail-body').innerHTML = `
    <div class="sg-info-card">
      <div class="sg-info-left">
        <div class="sg-group-icon">👥</div>
        <div>
          <div class="sg-group-name">${g.name}</div>
          ${g.description ? `<div class="sg-group-desc">${g.description}</div>` : ''}
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
      <div class="sg-section-title">🏆 공부 시간 랭킹</div>
      <div class="sg-rank-list">
        ${sorted.map((m, i) => {
          const isMe = m.nickname === myNickname;
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
          const rateC = m.focusRate >= 70 ? 'good' : m.focusRate >= 40 ? 'ok' : 'bad';
          const barW = sorted[0].totalTime > 0 ? Math.round((m.totalTime / sorted[0].totalTime) * 100) : 0;
          return `
            <div class="sg-rank-row ${isMe ? 'me' : ''}">
              <div class="sg-rank-num">${medal ?? `<span class="sg-rank-plain">${i+1}</span>`}</div>
              <div class="sg-rank-avatar">${isMe ? '😊' : '🙂'}</div>
              <div class="sg-rank-info">
                <div class="sg-rank-name">${m.nickname}${isMe ? '<span class="sg-me-badge">나</span>' : ''}</div>
                <div class="sg-rank-bar-wrap"><div class="sg-rank-bar" style="width:${barW}%"></div></div>
              </div>
              <div class="sg-rank-stats">
                <div class="sg-rank-time">${m.totalTime > 0 ? fmtSec(m.totalTime) : '-'}</div>
                <div class="sg-rank-rate ${rateC}">${m.totalTime > 0 ? m.focusRate+'%' : '-'}</div>
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>
    <button class="sg-leave-btn" onclick="handleLeave('${g.id}')">그룹 나가기</button>`;

  showPanel('detail');
}

function handleCreateGroup() {
  const name = document.getElementById('new-group-name').value.trim();
  const desc = document.getElementById('new-group-desc').value.trim();
  const msg = document.getElementById('create-msg');

  if (!name) { msg.textContent = '그룹 이름을 입력해 주세요.'; msg.style.display = 'block'; return; }

  // TODO: POST /api/groups { name, description: desc }
  // 임시: 로컬에 추가
  const newGroup = {
    id: Date.now().toString(),
    name,
    description: desc,
    inviteCode: Math.random().toString(36).substring(2,8).toUpperCase(),
    createdAt: new Date().toISOString(),
    members: [{ nickname: '사용자', totalTime: 0, focusRate: 0 }]
  };
  groups.push(newGroup);
  document.getElementById('new-group-name').value = '';
  document.getElementById('new-group-desc').value = '';
  renderGroupList();
  showPanel('list');
}

function handleJoinGroup() {
  const code = document.getElementById('join-code').value.trim();
  const msg = document.getElementById('join-msg');

  if (!code) { msg.textContent = '초대 코드를 입력해 주세요.'; msg.style.display = 'block'; return; }

  // TODO: POST /api/groups/join { inviteCode: code }
  // 임시: 코드 확인
  const found = groups.find(g => g.inviteCode === code);
  if (!found) { msg.textContent = '존재하지 않는 초대 코드예요.'; msg.style.display = 'block'; return; }

  document.getElementById('join-code').value = '';
  renderGroupList();
  showPanel('list');
}

function handleLeave(groupId) {
  if (!confirm('그룹을 나가시겠습니까?')) return;
  // TODO: DELETE /api/groups/:groupId/members/me
  groups = groups.filter(g => g.id !== groupId);
  renderGroupList();
  showPanel('list');
}

function copyCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('copy-btn');
    if (btn) { btn.textContent = '복사됨 ✓'; setTimeout(() => { btn.textContent = '복사'; }, 1500); }
  });
}

function handleExit() {
  window.location.href = 'index.html';
}

// ── 유틸 ──────────────────────────────────────────────────

function fmtSec(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분`;
  return `${sec}초`;
}

function fmtDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

function getDemoGroups() {
  // TODO: GET /api/groups
  return [];
}
