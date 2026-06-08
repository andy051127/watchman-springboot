// achievement-toast.js — 업적 획득 토스트 알림
// 사용: showAchievementToast(achievement) 또는 showAchievementToasts([...])

let _toastQueue = [];
let _toastRunning = false;

function showAchievementToasts(achievements) {
  if (!achievements || achievements.length === 0) return;
  achievements.forEach(a => _toastQueue.push(a));
  if (!_toastRunning) _runToastQueue();
}

function showAchievementToast(achievement) {
  showAchievementToasts([achievement]);
}

function _runToastQueue() {
  if (_toastQueue.length === 0) { _toastRunning = false; return; }
  _toastRunning = true;
  const a = _toastQueue.shift();
  _showOne(a, () => _runToastQueue());
}

function _showOne(a, onDone) {
  const el = document.createElement('div');
  el.className = 'ach-toast';
  el.innerHTML = `
    <div class="ach-toast-icon">${a.icon || '🏆'}</div>
    <div class="ach-toast-body">
      <div class="ach-toast-label">업적 해금!</div>
      <div class="ach-toast-name">${_esc(a.name)}</div>
      <div class="ach-toast-desc">${_esc(a.description)}</div>
    </div>`;
  document.body.appendChild(el);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add('ach-toast-show'));
  });

  setTimeout(() => {
    el.classList.remove('ach-toast-show');
    setTimeout(() => { el.remove(); onDone(); }, 380);
  }, 3800);
}

function _esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// 메인 페이지 진입 시 새 업적 확인
// localStorage 'watchman-ach-lastcheck' 이후 획득한 업적을 토스트로 표시
async function checkNewAchievementsOnLoad() {
  try {
    const lastCheck = localStorage.getItem('watchman-ach-lastcheck');
    const res = await fetch('/watchman/api/achievements/my');
    if (!res.ok) return;
    const data = await res.json(); // [{ achievementId, earnedAt, achievement }]

    const newOnes = lastCheck
      ? data.filter(ua => new Date(ua.earnedAt) > new Date(lastCheck))
      : [];

    // 항상 lastCheck 갱신
    localStorage.setItem('watchman-ach-lastcheck', new Date().toISOString());

    if (newOnes.length > 0) {
      // 약간 딜레이 후 표시 (페이지 로드 완료 후)
      setTimeout(() => {
        showAchievementToasts(newOnes.map(ua => ua.achievement || { name: ua.achievementId, icon: '🏆', description: '' }));
      }, 800);
    }
  } catch (_) {}
}
