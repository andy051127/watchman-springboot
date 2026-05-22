// auth-guard.js — 보호 페이지 진입 시 로그인 여부 확인
// 비회원 모드(?guest=1)는 체크 제외
(async function () {
  if (new URLSearchParams(window.location.search).get('guest') === '1') return;
  try {
    const res = await fetch('/watchman/api/users/me');
    if (!res.ok) {
      alert('로그아웃 되었습니다.\n로그인 해 주십시오.');
      window.location.replace('index.html');
      return;
    }
    const user = await res.json();
    // 관리자 계정이면 관리자 페이지 버튼 표시
    if (user.isAdmin === 1) {
      const btn = document.getElementById('btn-admin-nav');
      if (btn) btn.style.display = 'inline-flex';
    }
  } catch (e) {
    // 네트워크 오류는 무시 (일시적 단절)
  }
})();
