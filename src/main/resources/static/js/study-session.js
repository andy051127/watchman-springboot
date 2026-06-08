// study-session.js — 스터디 세션 UI (카메라 + MediaPipe FaceLandmarker)

// ── 음악 플레이어 ──────────────────────────────────────────
// MP3 파일은 assets/music/ 폴더에 넣으세요.
// 트랙을 추가하려면 MUSIC_TRACKS 배열에 항목을 추가하면 됩니다.

const MUSIC_TRACKS = [
  // { name: '트랙 이름', artist: '아티스트', file: 'track1.mp3' },
];

const musicAudio = new Audio();
musicAudio.volume = 0.6;
musicAudio.addEventListener('ended', () => musicNext());

let currentTrackIdx = 0;
let isMusicPlaying = false;
let isShuffle = false;

function toggleMusic() {
  if (MUSIC_TRACKS.length === 0) return;
  if (isMusicPlaying) {
    musicAudio.pause();
    isMusicPlaying = false;
  } else {
    if (!musicAudio.src || musicAudio.src === window.location.href) loadTrack(currentTrackIdx, false);
    musicAudio.play();
    isMusicPlaying = true;
  }
  updateMusicUI();
}

function musicPrev() {
  if (MUSIC_TRACKS.length === 0) return;
  currentTrackIdx = (currentTrackIdx - 1 + MUSIC_TRACKS.length) % MUSIC_TRACKS.length;
  loadTrack(currentTrackIdx, true);
}

function musicNext() {
  if (MUSIC_TRACKS.length === 0) return;
  if (isShuffle) {
    let next;
    do { next = Math.floor(Math.random() * MUSIC_TRACKS.length); } while (next === currentTrackIdx && MUSIC_TRACKS.length > 1);
    currentTrackIdx = next;
  } else {
    currentTrackIdx = (currentTrackIdx + 1) % MUSIC_TRACKS.length;
  }
  loadTrack(currentTrackIdx, true);
}

function loadTrack(idx, andPlay = false) {
  const t = MUSIC_TRACKS[idx];
  document.getElementById('music-track-name').textContent = t.name;
  document.getElementById('music-track-artist').textContent = t.artist;
  musicAudio.src = `assets/music/${t.file}`;
  if (andPlay) { musicAudio.play(); isMusicPlaying = true; }
  updateMusicUI();
}

function setMusicVolume(val) {
  document.getElementById('music-vol-pct').textContent = `${val}%`;
  musicAudio.volume = parseInt(val) / 100;
}

function toggleShuffle() {
  isShuffle = !isShuffle;
  document.getElementById('btn-shuffle').classList.toggle('active', isShuffle);
}

function updateMusicUI() {
  const btn = document.getElementById('btn-music-play');
  const hasTrack = MUSIC_TRACKS.length > 0;
  btn.textContent = isMusicPlaying ? '⏸ 일시정지' : '▶ 재생';
  btn.classList.toggle('active', isMusicPlaying);
  btn.disabled = !hasTrack;
}

document.addEventListener('DOMContentLoaded', () => {
  if (MUSIC_TRACKS.length > 0) {
    document.getElementById('music-track-name').textContent = MUSIC_TRACKS[0].name;
    document.getElementById('music-track-artist').textContent = MUSIC_TRACKS[0].artist;
  } else {
    document.getElementById('music-track-name').textContent = '트랙 없음';
    document.getElementById('music-track-artist').textContent = 'assets/music/ 에 MP3를 추가하세요';
  }
  updateMusicUI();
});

// ── 앰비언스 믹서 (Web Audio API) ─────────────────────────

let audioCtx = null;
const ambientNodes = {};

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function makeNoise(ctx, type) {
  const len = ctx.sampleRate * 3;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  if (type === 'white') {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  } else if (type === 'brown') {
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      d[i] = (last + 0.02 * w) / 1.02;
      last = d[i]; d[i] *= 3.5;
    }
  } else if (type === 'pink') {
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759;
      b2 = 0.96900*b2 + w*0.1538520; b3 = 0.86650*b3 + w*0.3104856;
      b4 = 0.55000*b4 + w*0.5329522; b5 = -0.7616*b5 - w*0.0168980;
      d[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11; b6 = w*0.115926;
    }
  }
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  return src;
}

