// mypage.js — 마이페이지 UI

// ── 페이지 진입점 ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initMyPage();
});

// ── 페이지 초기화 ─────────────────────────────────────────────────────────────
// 사용자 정보와 전체 세션 통계를 병렬로 불러와 화면에 표시한다.
async function initMyPage() {
  try {
    const [userRes, sessionsRes] = await Promise.all([
      fetch('/watchman/api/users/me'),
      fetch('/watchman/api/sessions')
    ]);

    // 세션 만료 또는 미로그인 → 로그인 페이지로 이동
    if (userRes.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const user     = await userRes.json();
    const sessions = await sessionsRes.json();

    // 프로필 영역 표시
    document.getElementById('nav-nickname').textContent     = user.nickname;
    document.getElementById('profile-name').textContent     = user.nickname;
    document.getElementById('profile-email').textContent    = user.email;
    document.getElementById('profile-joined').textContent   = `가입일 ${fmtJoinDate(user.createdAt)}`;
    document.getElementById('nick-display').textContent     = user.nickname;

    // 아바타: 저장된 값이 있으면 이미지로 표시, 없으면 기본 이모지 유지
    if (user.avatar) {
      showAvatarImg(user.avatar);
      document.getElementById('avatar-status').textContent  = '사진이 설정되어 있어요.';
      document.getElementById('btn-remove-avatar').style.display = 'inline';
    }

    // 통계 카드
    const totalFocused = sessions.reduce((acc, s) => acc + s.focusedTime, 0);
    const avgRate      = sessions.length > 0
      ? Math.round(sessions.reduce((acc, s) => acc + Number(s.focusRate), 0) / sessions.length)
      : 0;

    document.getElementById('my-total-time').textContent     = totalFocused > 0 ? fmtSec(totalFocused) : '-';
    document.getElementById('my-total-sessions').textContent = sessions.length > 0 ? `${sessions.length}회` : '-';
    document.getElementById('my-avg-rate').textContent       = sessions.length > 0 ? `${avgRate}%` : '-';

  } catch (err) {
    console.error('마이페이지 로드 실패:', err);
  }
}

// ── 프로필 사진 ───────────────────────────────────────────────────────────────

// 파일 선택 시: 이미지를 200×200 정사각형으로 잘라 base64로 변환한 뒤 서버에 저장한다.
// PATCH /api/users/me/avatar { avatar: base64문자열 }
// DB의 avatar 컬럼은 TEXT 타입이므로 base64 문자열을 그대로 저장 가능하다.
function handleFileChange(e) {
  const file = e.target.files[0];
  if (!file || !file.type.startsWith('image/')) return;

  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = async () => {
      // Canvas로 200×200 정사각형 크롭
      const canvas = document.createElement('canvas');
      canvas.width = 200; canvas.height = 200;
      const ctx  = canvas.getContext('2d');
      const size = Math.min(img.width, img.height);
      const sx   = (img.width  - size) / 2;
      const sy   = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 200, 200);
      const base64 = canvas.toDataURL('image/jpeg', 0.85);

      try {
        const res = await fetch('/watchman/api/users/me/avatar', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: base64 })
        });
        if (res.status === 401) { window.location.href = 'login.html'; return; }

        // 서버 저장 성공 시 화면 업데이트
        showAvatarImg(base64);
        sessionStorage.setItem('avatar', base64); // 다른 페이지에서 참조용
        document.getElementById('avatar-status').textContent = '사진이 설정되어 있어요.';
        document.getElementById('btn-remove-avatar').style.display = 'inline';
      } catch (err) {
        console.error('아바타 저장 실패:', err);
      }
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = ''; // 같은 파일 재선택 가능하도록 초기화
}

// 아바타 이미지를 화면에 표시한다.
function showAvatarImg(src) {
  document.getElementById('mypage-avatar-emoji').style.display = 'none';
  const imgEl = document.getElementById('mypage-avatar-img');
  imgEl.src   = src;
  imgEl.style.display = 'block';
}

// 아바타 제거: 서버에 빈 문자열로 업데이트하고 기본 이모지로 되돌린다.
// PATCH /api/users/me/avatar { avatar: "" }
async function removeAvatar() {
  try {
    const res = await fetch('/watchman/api/users/me/avatar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar: '' })
    });
    if (res.status === 401) { window.location.href = 'login.html'; return; }

    document.getElementById('mypage-avatar-emoji').style.display = 'flex';
    document.getElementById('mypage-avatar-img').style.display   = 'none';
    document.getElementById('mypage-avatar-img').src             = '';
    document.getElementById('avatar-status').textContent         = '기본 이모지가 사용 중이에요.';
    document.getElementById('btn-remove-avatar').style.display   = 'none';
    sessionStorage.setItem('avatar', '');
  } catch (err) {
    console.error('아바타 제거 실패:', err);
  }
}

// ── 닉네임 변경 ───────────────────────────────────────────────────────────────

function toggleNickEdit() {
  document.getElementById('nick-row').style.display      = 'none';
  document.getElementById('nick-edit-row').style.display = 'flex';
  document.getElementById('nick-input').value            = document.getElementById('nick-display').textContent;
  document.getElementById('nick-input').focus();
}

function cancelNickEdit() {
  document.getElementById('nick-row').style.display      = 'flex';
  document.getElementById('nick-edit-row').style.display = 'none';
  document.getElementById('nick-msg').textContent        = '';
}

