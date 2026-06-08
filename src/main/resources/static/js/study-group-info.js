// study-group-info.js — 그룹 상세 페이지

let group = null;
let myUserId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadMyInfo();
  const groupId = new URLSearchParams(window.location.search).get('groupId');
  if (!groupId) { window.location.href = 'study-group.html'; return; }
  await loadGroup(groupId);
});

async function loadMyInfo() {
  const cached = sessionStorage.getItem('userId');
  if (cached) { myUserId = Number(cached); return; }
  try {
    const res = await fetch('/watchman/api/users/me');
    if (res.ok) {
      const user = await res.json();
      myUserId = user.userId;
      sessionStorage.setItem('userId',   user.userId);
      sessionStorage.setItem('nickname', user.nickname);
      sessionStorage.setItem('avatar',   user.avatar || '');
    }
  } catch (e) {}
}

async function loadGroup(groupId) {
  try {
    const res = await fetch(`/watchman/api/groups/${groupId}`);
    if (!res.ok) { window.location.href = 'study-group.html'; return; }
    group = await res.json();
    renderDetail();
  } catch (e) {
    window.location.href = 'study-group.html';
  }
}

function renderDetail() {
  const g = group;
  const amLeader = g.leaderId == myUserId;
  const sorted = [...g.members].sort((a, b) => b.totalTime - a.totalTime);
  const myRank = sorted.findIndex(m => m.userId == myUserId) + 1;

  document.getElementById('sgi-group-name').textContent = g.name;

  document.getElementById('sgi-body').innerHTML = `
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

    <!-- 스터디룸 입장 버튼 -->
    <div style="display:flex;justify-content:center;margin:20px 0 8px;">
      <button class="sg-submit-btn" style="max-width:320px;font-size:16px;"
              onclick="enterRoom(${g.groupId})">
        스터디룸 들어가기
      </button>
    </div>

    <div class="sg-detail-actions">
      ${amLeader
        ? `<button class="sg-disband-btn" onclick="handleDisband(${g.groupId})">그룹 폐쇄</button>`
        : `<button class="sg-leave-btn"   onclick="handleLeave(${g.groupId})">그룹 나가기</button>`
      }
    </div>`;
}

// ── 스터디룸 입장 ──────────────────────────────────────────
function enterRoom(groupId) {
  window.location.href = `study-group-session.html?groupId=${groupId}`;
}

// ── 멤버 강퇴 (방장) ───────────────────────────────────────
async function kickMember(targetUserId, nickname) {
  if (!confirm(`'${nickname}' 님을 강퇴하시겠습니까?`)) return;
  try {
    const res = await fetch(`/watchman/api/groups/${group.groupId}/members/${targetUserId}`, { method: 'DELETE' });
    if (res.ok) { await loadGroup(group.groupId); }
    else { const d = await res.json(); alert(d.message || '강퇴에 실패했습니다.'); }
  } catch (e) { alert('서버 오류가 발생했습니다.'); }
}

// ── 그룹 나가기 (일반 멤버) ───────────────────────────────
async function handleLeave(groupId) {
  if (!confirm('그룹을 나가시겠습니까?')) return;
  try {
    const res = await fetch(`/watchman/api/groups/${groupId}/members/me`, { method: 'DELETE' });
    if (res.ok) { window.location.href = 'study-group.html'; }
    else { const d = await res.json(); alert(d.message || '나가기에 실패했습니다.'); }
  } catch (e) { alert('서버 오류가 발생했습니다.'); }
}

// ── 그룹 폐쇄 (방장) ──────────────────────────────────────
async function handleDisband(groupId) {
  if (!confirm('그룹을 폐쇄하시겠습니까?\n모든 멤버가 제거되며 되돌릴 수 없습니다.')) return;
  try {
    const res = await fetch(`/watchman/api/groups/${groupId}`, { method: 'DELETE' });
    if (res.ok) { window.location.href = 'study-group.html'; }
    else { const d = await res.json(); alert(d.message || '폐쇄에 실패했습니다.'); }
  } catch (e) { alert('서버 오류가 발생했습니다.'); }
}

// ── 초대코드 복사 ──────────────────────────────────────────
function copyCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('copy-btn');
    if (btn) { btn.textContent = '복사됨 ✓'; setTimeout(() => { btn.textContent = '복사'; }, 1500); }
  });
}

// ── 유틸 ──────────────────────────────────────────────────
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
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
