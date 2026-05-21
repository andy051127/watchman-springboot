// auth-guard.js — 보호 페이지 진입 시 로그인 여부 확인
// window.__authReady: 유저 정보 로드 완료를 알리는 Promise (page JS에서 await 가능)
window.__authReady = (async function () {
  if (new URLSearchParams(window.location.search).get('guest') === '1') return null;
  try {
    const res = await fetch('/watchman/api/users/me');
    if (!res.ok) {
      alert('로그아웃 되었습니다.\n로그인 해 주십시오.');
      window.location.replace('index.html');
      return null;
    }
    const user = await res.json();

    // 아바타 표시
    const avatarSrc = user.avatar || '';
    if (avatarSrc) {
      sessionStorage.setItem('avatar', avatarSrc);
      const emojiEl = document.getElementById('nav-avatar-emoji');
      const imgEl   = document.getElementById('nav-avatar-img');
      if (emojiEl) emojiEl.style.display = 'none';
      if (imgEl)   { imgEl.src = avatarSrc; imgEl.style.display = 'block'; }
    }

    // 관리자 계정이면 관리자 페이지 버튼 표시
    if (user.isAdmin === 1) {
      const btn = document.getElementById('btn-admin-nav');
      if (btn) btn.style.display = 'inline-flex';
    }

    return user;
  } catch (e) {
    return null;
  }
})();
