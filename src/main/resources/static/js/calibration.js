// calibration.js — 공부 환경 보정 페이지
// State machine: loading → ready → measuring → done
// 결과는 sessionStorage에 저장하여 study-session.js가 읽습니다.

// ── 상수 ───────────────────────────────────────────────────

const MEDIAPIPE_VERSION = '0.10.3';
const MEDIAPIPE_CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}`;

const BASE_THRESHOLDS = { yawLeft: 55, yawRight: 55, pitchDown: 40, pitchUp: 25 };

const CALIB_DURATION_MS  = 10000; // 측정 시간 (ms)
const CALIB_BUFFER_DEG   = 15;    // 측정 범위에 더하는 여유각 (도)
const RING_CIRCUMFERENCE = 314;   // 2π × r(50) ≈ 314

// 각 구간마다 안내 문구를 변경합니다 (from: 경과 ms 기준)
const INSTRUCTIONS = [
  { from: 0,    text: '정면 화면을 바라봐 주세요' },
  { from: 3500, text: '옆에 태블릿·책이 있으면 봐 주세요' },
  { from: 7000, text: '아래 노트나 책을 내려봐 주세요' },
];

// ── 상태 변수 ──────────────────────────────────────────────

let faceLandmarker = null;
let stream         = null;
let calibRafId     = null;
let calibStartTime = null;
let hudRafId       = null; // HUD 루프 핸들

let yawSamples   = [];
let pitchSamples = [];

// 보정 결과 (기본값으로 초기화)
let calibYawLeft   = BASE_THRESHOLDS.yawLeft;
let calibYawRight  = BASE_THRESHOLDS.yawRight;
let calibPitchDown = BASE_THRESHOLDS.pitchDown;
let calibPitchUp   = BASE_THRESHOLDS.pitchUp;

// ── 유틸리티 ───────────────────────────────────────────────

/**
 * 지정된 id의 .calib-step만 표시하고 나머지는 숨깁니다.
 * @param {string} id - 표시할 step 요소의 id
 */
function showStep(id) {
  document.querySelectorAll('.calib-step').forEach(el => {
    el.style.display = el.id === id ? 'flex' : 'none';
  });
}

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

// ── 초기화 ─────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initAll();
});

/**
 * 카메라를 열고, HUD 루프를 시작하고, MediaPipe 모델을 로드합니다.
 * 에러 발생 시에도 step-ready를 보여줘 사용자가 기본값으로 시작할 수 있게 합니다.
 */
async function initAll() {
  showStep('step-loading');

  const loadStatus = document.getElementById('calib-load-status');
  const camOverlay = document.getElementById('calib-cam-overlay');
  const camOverlayText = document.getElementById('calib-cam-overlay-text');

  // 1. 카메라 요청
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video = document.getElementById('calib-video');
    video.srcObject = stream;
    await video.play();

    // 카메라 준비 완료 → 오버레이 숨기기
    camOverlay.style.display = 'none';
    loadStatus.textContent = '얼굴 감지 모델 로딩 중...';
  } catch (camErr) {
    console.error('[Watchman] 카메라 오류:', camErr);
    camOverlayText.textContent = '카메라 접근 불가 — 브라우저 권한을 확인해 주세요';
    loadStatus.textContent = '카메라를 열 수 없어요. 기본값으로 보정을 건너뛸 수 있어요.';
  }

  // 2. HUD 루프를 항상 시작 (카메라가 열려야 동작하지만, 루프 자체는 항상 돌립니다)
  startHudLoop();

  // 3. MediaPipe 모델 로드
  loadStatus.textContent = '얼굴 감지 모델 로딩 중...';
  try {
    await loadFaceLandmarker();
    // 모델 준비 완료 → HUD 표시 & step-ready
    document.getElementById('calib-angle-hud').style.display = 'flex';
    showStep('step-ready');
  } catch (modelErr) {
    console.error('[Watchman] MediaPipe 초기화 실패:', modelErr);
    loadStatus.textContent = '모델 로드에 실패했어요. 기본값으로 진행합니다.';
    // 모델 없이도 사용자가 건너뛸 수 있도록 step-ready 표시
    showStep('step-ready');
  }
}

/**
 * MediaPipe FaceLandmarker를 CDN에서 로드합니다.
 * GPU delegate 실패 시 CPU로 자동 폴백합니다.
 * (study-session.js의 initFaceLandmarker와 동일 로직)
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

// ── HUD 루프 (항상 실행, 측정 중이 아닐 때도 실시간 각도 표시) ──

/**
 * rAF 기반 HUD 루프.
 * faceLandmarker와 카메라가 준비된 경우에만 감지를 수행합니다.
 * 이 루프는 샘플을 수집하지 않습니다 — 시각적 피드백 전용입니다.
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
 *
 * 바 시각화 규칙:
 *   - yaw = 0  → fill 없음 (center에 집중)
 *   - yaw > 0  → 중앙(50%) 기준 오른쪽으로 확장
 *   - yaw < 0  → 중앙(50%) 기준 왼쪽으로 확장 (left가 center보다 작아짐)
 *
 * @param {number} yaw   - 좌우 각도 (도)
 * @param {number} pitch - 상하 각도 (도)
 */
function updateHud(yaw, pitch) {
  // Yaw 바
  const yawFill  = document.getElementById('hud-yaw-fill');
  const yawPct   = Math.min(Math.abs(yaw) / 90 * 50, 50); // 최대 50%
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

// ── 보정 시작 ──────────────────────────────────────────────

/**
 * "보정 시작하기" 버튼 핸들러.
 * 샘플 배열을 초기화하고 측정 루프를 시작합니다.
 */
function beginCalibration() {
  yawSamples     = [];
  pitchSamples   = [];
  calibStartTime = null;

  showStep('step-measuring');

  // 링과 카운트다운 초기화
  document.getElementById('calib-ring-fill').style.strokeDashoffset = RING_CIRCUMFERENCE;
  document.getElementById('calib-sec').textContent = '10';
  document.getElementById('calib-inst').textContent = INSTRUCTIONS[0].text;
  document.getElementById('calib-sample-count').textContent = '샘플 수집 중...';

  // 측정 루프 시작
  calibRafId = requestAnimationFrame(runMeasuringLoop);
}

/**
 * rAF 기반 측정 루프.
 * 경과 시간을 추적하며 링·카운트다운·안내 문구·샘플을 업데이트합니다.
 *
 * @param {DOMHighResTimeStamp} ts - requestAnimationFrame 타임스탬프
 */
function runMeasuringLoop(ts) {
  if (!calibStartTime) calibStartTime = ts;

  const elapsed  = ts - calibStartTime;
  const progress = Math.min(elapsed / CALIB_DURATION_MS, 1);
  const secLeft  = Math.ceil((CALIB_DURATION_MS - elapsed) / 1000);

  // 링 애니메이션 업데이트
  document.getElementById('calib-ring-fill').style.strokeDashoffset =
    RING_CIRCUMFERENCE * (1 - progress);
  document.getElementById('calib-sec').textContent = secLeft > 0 ? String(secLeft) : '0';

  // 안내 문구: 현재 경과 시간에 맞는 마지막 instruction 선택
  let currentInst = INSTRUCTIONS[0].text;
  for (const inst of INSTRUCTIONS) {
    if (elapsed >= inst.from) currentInst = inst.text;
  }
  document.getElementById('calib-inst').textContent = currentInst;

  // 샘플 수집 (모델과 비디오가 준비된 경우에만)
  const video = document.getElementById('calib-video');
  if (faceLandmarker &&
      video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
    try {
      const results = faceLandmarker.detectForVideo(video, performance.now());
      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const { yaw, pitch } = computeHeadAngles(results.faceLandmarks[0]);
        yawSamples.push(yaw);
        pitchSamples.push(pitch);
      }
    } catch (_) { /* 무시 */ }
  }

  document.getElementById('calib-sample-count').textContent =
    `샘플 ${yawSamples.length}개 수집됨`;

  if (progress < 1) {
    calibRafId = requestAnimationFrame(runMeasuringLoop);
  } else {
    finishCalibration();
  }
}

// ── 보정 완료 ──────────────────────────────────────────────

/**
 * 수집된 샘플로 개인화 임계값을 계산하고 sessionStorage에 저장합니다.
 * 샘플이 부족하면 기본값을 사용합니다.
 */
function finishCalibration() {
  calibRafId = null;

  if (yawSamples.length >= 20) {
    const yawRange   = computePercentileRange(yawSamples);
    const pitchRange = computePercentileRange(pitchSamples);

    // 관측 범위 + 여유각, 기본값보다 작아지지 않도록 하한 유지
    calibYawLeft   = Math.max(BASE_THRESHOLDS.yawLeft,   yawRange.p95   + CALIB_BUFFER_DEG);
    calibYawRight  = Math.max(BASE_THRESHOLDS.yawRight,  -yawRange.p5   + CALIB_BUFFER_DEG);
    calibPitchDown = Math.max(BASE_THRESHOLDS.pitchDown, pitchRange.p95 + CALIB_BUFFER_DEG);
    calibPitchUp   = Math.max(BASE_THRESHOLDS.pitchUp,   -pitchRange.p5 + CALIB_BUFFER_DEG);

    console.log(
      `[Watchman] 보정 완료 — ` +
      `좌 ${calibYawLeft.toFixed(1)}° / 우 ${calibYawRight.toFixed(1)}° / ` +
      `상 ${calibPitchUp.toFixed(1)}° / 하 ${calibPitchDown.toFixed(1)}°`
    );
  } else {
    // 샘플 부족 → 기본값 유지
    calibYawLeft   = BASE_THRESHOLDS.yawLeft;
    calibYawRight  = BASE_THRESHOLDS.yawRight;
    calibPitchDown = BASE_THRESHOLDS.pitchDown;
    calibPitchUp   = BASE_THRESHOLDS.pitchUp;
    console.warn('[Watchman] 샘플 부족 — 기본값 사용');
  }

  // sessionStorage에 저장 (study-session.js가 읽음)
  sessionStorage.setItem('watchman_calib_done',        '1');
  sessionStorage.setItem('watchman_calib_yaw_left',    calibYawLeft.toFixed(1));
  sessionStorage.setItem('watchman_calib_yaw_right',   calibYawRight.toFixed(1));
  sessionStorage.setItem('watchman_calib_pitch_down',  calibPitchDown.toFixed(1));
  sessionStorage.setItem('watchman_calib_pitch_up',    calibPitchUp.toFixed(1));

  // 결과 카드 업데이트
  document.getElementById('result-yaw-left').textContent   = calibYawLeft.toFixed(0) + '°';
  document.getElementById('result-yaw-right').textContent  = calibYawRight.toFixed(0) + '°';
  document.getElementById('result-pitch-up').textContent   = calibPitchUp.toFixed(0) + '°';
  document.getElementById('result-pitch-down').textContent = calibPitchDown.toFixed(0) + '°';

  // 카메라 스트림 중지 — 스터디 세션이 다시 열 예정
  stopStream();

  showStep('step-done');
}

/**
 * 샘플 배열의 5·95 백분위수를 반환합니다.
 * 일시적 이상치(눈 깜박임 등)를 제거하기 위해 사용합니다.
 *
 * @param {number[]} samples
 * @returns {{ p5: number, p95: number }}
 */
function computePercentileRange(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const p5  = sorted[Math.max(0, Math.floor(sorted.length * 0.05))];
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  return { p5, p95 };
}

// ── 건너뛰기 / 이동 ────────────────────────────────────────

/**
 * 보정을 건너뛰고 기본값으로 세션을 시작합니다.
 * sessionStorage에 기본값을 기록하고 study-session.html로 이동합니다.
 */
function skipAndStart() {
  // 실행 중인 측정 루프 중단
  if (calibRafId !== null) {
    cancelAnimationFrame(calibRafId);
    calibRafId = null;
  }
  // HUD 루프 중단
  if (hudRafId !== null) {
    cancelAnimationFrame(hudRafId);
    hudRafId = null;
  }

  // 기본값 저장 (calib_done = '0' 으로 건너뛰기 표시)
  sessionStorage.setItem('watchman_calib_done',        '0');
  sessionStorage.setItem('watchman_calib_yaw_left',    String(BASE_THRESHOLDS.yawLeft));
  sessionStorage.setItem('watchman_calib_yaw_right',   String(BASE_THRESHOLDS.yawRight));
  sessionStorage.setItem('watchman_calib_pitch_down',  String(BASE_THRESHOLDS.pitchDown));
  sessionStorage.setItem('watchman_calib_pitch_up',    String(BASE_THRESHOLDS.pitchUp));

  stopStream();
  window.location.href = 'study-session.html';
}

/**
 * 보정 완료 후 스터디 세션으로 이동합니다.
 */
function goToStudy() {
  window.location.href = 'study-session.html';
}

// ── 내부 헬퍼 ──────────────────────────────────────────────

/**
 * 카메라 스트림의 모든 트랙을 중지합니다.
 * study-session.js가 카메라를 다시 열 예정이므로 여기서 닫습니다.
 */
function stopStream() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
    const video = document.getElementById('calib-video');
    if (video) video.srcObject = null;
  }
}
