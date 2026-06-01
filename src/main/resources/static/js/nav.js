// nav.js — 공통 네브바 주입 + 로그아웃 처리
(function () {
  const page = location.pathname.split('/').pop() || 'main.html';

  function active(href) {
    return page === href ? ' active' : '';
  }

  const nav = document.getElementById('nav-root');
  if (!nav) return;

  nav.innerHTML = `
    <nav class="main-nav">
      <div class="main-nav-inner">
        <a href="main.html" class="main-nav-logo">
          <img src="assets/icon.svg" alt="Watchman" width="24" height="24" />
          <span>Watchman</span>
        </a>
        <div class="main-nav-links">
          <a href="main.html"        class="nav-link${active('main.html')}">홈</a>
          <a href="stats.html"       class="nav-link${active('stats.html')}"       id="nav-stats">내 통계</a>
          <a href="study-group.html" class="nav-link${active('study-group.html')}" id="nav-group">스터디 그룹</a>
          <a href="planner.html"     class="nav-link${active('planner.html')}"     id="nav-planner">플래너</a>
          <a href="notice.html"      class="nav-link${active('notice.html')}">공지사항</a>
        </div>
        <div class="main-nav-right">
          <a href="mypage.html" class="nav-avatar" id="nav-avatar">
            <span id="nav-avatar-emoji">😊</span>
            <img id="nav-avatar-img" src="" alt="프로필"
                 style="display:none;width:100%;height:100%;object-fit:cover;border-radius:50%;" />
          </a>
          <a href="mypage.html" class="nav-nickname" id="nav-nickname">사용자</a>
          <button class="btn-nav-exit" id="btn-exit" onclick="handleExit()">로그아웃</button>
        </div>
      </div>
    </nav>`;
})();

// 공통 로그아웃 — 페이지별 JS에서 개별 정의 불필요
async function handleExit() {
  const isGuest = new URLSearchParams(location.search).get('guest') === '1';
  if (!isGuest) {
    try { await fetch('/watchman/api/auth/logout', { method: 'POST' }); } catch (_) {}
    sessionStorage.clear();
  }
  location.href = 'index.html';
}
