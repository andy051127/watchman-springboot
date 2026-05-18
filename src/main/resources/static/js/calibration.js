// calibration.js — 공부 환경 보정 페이지
// 3개 보정 카드(정면/태블릿/책)를 개별로 측정하고 sessionStorage에 저장합니다.

// ── 상수 ───────────────────────────────────────────────────

const MEDIAPIPE_VERSION = '0.10.3';
const MEDIAPIPE_CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}`;

const BASE_THRESHOLDS = { yawLeft: 35, yawRight: 35, pitchDown: 30, pitchUp: 20 };

const CALIB_DURATION_MS    = 3000; // 측정 시간 (ms)
const CALIB_BUFFER_DEG     = 5;    // 측정 범위에 더하는 여유각 (도)
const CALIB_MAX_OFFSET_DEG = 10;   // 기본값 대비 최대 완화 허용 범위 (도)

// ── 상태 변수 ──────────────────────────────────────────────

let faceLandmarker  = null;
let stream          = null;
let hudRafId        = null;
let activeCalibType = null; // 동시에 하나의 보정만 허용

// 각 유형별 측정 결과
const calibData = { screen: null, tablet: null, book: null };

// ── 초기화 ─────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initAll();
});

/**
 * 카메라를 열고, HUD 루프를 시작하고, MediaPipe 모델을 로드합니다.
 */
async function initAll() {
  showPanel('step-loading');

  const loadStatus     = document.getElementById('calib-load-status');
  const camOverlay     = document.getElementById('calib-cam-overlay');
  const camOverlayText = document.getElementById('calib-cam-overlay-text');

  // 1. 카메라 요청
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video = document.getElementById('calib-video');
    video.srcObject = stream;
    await video.play();

    camOverlay.style.display = 'none';
    loadStatus.textContent = '얼굴 감지 모델 로딩 중...';
  } catch (camErr) {
    console.error('[Watchman] 카메라 오류:', camErr);
    camOverlayText.textContent = '카메라 접근 불가 — 브라우저 권한을 확인해 주세요';
    loadStatus.textContent = '카메라를 열 수 없어요. 기본값으로 보정을 건너뛸 수 있어요.';
  }

  // 2. HUD 루프 시작 (카메라가 열려야 동작하지만, 루프 자체는 항상 돌립니다)
  startHudLoop();

  // 3. MediaPipe 모델 로드
  loadStatus.textContent = '얼굴 감지 모델 로딩 중...';
  try {
    await loadFaceLandmarker();
    document.getElementById('calib-angle-hud').style.display = 'flex';
    showPanel('step-main');
  } catch (modelErr) {
    console.error('[Watchman] MediaPipe 초기화 실패:', modelErr);
    loadStatus.textContent = '모델 로드에 실패했어요. 보정 버튼을 사용할 수 없어요.';
    // 패널을 열되 모든 보정 버튼을 비활성화합니다
    showPanel('step-main');
    ['screen', 'tablet', 'book'].forEach(type => {
      const btn = document.getElementById('btn-' + type);
      if (btn) { btn.disabled = true; btn.textContent = '사용 불가'; }
    });
  }
}

/**
 * step-loading / step-main 중 하나를 표시하고 나머지를 숨깁니다.
 * @param {string} id - 'step-loading' 또는 'step-main'
 */
function showPanel(id) {
  ['step-loading', 'step-main'].forEach(pid => {
    const el = document.getElementById(pid);
    if (el) el.style.display = (el.id === id) ? 'flex' : 'none';
  });
}

// ── MediaPipe 로드 ──────────────────────────────────────────

/**
 * MediaPipe FaceLandmarker를 CDN에서 로드합니다.
 * GPU delegate 실패 시 CPU로 자동 폴백합니다.
 */
async function loadFaceLandmarker() {
  const { FaceLandmarker, FilesetResolver } = await import(
    `${MEDIAPIPE_CDN}/vision_bundle.mjs`
  );

  const vision = await FilesetResolver.forVisionTasks(`${MEDIAPIPE_CDN}/wasm`);

  const modelAssetPath =
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

  const commonOpts = {
    runningMode: 'VIDEO',
    numFaces: 1,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  };

  try {
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath, delegate: 'GPU' },
      ...commonOpts,
    });
    console.log('[Watchman] FaceLandmarker 초기화 완료 (GPU)');
  } catch (gpuErr) {
    console.warn('[Watchman] GPU delegate 실패, CPU로 재시도:', gpuErr);
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath, delegate: 'CPU' },
      ...commonOpts,
    });
    console.log('[Watchman] FaceLandmarker 초기화 완료 (CPU)');
  }
}

// ── HUD 루프 ───────────────────────────────────────────────

/**
 * rAF 기반 HUD 루프.
 * faceLandmarker와 카메라가 준비된 경우에만 감지를 수행합니다.
 * 시각적 피드백 전용 — 샘플을 수집하지 않습니다.
 */
function startHudLoop() {
  const video = document.getElementById('calib-video');
  let lastVideoTime = -1;

  function hudFrame() {
    if (faceLandmarker &&
        video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA &&
        video.currentTime !== lastVideoTime) {

      lastVideoTime = video.currentTime;

      try {
        const results = faceLandmarker.detectForVideo(video, performance.now());
        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
          const { yaw, pitch } = computeHeadAngles(results.faceLandmarks[0]);
          updateHud(yaw, pitch);
        }
      } catch (_) { /* 무시 */ }
    }

    hudRafId = requestAnimationFrame(hudFrame);
  }

  hudRafId = requestAnimationFrame(hudFrame);
}

/**
 * HUD의 바와 수치 레이블을 주어진 각도로 업데이트합니다.
 * @param {number} yaw   - 좌우 각도 (도)
 * @param {number} pitch - 상하 각도 (도)
 */
function updateHud(yaw, pitch) {
  // Yaw 바
  const yawFill = document.getElementById('hud-yaw-fill');
  const yawPct  = Math.min(Math.abs(yaw) / 90 * 50, 50);
  if (yaw >= 0) {
    yawFill.style.left  = '50%';
    yawFill.style.width = yawPct + '%';
  } else {
    yawFill.style.left  = (50 - yawPct) + '%';
    yawFill.style.width = yawPct + '%';
  }
  document.getElementById('hud-yaw-val').textContent = yaw.toFixed(1) + '°';

  // Pitch 바
  const pitchFill = document.getElementById('hud-pitch-fill');
  const pitchPct  = Math.min(Math.abs(pitch) / 90 * 50, 50);
  if (pitch >= 0) {
    pitchFill.style.left  = '50%';
    pitchFill.style.width = pitchPct + '%';
  } else {
    pitchFill.style.left  = (50 - pitchPct) + '%';
    pitchFill.style.width = pitchPct + '%';
  }
  document.getElementById('hud-pitch-val').textContent = pitch.toFixed(1) + '°';
}

// ── 각도 계산 ──────────────────────────────────────────────

/**
 * FaceLandmarker 478개 랜드마크로 머리의 Yaw·Pitch 각도를 추정합니다.
 * study-session.js의 computeHeadAngles와 동일한 알고리즘입니다.
 *
 * Yaw  : 양(+) → 카메라 기준 우측 회전, 음(-) → 좌측 회전
 * Pitch: 양(+) → 고개 숙임, 음(-) → 고개 들기
 *
 * @param {Array} landmarks - faceLandmarks[0]
 * @returns {{ yaw: number, pitch: number }} 각도(degrees)
 */
function computeHeadAngles(landmarks) {
  const nose       = landmarks[4];   // 코끝
  const forehead   = landmarks[10];  // 이마 중앙
  const chin       = landmarks[152]; // 턱 끝
  const leftCheek  = landmarks[234]; // 왼쪽 볼 (카메라 기준)
  const rightCheek = landmarks[454]; // 오른쪽 볼

  // Yaw: 좌우 볼 중점 대비 코끝의 수평 편차
  const faceCenterX = (leftCheek.x + rightCheek.x) / 2;
  const faceHalfW   = Math.abs(rightCheek.x - leftCheek.x) / 2;
  const yawRatio    = faceHalfW > 0 ? (nose.x - faceCenterX) / faceHalfW : 0;
  const yaw         = Math.asin(Math.max(-1, Math.min(1, yawRatio))) * (180 / Math.PI);

  // Pitch: 이마-턱 중점 대비 코끝의 수직 편차
  const faceCenterY = (forehead.y + chin.y) / 2;
  const faceHalfH   = Math.abs(chin.y - forehead.y) / 2;
  const pitchRatio  = faceHalfH > 0 ? (nose.y - faceCenterY) / faceHalfH : 0;
  const pitch       = Math.asin(Math.max(-1, Math.min(1, pitchRatio))) * (180 / Math.PI);

  return { yaw, pitch };
}

// ── 보정 측정 ──────────────────────────────────────────────

/**
 * 지정된 유형의 보정을 시작합니다.
 * 동시에 하나의 보정만 허용하며, 모델이 준비된 경우에만 실행합니다.
 *
 * @param {'screen'|'tablet'|'book'} type - 보정 유형
 */
function startCalib(type) {
  if (activeCalibType) return; // 다른 보정이 진행 중
  if (!faceLandmarker) {
    alert('얼굴 감지 모델이 아직 로딩 중이에요. 잠시 기다려 주세요.');
    return;
  }

  activeCalibType = type;

  // 버튼 비활성화 및 텍스트 변경
  const btn = document.getElementById('btn-' + type);
  btn.disabled = true;
  btn.textContent = '측정 중...';

  // 진행 바 초기화 및 표시
  const progressWrap = document.getElementById('progress-' + type);
  const progressBar  = document.getElementById('progress-bar-' + type);
  progressBar.style.width = '0%';
  progressWrap.style.display = 'block';

  setStatus(type, 'measuring', '측정 중');

  const samples = [];
  const video   = document.getElementById('calib-video');
  const startTs = performance.now();

  function collectFrame(ts) {
    const pct = Math.min((ts - startTs) / CALIB_DURATION_MS, 1);

    // 진행 바 업데이트
    progressBar.style.width = (pct * 100).toFixed(1) + '%';

    // 샘플 수집 (모델과 비디오가 준비된 경우에만)
    if (faceLandmarker && video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      try {
        const results = faceLandmarker.detectForVideo(video, performance.now());
        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
          const { yaw, pitch } = computeHeadAngles(results.faceLandmarks[0]);
          samples.push({ yaw, pitch });
        }
      } catch (_) { /* 무시 */ }
    }

    if (pct < 1) {
      requestAnimationFrame(collectFrame);
    } else {
      finishCalib(type, samples);
    }
  }

  requestAnimationFrame(collectFrame);
}

/**
 * 측정 완료 후 결과를 처리합니다.
 * 샘플이 충분하면 평균값을 저장하고 UI를 갱신합니다.
 *
 * @param {'screen'|'tablet'|'book'} type    - 보정 유형
 * @param {{ yaw: number, pitch: number }[]} samples - 수집된 샘플
 */
function finishCalib(type, samples) {
  activeCalibType = null;

  // 진행 바 숨기기
  document.getElementById('progress-' + type).style.display = 'none';

  const btn = document.getElementById('btn-' + type);
  btn.disabled = false;
  btn.textContent = '다시 보정';

  if (samples.length >= 10) {
    // 수집된 샘플의 평균 yaw/pitch 계산
    const avgYaw   = samples.reduce((s, v) => s + v.yaw,   0) / samples.length;
    const avgPitch = samples.reduce((s, v) => s + v.pitch, 0) / samples.length;

    calibData[type] = { yaw: avgYaw, pitch: avgPitch };
    setStatus(type, 'done', '완료');

    // 정면 보정이 완료되면 스터디 시작 버튼 활성화
    if (type === 'screen') {
      document.getElementById('btn-start').disabled = false;
    }
  } else {
    setStatus(type, 'failed', '실패');
  }

  // 새 측정 결과로 임계값 재계산 및 저장
  saveCalibResults();
}

/**
 * 상태 배지의 텍스트와 클래스를 업데이트합니다.
 *
 * @param {'screen'|'tablet'|'book'} type  - 보정 유형
 * @param {'measuring'|'done'|'failed'} state - 상태
 * @param {string} text                    - 배지에 표시할 텍스트
 */
function setStatus(type, state, text) {
  const badge = document.getElementById('status-' + type);
  if (!badge) return;
  badge.textContent  = text;
  badge.className    = 'calib-status-badge status-' + state;
}

// ── 임계값 계산 및 저장 ────────────────────────────────────

/**
 * 현재 calibData를 바탕으로 개인화 임계값을 계산하고 sessionStorage에 저장합니다.
 * 정면 보정이 완료된 경우에만 실행됩니다.
 */
function saveCalibResults() {
  if (!calibData.screen) return;

  const clamp = (val, base) =>
    Math.min(base + CALIB_MAX_OFFSET_DEG, Math.max(base, val));

  const center = calibData.screen;

  // Yaw: 태블릿 보정이 있으면 중심과의 거리 사용, 없으면 BASE
  let yawThresh = BASE_THRESHOLDS.yawLeft;
  if (calibData.tablet) {
    const tabletYaw = Math.abs(calibData.tablet.yaw - center.yaw);
    yawThresh = clamp(tabletYaw + CALIB_BUFFER_DEG, BASE_THRESHOLDS.yawLeft);
  }

  // PitchDown: 책 보정이 있으면 중심과의 거리 사용, 없으면 BASE
  let pitchDownThresh = BASE_THRESHOLDS.pitchDown;
  if (calibData.book) {
    const bookPitch = calibData.book.pitch - center.pitch; // 양수 = 고개 숙임
    pitchDownThresh = clamp(bookPitch + CALIB_BUFFER_DEG, BASE_THRESHOLDS.pitchDown);
  }

  // PitchUp은 항상 BASE 값 사용
  const pitchUpThresh = BASE_THRESHOLDS.pitchUp;

  console.log(
    `[Watchman] 보정 결과 — ` +
    `좌우 ${yawThresh.toFixed(1)}° / 하 ${pitchDownThresh.toFixed(1)}° / 상 ${pitchUpThresh.toFixed(1)}°`
  );

  sessionStorage.setItem('watchman_calib_done',       '1');
  sessionStorage.setItem('watchman_calib_yaw_left',   yawThresh.toFixed(1));
  sessionStorage.setItem('watchman_calib_yaw_right',  yawThresh.toFixed(1));
  sessionStorage.setItem('watchman_calib_pitch_down', pitchDownThresh.toFixed(1));
  sessionStorage.setItem('watchman_calib_pitch_up',   pitchUpThresh.toFixed(1));
}

// ── 건너뛰기 / 이동 ────────────────────────────────────────

/**
 * 보정을 건너뛰고 기본값으로 세션을 시작합니다.
 */
function skipAndStart() {
  // HUD 루프 중단
  if (hudRafId !== null) {
    cancelAnimationFrame(hudRafId);
    hudRafId = null;
  }

  // 기본값 저장 (calib_done = '0' 으로 건너뛰기 표시)
  sessionStorage.setItem('watchman_calib_done',       '0');
  sessionStorage.setItem('watchman_calib_yaw_left',   String(BASE_THRESHOLDS.yawLeft));
  sessionStorage.setItem('watchman_calib_yaw_right',  String(BASE_THRESHOLDS.yawRight));
  sessionStorage.setItem('watchman_calib_pitch_down', String(BASE_THRESHOLDS.pitchDown));
  sessionStorage.setItem('watchman_calib_pitch_up',   String(BASE_THRESHOLDS.pitchUp));

  stopStream();
  window.location.href = 'study-session.html';
}

/**
 * 보정 후 스터디 세션으로 이동합니다.
 * 카메라 스트림을 먼저 닫아 study-session.js가 다시 열 수 있도록 합니다.
 */
function goToStudy() {
  stopStream();
  window.location.href = 'study-session.html';
}

/**
 * 카메라 스트림의 모든 트랙을 중지합니다.
 */
function stopStream() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
    const video = document.getElementById('calib-video');
    if (video) video.srcObject = null;
  }
}
