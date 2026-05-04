// login.js — 로그인 / 회원가입 UI

// ── 탭 전환 ───────────────────────────────────────────────────────────────────
// 로그인 탭과 회원가입 탭 사이를 전환한다.
// tab: 'login' 또는 'signup'
function switchTab(tab) {
  const loginForm = document.getElementById('form-login');
  const signupForm = document.getElementById('form-signup');
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const subtitle = document.getElementById('login-subtitle');

  if (tab === 'login') {
    loginForm.style.display = 'flex';
    signupForm.style.display = 'none';
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    subtitle.textContent = '다시 오셨군요! 반가워요.';
  } else {
    loginForm.style.display = 'none';
    signupForm.style.display = 'flex';
    tabLogin.classList.remove('active');
    tabSignup.classList.add('active');
    subtitle.textContent = '함께 공부해봐요!';
  }
}

// ── 비밀번호 표시/숨기기 토글 ─────────────────────────────────────────────────
// inputId: 비밀번호 input 요소의 id
// btn: 토글 버튼 요소 (아이콘을 직접 변경함)
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.innerHTML = isHidden
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>`;
}

// ── 이메일 도메인 직접입력 처리 ───────────────────────────────────────────────
// 드롭다운에서 '직접입력'을 선택하면 커스텀 도메인 입력 칸을 표시한다.
function checkCustomDomain() {
  const select = document.getElementById('signup-email-domain');
  const customInput = document.getElementById('signup-email-custom');
  customInput.style.display = select.value === '직접입력' ? 'block' : 'none';
}

// ── 로그인 처리 ───────────────────────────────────────────────────────────────
// POST /api/auth/login { email, password }
// 성공(200): 서버가 세션을 발급하고 userId/nickname/avatar를 반환 → main.html로 이동
// 실패(401): 이메일 또는 비밀번호 불일치 → 에러 메시지 표시
async function handleLogin(e) {
  e.preventDefault();

  const email   = document.getElementById('login-email').value.trim();
  const pw      = document.getElementById('login-pw').value;
  const errorEl = document.getElementById('login-error');

  // 빈 값 클라이언트 검증 (서버 호출 전 차단)
  if (!email || !pw) {
    showError(errorEl, '이메일과 비밀번호를 입력해 주세요.');
    return;
  }

  try {
    // 로그인 API 호출
    const res = await fetch('/watchman/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pw })
    });

    if (res.ok) {
      // 로그인 성공: 서버가 세션 쿠키를 자동 발급
      // 응답 데이터를 sessionStorage에 저장해 다른 페이지에서 닉네임/아바타에 활용
      const data = await res.json();
      sessionStorage.setItem('userId',   data.userId);
      sessionStorage.setItem('nickname', data.nickname);
      sessionStorage.setItem('avatar',   data.avatar);

      // 메인 페이지로 이동
      window.location.href = 'main.html';
    } else {
      // 로그인 실패: 401 Unauthorized
      const data = await res.json();
      showError(errorEl, data.message || '이메일 또는 비밀번호가 올바르지 않습니다.');
    }
  } catch (err) {
    // 네트워크 오류 또는 서버 다운
    showError(errorEl, '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');
  }
}

// ── 회원가입 처리 ─────────────────────────────────────────────────────────────
// POST /api/auth/register { nickname, email, password }
// 성공(200): 가입 완료 → 로그인 탭으로 전환
// 실패(409): 이미 사용 중인 이메일 → 에러 메시지 표시
async function handleSignup(e) {
  e.preventDefault();

  const nickname    = document.getElementById('signup-nickname').value.trim();
  const emailLocal  = document.getElementById('signup-email-local').value.trim();
  const domain      = document.getElementById('signup-email-domain').value;
  const customDomain = document.getElementById('signup-email-custom').value.trim();
  const pw          = document.getElementById('signup-pw').value;
  const pwConfirm   = document.getElementById('signup-pw-confirm').value;
  const errorEl     = document.getElementById('signup-error');

  // ── 클라이언트 유효성 검증 ──────────────────────────────────────────────────
  if (nickname.length < 2) {
    showError(errorEl, '닉네임은 2자 이상으로 입력해 주세요.');
    return;
  }
  if (!emailLocal) {
    showError(errorEl, '이메일 아이디를 입력해 주세요.');
    return;
  }
  if (domain === '직접입력' && !customDomain) {
    showError(errorEl, '도메인을 입력해 주세요.');
    return;
  }
  if (pw.length < 6) {
    showError(errorEl, '비밀번호는 6자 이상으로 입력해 주세요.');
    return;
  }
  if (pw !== pwConfirm) {
    showError(errorEl, '비밀번호가 일치하지 않아요.');
    return;
  }

  // 이메일 조합: 아이디 + @ + 도메인(선택 또는 직접 입력)
  const fullEmail = `${emailLocal}@${domain === '직접입력' ? customDomain : domain}`;

  try {
    // 회원가입 API 호출
    const res = await fetch('/watchman/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, email: fullEmail, password: pw })
    });

    if (res.ok) {
      // 가입 성공: 로그인 탭으로 전환하여 바로 로그인할 수 있게 안내
      alert('회원가입이 완료되었습니다! 로그인해 주세요.');
      switchTab('login');
    } else if (res.status === 409) {
      // 이메일 중복: UserServiceImpl이 IllegalArgumentException → 409 반환
      const data = await res.json();
      showError(errorEl, data.message || '이미 사용 중인 이메일입니다.');
    } else {
      showError(errorEl, '회원가입 중 오류가 발생했습니다. 다시 시도해 주세요.');
    }
  } catch (err) {
    // 네트워크 오류 또는 서버 다운
    showError(errorEl, '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');
  }
}

// ── 에러 메시지 표시 ──────────────────────────────────────────────────────────
// el: 에러를 표시할 DOM 요소
// msg: 사용자에게 보여줄 메시지 문자열
function showError(el, msg) {
  el.textContent = '⚠ ' + msg;
  el.style.display = 'block';
}