function createAmbientChain(type) {
  const ctx = getAudioCtx();
  const gain = ctx.createGain(); gain.gain.value = 0;
  let src, f1, f2;
  if (type === 'rain') {
    src = makeNoise(ctx, 'white');
    f1 = ctx.createBiquadFilter(); f1.type = 'lowpass';  f1.frequency.value = 800;
    f2 = ctx.createBiquadFilter(); f2.type = 'highpass'; f2.frequency.value = 100;
    src.connect(f1); f1.connect(f2); f2.connect(gain);
  } else if (type === 'cafe') {
    src = makeNoise(ctx, 'pink');
    f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 1000; f1.Q.value = 0.5;
    src.connect(f1); f1.connect(gain);
  } else if (type === 'nature') {
    src = makeNoise(ctx, 'pink');
    f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 400; f1.Q.value = 0.3;
    src.connect(f1); f1.connect(gain);
  } else if (type === 'fire') {
    src = makeNoise(ctx, 'brown');
    f1 = ctx.createBiquadFilter(); f1.type = 'lowpass'; f1.frequency.value = 400;
    src.connect(f1); f1.connect(gain);
  }
  gain.connect(ctx.destination);
  src.start();
  return { src, gain };
}

function setAmbient(type, val) {
  document.getElementById(`pct-${type}`).textContent = `${val}%`;
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
  if (!ambientNodes[type]) ambientNodes[type] = createAmbientChain(type);
  ambientNodes[type].gain.gain.setTargetAtTime(parseInt(val) / 100 * 0.4, ctx.currentTime, 0.1);
}

// ── MediaPipe FaceLandmarker ───────────────────────────────

let faceLandmarker = null;
let detectionRafId = null;
let distractionSince = null; // 이탈 시작 시각 (유예 판정용)

const DISTRACTION_DELAY_MS = 3000; // 딴짓 판정 유예 시간 — 자세 변경·순간 이동 무시

// ── 캘리브레이션 임계값 ────────────────────────────────────
// 캘리브레이션 전까지는 기본값을 사용하고,
// 캘리브레이션 완료 후 사용자 환경에 맞게 덮어씁니다.
const BASE_THRESHOLDS = { yawLeft: 35, yawRight: 35, pitchDown: 30, pitchUp: 20 };

// calib_done === '1' (명시적 보정 완료)인 경우에만 저장된 값을 사용합니다.
// 이렇게 해야 과거 구버전이 sessionStorage에 남긴 오래된 값(예: 55°)이
// 현재 BASE_THRESHOLDS(25°)를 덮어쓰는 문제를 방지합니다.
function loadCalibValue(key, base) {
  if (sessionStorage.getItem('watchman_calib_done') !== '1') return base;
  const v = parseFloat(sessionStorage.getItem(key));
  // 음수·NaN·과도하게 큰 값(base + 20° 초과)은 구버전 데이터로 간주하고 거부합니다.
  if (isNaN(v) || v <= 0 || v > base + 20) return base;
  return v;
}
let calibYawLeft   = loadCalibValue('watchman_calib_yaw_left',   BASE_THRESHOLDS.yawLeft);
let calibYawRight  = loadCalibValue('watchman_calib_yaw_right',  BASE_THRESHOLDS.yawRight);
let calibPitchDown = loadCalibValue('watchman_calib_pitch_down', BASE_THRESHOLDS.pitchDown);
let calibPitchUp   = loadCalibValue('watchman_calib_pitch_up',   BASE_THRESHOLDS.pitchUp);

// ── 캘리브레이션 상태 ──────────────────────────────────────
const CALIB_DURATION_MS = 10000; // 측정 시간(ms)
const CALIB_BUFFER_DEG  = 8;     // 측정 범위에 더하는 여유각(도)
const CALIB_MAX_OFFSET_DEG = 10; // 기본값 대비 최대 완화 허용 범위(도)
const RING_CIRCUMFERENCE = 314;  // 2π × r(50) ≈ 314

let calibRafId        = null;
let calibStartTime    = null;
let calibYawSamples   = [];
let calibPitchSamples = [];