// PATCH /api/users/me/nickname { nickname }
// 성공 시 화면의 닉네임 텍스트와 sessionStorage를 함께 업데이트한다.
async function saveNickname() {
  const val = document.getElementById('nick-input').value.trim();
  const msg = document.getElementById('nick-msg');
  if (!val) { showMsg(msg, '닉네임을 입력해 주세요.', false); return; }

  try {
    const res = await fetch('/watchman/api/users/me/nickname', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: val })
    });
    if (res.status === 401) { window.location.href = 'login.html'; return; }

    if (res.ok) {
      // 화면의 모든 닉네임 표시 위치를 동시에 갱신
      document.getElementById('nick-display').textContent  = val;
      document.getElementById('profile-name').textContent  = val;
      document.getElementById('nav-nickname').textContent  = val;
      sessionStorage.setItem('nickname', val); // 다른 페이지(메인 등)에서 참조용
      showMsg(msg, '닉네임이 변경됐어요!', true);
      setTimeout(cancelNickEdit, 1000);
    }
  } catch (err) {
    showMsg(msg, '변경 중 오류가 발생했어요.', false);
    console.error('닉네임 변경 실패:', err);
  }
}

// ── 비밀번호 변경 ─────────────────────────────────────────────────────────────

function togglePwEdit() {
  document.getElementById('pw-row').style.display      = 'none';
  document.getElementById('pw-edit-row').style.display = 'flex';
}

function cancelPwEdit() {
  document.getElementById('pw-row').style.display      = 'flex';
  document.getElementById('pw-edit-row').style.display = 'none';
  ['cur-pw', 'new-pw', 'confirm-pw'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('pw-msg').textContent = '';
}

// PATCH /api/users/me/password { currentPassword, newPassword }
// 현재 비밀번호가 틀리면 서버가 400을 반환한다.
async function savePassword() {
  const cur = document.getElementById('cur-pw').value;
  const nw  = document.getElementById('new-pw').value;
  const con = document.getElementById('confirm-pw').value;
  const msg = document.getElementById('pw-msg');

  // 클라이언트 유효성 검증
  if (!cur || !nw || !con) { showMsg(msg, '모든 항목을 입력해 주세요.', false); return; }
  if (nw.length < 4)        { showMsg(msg, '비밀번호는 4자 이상이어야 해요.', false); return; }
  if (nw !== con)            { showMsg(msg, '새 비밀번호가 일치하지 않아요.', false); return; }

  try {
    const res = await fetch('/watchman/api/users/me/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: cur, newPassword: nw })
    });
    if (res.status === 401) { window.location.href = 'login.html'; return; }

    const data = await res.json();
    if (res.ok) {
      showMsg(msg, '비밀번호가 변경됐어요!', true);
      setTimeout(cancelPwEdit, 1000);
    } else {
      // 400: 현재 비밀번호 불일치 (UserServiceImpl → IllegalArgumentException)
      showMsg(msg, data.message || '현재 비밀번호가 올바르지 않아요.', false);
    }
  } catch (err) {
    showMsg(msg, '변경 중 오류가 발생했어요.', false);
    console.error('비밀번호 변경 실패:', err);
  }
}

function togglePw(inputId) {
  const input   = document.getElementById(inputId);
  input.type    = input.type === 'password' ? 'text' : 'password';
}

// ── 회원 탈퇴 ─────────────────────────────────────────────────────────────────

function showDeleteConfirm() {
  document.getElementById('delete-btn-area').style.display     = 'none';
  document.getElementById('delete-confirm-area').style.display = 'block';
}

function hideDeleteConfirm() {
  document.getElementById('delete-btn-area').style.display     = 'block';
  document.getElementById('delete-confirm-area').style.display = 'none';
}

// DELETE /api/users/me { password }
// 비밀번호 확인을 prompt()로 받아 서버에 전달한다.
// 성공 시 서버가 세션을 무효화하므로 클라이언트도 sessionStorage를 초기화한다.
async function handleDelete() {
  const password = prompt('탈퇴하려면 비밀번호를 입력해 주세요.');
  if (password === null) return; // 취소
  if (!password) { alert('비밀번호를 입력해 주세요.'); return; }

  try {
    const res = await fetch('/watchman/api/users/me', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    const data = await res.json();
    if (res.ok) {
      // 탈퇴 성공: 세션은 서버에서 이미 무효화됨
      sessionStorage.clear();
      window.location.href = 'index.html';
    } else {
      // 400: 비밀번호 불일치
      alert(data.message || '비밀번호가 올바르지 않아요.');
    }
  } catch (err) {
    alert('탈퇴 처리 중 오류가 발생했어요. 다시 시도해 주세요.');
    console.error('회원 탈퇴 실패:', err);
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

// ── 유틸 ──────────────────────────────────────────────────────────────────────

// 메시지 요소에 성공(ok) 또는 실패(err) 스타일로 텍스트를 표시한다.
function showMsg(el, text, ok) {
  el.textContent = text;
  el.className   = `mypage-msg ${ok ? 'ok' : 'err'}`;
}

// 초(sec)를 "N시간 M분" 형태로 변환
function fmtSec(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분`;
  return `${sec}초`;
}

// ISO 8601 문자열을 "YYYY년 M월 D일" 형태로 변환 (가입일 표시용)
function fmtJoinDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}
