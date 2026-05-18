// animations.js — 스크롤 진입 애니메이션 (모든 페이지 공통)
(function () {
  const SELECTORS = [
    '.stat-card',
    '.stats-kpi-card',
    '.stats-card',
    '.dashboard-card',
    '.quick-start-card',
    '.notice-item',
    '.sg-group-card',
    '.sg-form-card',
    '.sg-info-card',
    '.sg-myrank-card',
    '.sg-section',
    '.planner-stat-chip',
    '.planner-calendar-card',
    '.planner-notebook',
    '.howto-step-grid',
  ].join(',');

  function init() {
    const elements = document.querySelectorAll(SELECTORS);
    if (!elements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('anim-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.07, rootMargin: '0px 0px -24px 0px' });

    // 같은 부모 안의 요소끼리 순서대로 딜레이 적용
    const groups = new Map();
    elements.forEach(el => {
      const key = el.parentElement;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(el);
    });

    groups.forEach(els => {
      els.forEach((el, i) => {
        el.classList.add('anim-init');
        el.style.transitionDelay = `${i * 70}ms`;
        observer.observe(el);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