// import URL과 WASM 경로를 동일 버전으로 고정해 불일치를 방지합니다.
const MEDIAPIPE_VERSION = '0.10.3';
const MEDIAPIPE_CDN     = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}`;

/**
 * @mediapipe/tasks-vision 라이브러리를 CDN에서 동적으로 로드하고
 * FaceLandmarker 인스턴스를 초기화합니다.
 * GPU delegate가 지원되지 않는 환경을 위해 CPU로 자동 폴백합니다.
 */
async function initFaceLandmarker() {
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

  // GPU delegate 실패 시(많은 브라우저/환경에서 발생) CPU로 재시도합니다.
  try {
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath, delegate: 'GPU' },
      ...commonOpts,
    });
    console.log('[Watchman] FaceLandmarker 초기화 완료 (GPU)');
  } catch (gpuErr) {
    console.warn('[Watchman] GPU delegate 실패, CPU로 재시도합니다:', gpuErr);
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath, delegate: 'CPU' },
      ...commonOpts,
    });
    console.log('[Watchman] FaceLandmarker 초기화 완료 (CPU)');
  }
}

/**
 * FaceLandmarker의 478개 랜드마크로 머리의 Yaw(좌우)·Pitch(상하) 각도를 추정합니다.
 * 좌표는 정규화된 [0, 1] 값입니다.
 *
 * Yaw  : 양(+) → 카메라 기준 우측으로 회전, 음(-) → 좌측으로 회전
 * Pitch: 양(+) → 고개 숙임, 음(-) → 고개 들기
 *
 * @param {Array} landmarks - FaceLandmarker 결과의 faceLandmarks[0]
 * @returns {{ yaw: number, pitch: number }} 각도(degrees)
 */
function computeHeadAngles(landmarks) {
  const nose       = landmarks[4];   // 코끝
  const forehead   = landmarks[10];  // 이마 중앙
  const chin       = landmarks[152]; // 턱 끝
  const leftCheek  = landmarks[234]; // 왼쪽 볼 (카메라 기준)
  const rightCheek = landmarks[454]; // 오른쪽 볼 (카메라 기준)

  // Yaw: 좌우 볼 중점 대비 코끝의 수평 편차로 회전량을 추정
  const faceCenterX = (leftCheek.x + rightCheek.x) / 2;
  const faceHalfW   = Math.abs(rightCheek.x - leftCheek.x) / 2;
  const yawRatio    = faceHalfW > 0 ? (nose.x - faceCenterX) / faceHalfW : 0;
  const yaw         = Math.asin(Math.max(-1, Math.min(1, yawRatio))) * (180 / Math.PI);

  // Pitch: 이마-턱 중점 대비 코끝의 수직 편차로 회전량을 추정
  const faceCenterY = (forehead.y + chin.y) / 2;
  const faceHalfH   = Math.abs(chin.y - forehead.y) / 2;
  const pitchRatio  = faceHalfH > 0 ? (nose.y - faceCenterY) / faceHalfH : 0;
  const pitch       = Math.asin(Math.max(-1, Math.min(1, pitchRatio))) * (180 / Math.PI);

  return { yaw, pitch };
}

/**
 * requestAnimationFrame 기반 감지 루프.
 * 메인 스레드 블로킹 없이 매 프레임 FaceLandmarker를 실행합니다.
 */
function startDetectionLoop() {
  const video = document.getElementById('webcam-video');
  let lastVideoTime = -1;

  function detect() {
    if (sessionState !== 'studying') return;

    // faceLandmarker가 아직 백그라운드 로딩 중이면 다음 프레임에 재시도합니다.
    if (!faceLandmarker) {
      detectionRafId = requestAnimationFrame(detect);
      return;
    }

    if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA &&
        video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;

      let results;
      try {
        results = faceLandmarker.detectForVideo(video, performance.now());
      } catch (e) {
        console.error('[Watchman] FaceLandmarker 감지 오류:', e);
        detectionRafId = requestAnimationFrame(detect);
        return;
      }

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const { yaw, pitch } = computeHeadAngles(results.faceLandmarks[0]);

        // 캘리브레이션이 끝난 뒤에는 개인화된 임계값을 사용합니다.
        const rawDistracted =
          yaw   >  calibYawLeft   ||
          yaw   < -calibYawRight  ||
          pitch >  calibPitchDown ||
          pitch < -calibPitchUp;

        if (rawDistracted) {
          if (distractionSince === null) {
            distractionSince = performance.now(); // 이탈 시작 기록
          } else if (performance.now() - distractionSince >= DISTRACTION_DELAY_MS) {
            // 유예 시간 초과 시에만 딴짓으로 판정
            console.log(`[Watchman] 딴짓 판정 — Yaw: ${yaw.toFixed(1)}°, Pitch: ${pitch.toFixed(1)}°`);
            applyFocusState(false);
          }
        } else {
          distractionSince = null; // 시선 복귀 시 유예 타이머 리셋
          applyFocusState(true);
        }

        updateDebugPanel(yaw, pitch, rawDistracted);
      } else {
        // 얼굴 미감지(자리 비움) → 즉시 이탈로 처리
        distractionSince = null;
        applyFocusState(false);
        updateDebugPanel(null, null, false);
      }
    }

    detectionRafId = requestAnimationFrame(detect);
  }

  detectionRafId = requestAnimationFrame(detect);
}

function stopDetectionLoop() {
  if (detectionRafId !== null) {
    cancelAnimationFrame(detectionRafId);
    detectionRafId = null;
  }
  distractionSince = null;
}

// 상태가 바뀔 때만 UI를 업데이트해 불필요한 DOM 조작을 억제합니다.
let lastFocusedState = null;
function applyFocusState(focused) {
  if (focused === lastFocusedState) return;
  lastFocusedState = focused;
  updateFocusUI(focused);
}

// ── 세션 상태 ──────────────────────────────────────────────

let sessionState = 'idle'; // 'idle' | 'camera_on' | 'studying'
let stream = null;
let timerInterval = null;
let totalSec = 0;
let focusedSec = 0;
let distractedSec = 0;
let isFocused = true;
const isGuest = new URLSearchParams(window.location.search).get('guest') === '1';

// 이어하기 세션 ID — URL ?sessionId=123 이면 이어하기, 없으면 새 세션
const _urlSessionId = new URLSearchParams(window.location.search).get('sessionId');
let currentSessionId = _urlSessionId ? Number(_urlSessionId) : null;

// 이어하기인 경우 서버에서 기존 누적 시간을 로드해 초기값으로 세팅
async function loadInitialSessionData() {
  if (!currentSessionId) return;
  try {
    const res = await fetch(`/watchman/api/sessions/${currentSessionId}`);
    if (!res.ok) { currentSessionId = null; return; }
    const s = await res.json();
    focusedSec    = s.focusedTime    || 0;
    distractedSec = s.distractedTime || 0;
    totalSec      = focusedSec + distractedSec;
    updateTimerDisplay();
  } catch {
    currentSessionId = null;
  }
}

// ── 카메라 버튼 ────────────────────────────────────────────

async function handleCamBtn() {
  if (sessionState === 'idle') {
    await startCamera();
  } else {
    if (sessionState === 'studying') pauseSession();
    stopCamera();
    setState('idle');
  }
}

async function startCamera() {
  const btn = document.getElementById('btn-cam');
  btn.disabled = true;
  btn.textContent = '연결 중...';
  document.getElementById('cam-off-msg').style.display = 'none';
  document.getElementById('cam-loading').style.display = 'flex';

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video = document.getElementById('webcam-video');
    video.srcObject = stream;
    video.play();
    document.getElementById('cam-loading').style.display = 'none';
    document.getElementById('cam-off-msg').style.display = 'none';

    setState('camera_on');
    btn.disabled = false;
    btn.textContent = '카메라 끄기';

    const badge = document.getElementById('focus-badge');
    badge.className = 'session-badge standby';
    badge.textContent = '카메라 켜짐';
    badge.style.display = 'inline';

    // MediaPipe FaceLandmarker를 백그라운드에서 로드합니다.
    // 모델 파일이 크기 때문에 await하지 않아 카메라 버튼을 즉시 활성화합니다.
    // 로드 완료 전에 스터디를 시작해도 감지 루프가 준비될 때까지 대기합니다.
    badge.className   = 'session-badge standby';
    badge.textContent = '모델 로딩 중...';

    initFaceLandmarker()
      .then(() => {
        // 카메라가 여전히 켜져 있을 때만 badge를 갱신합니다.
        if (sessionState !== 'idle') {
          badge.textContent = sessionState === 'studying' ? badge.textContent : '감지 준비 완료';
        }
      })
      .catch(err => {
        console.error('[Watchman] MediaPipe 초기화 실패:', err);
        badge.className   = 'session-badge distracted';
        badge.textContent = '감지 불가';
        const camError = document.getElementById('cam-error');
        camError.textContent = '얼굴 감지 모델 로드에 실패했어요. 집중도 감지 없이 진행됩니다.';
        camError.style.display = 'block';
      });

  } catch (err) {
    document.getElementById('cam-loading').style.display = 'none';
    document.getElementById('cam-off-msg').style.display = 'flex';
    document.getElementById('cam-error').textContent =
      '카메라 접근이 거부됐어요. 브라우저 설정을 확인해 주세요.';
    document.getElementById('cam-error').style.display = 'block';
    btn.disabled = false;
    btn.textContent = '카메라 켜기';
  }
}

function stopCamera() {
  stopDetectionLoop();
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
    document.getElementById('webcam-video').srcObject = null;
  }
  document.getElementById('cam-off-msg').style.display = 'flex';
  document.getElementById('focus-badge').style.display = 'none';
}

// ── 스터디 시작/종료 버튼 ─────────────────────────────────

function handleStudyBtn() {
  if (sessionState === 'camera_on') {
    startStudy();
  } else if (sessionState === 'studying') {
    const ok = confirm('스터디가 진행 중입니다.\n종료하면 현재 스터디가 끝납니다. 종료하시겠습니까?');
    if (!ok) return;
    endStudy(true);
  }
}

// ── 캘리브레이션 ───────────────────────────────────────────

/**
 * 캘리브레이션 오버레이를 열고 측정 루프를 시작합니다.
 * 10초간 yaw/pitch 샘플을 수집한 뒤 개인화 임계값을 계산합니다.
 */
function startCalibration() {
  calibYawSamples   = [];
  calibPitchSamples = [];
  calibStartTime    = null;

  setState('calibrating');

  const overlay = document.getElementById('calib-overlay');
  overlay.style.display = 'flex';
  document.getElementById('calib-countdown').textContent = '10';
  document.getElementById('calib-ring-fill').style.strokeDashoffset = RING_CIRCUMFERENCE;
  document.getElementById('calib-status').textContent =
    faceLandmarker ? '측정 중...' : 'FaceLandmarker 준비 중...';

  // tip 초기화
  ['center', 'side', 'down'].forEach(k => {
    document.getElementById(`calib-tip-${k}`).classList.remove('done');
  });

  runCalibrationLoop();
}

function runCalibrationLoop() {
  const video = document.getElementById('webcam-video');

  function sample(ts) {
    if (!calibStartTime) calibStartTime = ts;

    const elapsed  = ts - calibStartTime;
    const progress = Math.min(elapsed / CALIB_DURATION_MS, 1);
    const secLeft  = Math.ceil((CALIB_DURATION_MS - elapsed) / 1000);

    // 링 애니메이션 업데이트
    const offset = RING_CIRCUMFERENCE * (1 - progress);
    document.getElementById('calib-ring-fill').style.strokeDashoffset = offset;
    document.getElementById('calib-countdown').textContent = secLeft > 0 ? secLeft : '0';

    // 팁 단계별 하이라이트 (3~4구간마다 하나씩)
    const step = Math.floor(progress * 3);
    if (step >= 1) document.getElementById('calib-tip-center').classList.add('done');
    if (step >= 2) document.getElementById('calib-tip-side').classList.add('done');

    // 샘플 수집
    if (faceLandmarker && video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      try {
        const res = faceLandmarker.detectForVideo(video, performance.now());
        if (res.faceLandmarks && res.faceLandmarks.length > 0) {
          const { yaw, pitch } = computeHeadAngles(res.faceLandmarks[0]);
          calibYawSamples.push(yaw);
          calibPitchSamples.push(pitch);
        }
      } catch (_) { /* 무시 */ }
    }

    document.getElementById('calib-status').textContent =
      faceLandmarker
        ? `측정 중... (샘플 ${calibYawSamples.length}개)`
        : 'FaceLandmarker 로딩 대기 중...';

    if (progress < 1) {
      calibRafId = requestAnimationFrame(sample);
    } else {
      finishCalibration();
    }
  }

  calibRafId = requestAnimationFrame(sample);
}

/** 수집된 샘플로 개인화 임계값을 계산하고 세션을 시작합니다. */
function finishCalibration() {
  document.getElementById('calib-tip-down').classList.add('done');

  if (calibYawSamples.length >= 20) {
    const yaw   = calibPercentileRange(calibYawSamples);
    const pitch = calibPercentileRange(calibPitchSamples);

    // 관측 범위 + 여유각 (하한: 기본값, 상한: 기본값 + MAX_OFFSET)
    const clamp = (val, base) =>
      Math.min(base + CALIB_MAX_OFFSET_DEG, Math.max(base, val));
    calibYawLeft   = clamp(yaw.p95   + CALIB_BUFFER_DEG, BASE_THRESHOLDS.yawLeft);
    calibYawRight  = clamp(-yaw.p5   + CALIB_BUFFER_DEG, BASE_THRESHOLDS.yawRight);
    calibPitchDown = clamp(pitch.p95 + CALIB_BUFFER_DEG, BASE_THRESHOLDS.pitchDown);
    calibPitchUp   = clamp(-pitch.p5 + CALIB_BUFFER_DEG, BASE_THRESHOLDS.pitchUp);

    console.log(
      `[Watchman] 캘리브레이션 완료 — ` +
      `좌 ${calibYawLeft.toFixed(1)}° / 우 ${calibYawRight.toFixed(1)}° / ` +
      `상 ${calibPitchUp.toFixed(1)}° / 하 ${calibPitchDown.toFixed(1)}°`
    );

    document.getElementById('calib-countdown').textContent = '✓';
    document.getElementById('calib-status').textContent =
      `보정 완료 · 좌 ${calibYawLeft.toFixed(0)}° 우 ${calibYawRight.toFixed(0)}°` +
      ` 상 ${calibPitchUp.toFixed(0)}° 하 ${calibPitchDown.toFixed(0)}°`;
  } else {
    // 샘플 부족(모델 미로드 등) → 기본값 유지
    document.getElementById('calib-countdown').textContent = '!';
    document.getElementById('calib-status').textContent = '샘플 부족 — 기본값으로 시작합니다';
  }

  setTimeout(() => {
    document.getElementById('calib-overlay').style.display = 'none';
    beginActualStudy();
  }, 1400);
}

/**
 * 샘플 배열의 5·95 백분위수를 반환합니다.
 * 극단 이상치(눈 깜박임 등 일시적 오차)를 제거하기 위해 사용합니다.
 */
function calibPercentileRange(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const p5  = sorted[Math.max(0, Math.floor(sorted.length * 0.05))];
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  return { p5, p95 };
}

/** 건너뛰기 버튼 — 기본값 그대로 세션을 시작합니다. */
function skipCalibration() {
  if (calibRafId !== null) { cancelAnimationFrame(calibRafId); calibRafId = null; }
  calibYawLeft   = BASE_THRESHOLDS.yawLeft;
  calibYawRight  = BASE_THRESHOLDS.yawRight;
  calibPitchDown = BASE_THRESHOLDS.pitchDown;
  calibPitchUp   = BASE_THRESHOLDS.pitchUp;
  document.getElementById('calib-overlay').style.display = 'none';
  beginActualStudy();
}

// ── 스터디 시작 ────────────────────────────────────────────

function startStudy() {
  beginActualStudy();
}

function beginActualStudy() {
  setState('studying');
  lastFocusedState = null;
  updateFocusUI(true);
  startTimer();
  startDetectionLoop();
}

function pauseSession() {
  clearInterval(timerInterval);
  timerInterval = null;
  stopDetectionLoop();
}

// ── 세션 종료 ─────────────────────────────────────────────────────────────────
// save: true면 서버에 세션 데이터를 저장한다.
// 비회원(isGuest)이거나 실제 기록된 시간이 0초면 저장하지 않는다.
// focusRate는 서버(SessionServiceImpl)에서 자동 계산하므로 전송하지 않는다.
async function endStudy(save = true) {
  clearInterval(timerInterval);
  timerInterval = null;
  stopDetectionLoop();
  stopCamera();

  if (!isGuest && save && (focusedSec + distractedSec) > 0) {
    try {
      const payload = currentSessionId
        ? { sessionId: currentSessionId, focusedTime: focusedSec, distractedTime: distractedSec }
        : { focusedTime: focusedSec, distractedTime: distractedSec };

      const res = await fetch('/watchman/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.status === 401) {
        window.location.href = 'login.html';
        return;
      }
    } catch (err) {
      // 저장 실패해도 메인으로 이동 (세션 데이터 유실 허용)
      console.error('세션 저장 실패:', err);
    }
  }

  window.location.href = 'main.html';
}

// ── 타이머 ──────────────────────────────────────────────
// 1초마다 totalSec을 증가시키고, isFocused 상태에 따라
// focusedSec 또는 distractedSec을 누적합니다.
// isFocused는 applyFocusState → updateFocusUI를 통해 감지 루프가 갱신합니다.

function startTimer() {
  timerInterval = setInterval(() => {
    totalSec++;
    if (isFocused) focusedSec++; else distractedSec++;
    updateTimerDisplay();
  }, 1000);
}

function updateTimerDisplay() {
  const fmt = sec => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  document.getElementById('timer-display').textContent = fmt(totalSec);
  document.getElementById('nav-timer').textContent = fmt(totalSec);
  document.getElementById('stat-focused-time').textContent = fmt(focusedSec);
  document.getElementById('stat-distracted-time').textContent = fmt(distractedSec);

  const total = focusedSec + distractedSec;
  const rate = total > 0 ? Math.round((focusedSec / total) * 100) : 0;
  const rateEl = document.getElementById('stat-focus-rate');
  rateEl.textContent = `${rate}%`;
  rateEl.className = 'ssc-row-val ' + rateClass(rate);
  document.getElementById('focus-rate-bar').style.width = `${rate}%`;
  document.getElementById('focus-rate-bar').className = `ssc-bar-fill ${rateClass(rate)}`;
}

function rateClass(r) { return r >= 70 ? 'good' : r >= 40 ? 'ok' : 'bad'; }

// ── 집중 상태 UI 업데이트 ─────────────────────────────────
// 감지 루프(applyFocusState)와 타이머(startTimer)가 isFocused를 공유합니다.

function updateFocusUI(focused) {
  isFocused = focused;
  const pill    = document.getElementById('status-pill');
  const label   = document.getElementById('status-label');
  const badge   = document.getElementById('focus-badge');
  const overlay = document.getElementById('distraction-overlay');
  const frame   = document.getElementById('camera-frame');

  if (focused) {
    pill.className    = 'session-status-pill focused';
    label.textContent = '집중 중';
    badge.className   = 'session-badge focused';
    badge.textContent = '집중 중';
    overlay.style.display = 'none';
    frame.classList.remove('distracted');
  } else {
    pill.className    = 'session-status-pill distracted';
    label.textContent = '딴짓 감지!';
    badge.className   = 'session-badge distracted';
    badge.textContent = '딴짓 감지!';
    overlay.style.display = 'block';
    frame.classList.add('distracted');
  }
  badge.style.display = 'inline';
}

// ── 상태 전환 ─────────────────────────────────────────────

function setState(state) {
  sessionState = state;
  const camBtn     = document.getElementById('btn-cam');
  const studyBtn   = document.getElementById('btn-study');
  const hint       = document.getElementById('controls-hint');
  const timerSub   = document.getElementById('timer-sub');
  const navTimer   = document.getElementById('nav-timer');
  const timerDisplay  = document.getElementById('timer-display');
  const statusPill    = document.getElementById('status-pill');
  const statusLabel   = document.getElementById('status-label');

  if (state === 'idle') {
    camBtn.textContent   = '카메라 켜기';
    studyBtn.textContent = '스터디 시작하기';
    studyBtn.className   = 'btn-study-main inactive';
    studyBtn.disabled    = true;
    hint.textContent     = '카메라를 켜면 스터디를 시작할 수 있어요';
    timerSub.textContent = totalSec > 0 ? '일시정지됨 — 카메라를 켜서 이어하세요' : '카메라를 켜고 시작해보세요';
    navTimer.style.display = 'none';
    timerDisplay.classList.remove('running');
    statusPill.className  = 'session-status-pill';
    statusLabel.textContent = '대기 중';
  } else if (state === 'camera_on') {
    camBtn.textContent   = '카메라 끄기';
    studyBtn.textContent = '스터디 시작하기';
    studyBtn.className   = 'btn-study-main active';
    studyBtn.disabled    = false;
    hint.textContent     = '카메라가 켜졌어요. 스터디를 시작해보세요!';
    timerSub.textContent = '스터디 시작 버튼을 눌러보세요';
    statusPill.className  = 'session-status-pill';
    statusLabel.textContent = '대기 중';
  } else if (state === 'calibrating') {
    camBtn.textContent   = '카메라 끄기';
    studyBtn.textContent = '보정 중...';
    studyBtn.className   = 'btn-study-main inactive';
    studyBtn.disabled    = true;
    hint.textContent     = '공부 환경을 측정하고 있어요. 잠시만 기다려 주세요!';
    timerSub.textContent = '보정 완료 후 자동으로 시작됩니다';
    statusPill.className  = 'session-status-pill';
    statusLabel.textContent = '보정 중';
  } else if (state === 'studying') {
    camBtn.textContent   = '카메라 끄기 / 일시정지';
    studyBtn.textContent = '스터디 종료';
    studyBtn.className   = 'btn-study-main active';
    studyBtn.disabled    = false;
    hint.textContent     = '카메라를 끄면 일시정지돼요. 이어서 할 수 있어요';
    timerSub.textContent = '타이머 진행 중';
    navTimer.style.display  = 'inline';
    timerDisplay.classList.add('running');
  }
}

// ── 디버그 패널 (임시 분석용) ──────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  refreshDebugStatic();
  // 이어하기 세션이면 기존 누적 시간 로드
  loadInitialSessionData();
});

function toggleDebug() {
  const panel = document.getElementById('debug-panel');
  if (!panel) return;
  const isHidden = panel.style.display === 'none';
  panel.style.display = isHidden ? 'block' : 'none';
  if (isHidden) refreshDebugStatic();
}

/** 카메라 없이도 표시 가능한 정적 정보를 업데이트합니다. */
function refreshDebugStatic() {
  const done       = sessionStorage.getItem('watchman_calib_done');
  const ssYawL     = sessionStorage.getItem('watchman_calib_yaw_left');
  const ssYawR     = sessionStorage.getItem('watchman_calib_yaw_right');
  const ssPitchD   = sessionStorage.getItem('watchman_calib_pitch_down');
  const ssPitchU   = sessionStorage.getItem('watchman_calib_pitch_up');

  const el = document.getElementById('dbg-storage');
  if (el) {
    el.textContent =
      `calib_done=${done}  yaw_L=${ssYawL}  yaw_R=${ssYawR}  pitch_D=${ssPitchD}  pitch_U=${ssPitchU}`;
  }

  const activeEl = document.getElementById('dbg-active-thresh');
  if (activeEl) {
    activeEl.textContent =
      `실제 적용 임계값 — Yaw: ±${calibYawLeft}°/±${calibYawRight}°  PitchDown: ${calibPitchDown}°  PitchUp: ${calibPitchUp}°`;
  }
}

/**
 * 감지 루프가 매 프레임 호출합니다.
 * @param {number|null} yaw   - 측정된 Yaw 각도 (얼굴 없으면 null)
 * @param {number|null} pitch - 측정된 Pitch 각도 (얼굴 없으면 null)
 * @param {boolean} rawDistracted - 임계값 초과 여부
 */
function updateDebugPanel(yaw, pitch, rawDistracted) {
  const panel = document.getElementById('debug-panel');
  if (!panel || panel.style.display === 'none') return;

  // Yaw
  const yawEl = document.getElementById('dbg-yaw');
  if (yawEl) {
    if (yaw === null) {
      yawEl.textContent = '—';
      yawEl.style.color = '#888';
    } else {
      yawEl.textContent = yaw.toFixed(1) + '°';
      yawEl.style.color = (yaw > calibYawLeft || yaw < -calibYawRight) ? '#f87171' : '#4ade80';
    }
  }

  // Pitch
  const pitchEl = document.getElementById('dbg-pitch');
  if (pitchEl) {
    if (pitch === null) {
      pitchEl.textContent = '—';
      pitchEl.style.color = '#888';
    } else {
      pitchEl.textContent = pitch.toFixed(1) + '°';
      pitchEl.style.color = (pitch > calibPitchDown || pitch < -calibPitchUp) ? '#f87171' : '#4ade80';
    }
  }

  // 임계값 표시 (동적으로 갱신)
  const yawThreshEl = document.getElementById('dbg-yaw-thresh');
  if (yawThreshEl) yawThreshEl.textContent = `±${calibYawLeft}° / ±${calibYawRight}°`;

  const pitchThreshEl = document.getElementById('dbg-pitch-thresh');
  if (pitchThreshEl) pitchThreshEl.textContent = `↓${calibPitchDown}°  ↑${calibPitchUp}°`;

  // 집중 상태
  const stateEl = document.getElementById('dbg-state');
  if (stateEl) {
    if (yaw === null) {
      stateEl.textContent = '얼굴 없음';
      stateEl.style.color = '#facc15';
    } else {
      stateEl.textContent = isFocused ? '집중' : '딴짓';
      stateEl.style.color = isFocused ? '#4ade80' : '#f87171';
    }
  }

  // 딴짓 유예 타이머
  const delayEl = document.getElementById('dbg-delay');
  if (delayEl) {
    const ms = distractionSince !== null ? (performance.now() - distractionSince) : 0;
    delayEl.textContent = `유예: ${(ms / 1000).toFixed(1)}s / 2.0s`;
    delayEl.style.color = rawDistracted ? '#fb923c' : '#888';
  }
}
