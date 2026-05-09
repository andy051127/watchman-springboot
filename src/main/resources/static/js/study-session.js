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

const YAW_THRESHOLD   = 25; // ±도: 좌우 회전 이탈 기준
const PITCH_THRESHOLD = 20; // ±도: 상하 회전 이탈 기준

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
        const distracted = Math.abs(yaw) > YAW_THRESHOLD || Math.abs(pitch) > PITCH_THRESHOLD;

        if (distracted) {
          console.log(
            `[Watchman] 이탈 감지 — Yaw: ${yaw.toFixed(1)}°, Pitch: ${pitch.toFixed(1)}°`
          );
        }

        applyFocusState(!distracted);
      } else {
        // 얼굴 미감지(자리 비움) → 이탈로 처리
        applyFocusState(false);
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

function startStudy() {
  setState('studying');
  lastFocusedState = null;
  updateFocusUI(true); // 초기 상태: 집중
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
      // POST /api/sessions { focusedTime, distractedTime }
      // focusRate는 백엔드에서 계산: focusedTime / (focusedTime + distractedTime) × 100
      const res = await fetch('/watchman/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          focusedTime:    focusedSec,
          distractedTime: distractedSec,
        })
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
