// study-group-session.js — 그룹 스터디 세션 (WebRTC + STOMP + MediaPipe)

// ── URL 파라미터 ──────────────────────────────────────────
const groupId = new URLSearchParams(window.location.search).get('groupId');
if (!groupId) window.location.href = 'study-group.html';

// ── 사용자 정보 ──────────────────────────────────────────
let myUserId   = Number(sessionStorage.getItem('userId'))   || 0;
let myNickname = sessionStorage.getItem('nickname') || '나';
let myAvatar   = sessionStorage.getItem('avatar')  || '';

// ── 세션 상태 ─────────────────────────────────────────────
let sessionEnded   = false;
let localStream    = null;
let timerInterval  = null;
let totalSec       = 0;
let focusedSec     = 0;
let distractedSec  = 0;
let isFocused      = true;

// ── WebRTC ────────────────────────────────────────────────
const peerConnections = {};   // remoteUserId → RTCPeerConnection
const iceCandidateQueues = {};  // remoteUserId → RTCIceCandidate[]
const ICE_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// ── STOMP ─────────────────────────────────────────────────
let stompClient = null;

// ── 참가자 목록 ──────────────────────────────────────────
// key: userId(string), value: { userId, nickname, avatar, focused }
const participants = new Map();

// ── 초기화 ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await ensureMyInfo();
  await startCamera();
  connectWebSocket();
  startTimer();
  loadGroupName();
});

async function ensureMyInfo() {
  if (myUserId) return;
  try {
    const res = await fetch('/watchman/api/users/me');
    if (res.ok) {
      const u = await res.json();
      myUserId   = u.userId;
      myNickname = u.nickname;
      myAvatar   = u.avatar || '';
      sessionStorage.setItem('userId',   u.userId);
      sessionStorage.setItem('nickname', u.nickname);
      sessionStorage.setItem('avatar',   u.avatar || '');
    }
  } catch (e) {}
}

async function loadGroupName() {
  try {
    const res = await fetch(`/watchman/api/groups/${groupId}`);
    if (res.ok) {
      const g = await res.json();
      document.getElementById('sgs-group-name').textContent = g.name;
    }
  } catch (e) {}
}

// ── 카메라 ────────────────────────────────────────────────
async function startCamera() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  } catch (e) {
    localStream = null;
    console.warn('[SGS] 카메라 접근 실패:', e);
  }
  addMyTile();
  initFaceLandmarker().catch(err => console.warn('[SGS] MediaPipe 로드 실패:', err));
}

// ── 내 타일 추가 ─────────────────────────────────────────
function addMyTile() {
  participants.set(String(myUserId), { userId: myUserId, nickname: myNickname, avatar: myAvatar, focused: true });
  renderGrid();

  const video  = document.getElementById(`tile-video-${myUserId}`);
  const avatar = document.getElementById(`tile-avatar-${myUserId}`);
  if (video && localStream) {
    video.srcObject = localStream;
    video.muted = true;
    video.style.display = 'block';
    video.play().catch(() => {});
    if (avatar) avatar.style.display = 'none';
  }
}

// ── WebSocket (STOMP) 연결 ────────────────────────────────
function connectWebSocket() {
  const socket = new SockJS('/watchman/ws');
  stompClient = Stomp.over(socket);
  stompClient.debug = null; // 콘솔 노이즈 억제

  stompClient.connect({}, () => {
    stompClient.subscribe(`/topic/room/${groupId}/presence`, msg => handlePresence(JSON.parse(msg.body)));
    stompClient.subscribe(`/topic/room/${groupId}/focus`,    msg => handleFocusUpdate(JSON.parse(msg.body)));
    stompClient.subscribe(`/topic/room/${groupId}/chat`,     msg => handleChatMessage(JSON.parse(msg.body)));
    stompClient.subscribe(`/topic/room/${groupId}/signal`,   msg => handleSignal(JSON.parse(msg.body)));

    stompClient.send(`/app/room/${groupId}/join`, {},
      JSON.stringify({ userId: myUserId, nickname: myNickname, avatar: myAvatar }));
  }, err => {
    console.error('[SGS] STOMP 연결 실패:', err);
  });
}

// ── Presence 처리 ─────────────────────────────────────────
function handlePresence(msg) {
  if (msg.userId == myUserId) return;

  if (msg.action === 'join') {
    participants.set(String(msg.userId), {
      userId: msg.userId, nickname: msg.nickname, avatar: msg.avatar, focused: true
    });
    renderGrid();
    addSysMsg(`${msg.nickname} 님이 입장했습니다.`);
    initiateOffer(msg.userId);
  } else if (msg.action === 'leave') {
    participants.delete(String(msg.userId));
    closePC(msg.userId);
    renderGrid();
    addSysMsg(`${msg.nickname} 님이 퇴장했습니다.`);
  }
}

// ── WebRTC: offer 보내기 (기존 참가자 → 신규 참가자) ──────
async function initiateOffer(remoteUserId) {
  const pc = createPC(remoteUserId);
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    stompClient.send(`/app/room/${groupId}/signal`, {},
      JSON.stringify({ from: myUserId, to: remoteUserId, type: 'offer', data: offer,
                       fromNickname: myNickname, fromAvatar: myAvatar }));
  } catch (e) {
    console.error('[SGS] offer 생성 실패:', e);
  }
}

// ── WebRTC: RTCPeerConnection 생성 ────────────────────────
function createPC(remoteUserId) {
  if (peerConnections[remoteUserId]) return peerConnections[remoteUserId];

  const pc = new RTCPeerConnection(ICE_CONFIG);
  peerConnections[remoteUserId] = pc;

  if (localStream) {
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
  }

  pc.ontrack = (event) => {
    const video  = document.getElementById(`tile-video-${remoteUserId}`);
    const avatar = document.getElementById(`tile-avatar-${remoteUserId}`);
    if (video && event.streams[0]) {
      video.srcObject = event.streams[0];
      video.style.display = 'block';
      video.play().catch(() => {});
      if (avatar) avatar.style.display = 'none';
    }
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      stompClient.send(`/app/room/${groupId}/signal`, {},
        JSON.stringify({ from: myUserId, to: remoteUserId, type: 'ice', data: event.candidate }));
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
      closePC(remoteUserId);
    }
  };

  return pc;
}

function closePC(remoteUserId) {
  if (peerConnections[remoteUserId]) {
    peerConnections[remoteUserId].close();
    delete peerConnections[remoteUserId];
  }
}

// ── WebRTC: 시그널 수신 ───────────────────────────────────
async function handleSignal(msg) {
  if (msg.to != myUserId) return;

  const remoteUserId = msg.from;

  if (msg.type === 'offer') {
    // offer 보낸 쪽이 participants에 없으면 추가 (신규 참가자가 기존 참가자 화면 못 보는 문제 해결)
    if (!participants.has(String(remoteUserId))) {
      participants.set(String(remoteUserId), {
        userId: remoteUserId, nickname: msg.fromNickname || String(remoteUserId), avatar: msg.fromAvatar || '', focused: true
      });
      renderGrid();
    }
    const pc = createPC(remoteUserId);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
      // 큐에 쌓인 ICE candidates 처리
      if (iceCandidateQueues[remoteUserId]) {
        for (const candidate of iceCandidateQueues[remoteUserId]) {
          await pc.addIceCandidate(candidate).catch(() => {});
        }
        delete iceCandidateQueues[remoteUserId];
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      stompClient.send(`/app/room/${groupId}/signal`, {},
        JSON.stringify({ from: myUserId, to: remoteUserId, type: 'answer', data: answer }));
    } catch (e) { console.error('[SGS] answer 생성 실패:', e); }
  } else if (msg.type === 'answer') {
    const pc = peerConnections[remoteUserId];
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
        // 큐에 쌓인 ICE candidates 처리
        if (iceCandidateQueues[remoteUserId]) {
          for (const candidate of iceCandidateQueues[remoteUserId]) {
            await pc.addIceCandidate(candidate).catch(() => {});
          }
          delete iceCandidateQueues[remoteUserId];
        }
      } catch (e) { console.error('[SGS] answer 적용 실패:', e); }
    }
  } else if (msg.type === 'ice') {
    const pc = peerConnections[remoteUserId];
    if (pc && pc.remoteDescription) {
      await pc.addIceCandidate(new RTCIceCandidate(msg.data)).catch(() => {});
    } else {
      // remoteDescription 아직 없음 → 큐에 저장
      if (!iceCandidateQueues[remoteUserId]) iceCandidateQueues[remoteUserId] = [];
      iceCandidateQueues[remoteUserId].push(new RTCIceCandidate(msg.data));
    }
  }
}

// ── 집중 상태 수신 ─────────────────────────────────────────
function handleFocusUpdate(msg) {
  if (msg.userId == myUserId) return;
  const p = participants.get(String(msg.userId));
  if (p) {
    p.focused = msg.focused;
    updateTileFocusUI(msg.userId, msg.focused);
  }
}

// ── 채팅 수신 ──────────────────────────────────────────────
function handleChatMessage(msg) {
  appendChatMessage(msg);
}

// ── 채팅 전송 ──────────────────────────────────────────────
function sendChat() {
  const input = document.getElementById('sgs-chat-input');
  const text = input.value.trim();
  if (!text || !stompClient?.connected) return;

  const msg = {
    userId:    myUserId,
    nickname:  myNickname,
    avatar:    myAvatar,
    message:   text,
    timestamp: Date.now()
  };
  stompClient.send(`/app/room/${groupId}/chat`, {}, JSON.stringify(msg));
  input.value = '';
}

function appendChatMessage(msg) {
  const container = document.getElementById('sgs-chat-messages');
  const isMe = msg.userId == myUserId;

  const div = document.createElement('div');
  div.className = `sgs-chat-msg${isMe ? ' mine' : ''}`;

  const avatarHtml = msg.avatar
    ? `<img src="${esc(msg.avatar)}" alt="${esc(msg.nickname)}" />`
    : esc((msg.nickname || '?').charAt(0));

  div.innerHTML = `
    <div class="sgs-chat-avatar">${avatarHtml}</div>
    <div class="sgs-chat-bubble">
      ${!isMe ? `<div class="sgs-chat-meta"><span class="sgs-chat-nick">${esc(msg.nickname)}</span></div>` : ''}
      <div class="sgs-chat-text">${esc(msg.message)}</div>
    </div>`;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function addSysMsg(text) {
  const container = document.getElementById('sgs-chat-messages');
  const div = document.createElement('div');
  div.className = 'sgs-sys-msg';
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// ── 그리드 렌더링 ─────────────────────────────────────────
function renderGrid() {
  const grid = document.getElementById('sgs-grid');
  const n = participants.size;

  let cols;
  if (n <= 1)      cols = 1;
  else if (n <= 2) cols = 2;
  else if (n <= 4) cols = 2;
  else if (n <= 9) cols = 3;
  else             cols = 4;
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  const existingIds = new Set([...grid.querySelectorAll('.sgs-tile')].map(t => t.dataset.uid));
  const currentIds  = new Set([...participants.keys()]);

  existingIds.forEach(uid => {
    if (!currentIds.has(uid)) grid.querySelector(`[data-uid="${uid}"]`)?.remove();
  });

  const ordered = [String(myUserId), ...[...participants.keys()].filter(k => k != myUserId)];
  ordered.forEach(uid => {
    if (!grid.querySelector(`[data-uid="${uid}"]`)) {
      const p = participants.get(uid);
      if (!p) return;
      grid.appendChild(buildTile(p));
    }
  });
}

function buildTile(p) {
  const isMe = p.userId == myUserId;
  const tile = document.createElement('div');
  tile.className = `sgs-tile${isMe ? ' me-tile' : ''}`;
  tile.dataset.uid = String(p.userId);

  const avatarChar = (p.nickname || '?').charAt(0).toUpperCase();
  tile.innerHTML = `
    <div class="sgs-tile-avatar" id="tile-avatar-${p.userId}">${avatarChar}</div>
    <video id="tile-video-${p.userId}" playsinline ${isMe ? 'muted' : ''} style="display:none"></video>
    <div class="sgs-tile-info">
      <span class="sgs-focus-dot focused" id="tile-dot-${p.userId}"></span>
      <span class="sgs-tile-name">${esc(p.nickname)}${isMe ? ' (나)' : ''}</span>
    </div>`;

  return tile;
}

function updateTileFocusUI(userId, focused) {
  const dot  = document.getElementById(`tile-dot-${userId}`);
  const tile = document.querySelector(`.sgs-tile[data-uid="${userId}"]`);
  if (dot) {
    dot.className = `sgs-focus-dot ${focused ? 'focused' : 'distracted'}`;
  }
  if (tile) {
    tile.classList.toggle('focused-border',   focused);
    tile.classList.toggle('distracted-border', !focused);
  }
}

// ── MediaPipe FaceLandmarker ──────────────────────────────
let faceLandmarker     = null;
let detectionRafId     = null;
let distractionSince   = null;
const DISTRACTION_DELAY_MS = 3000;
const BASE_THRESHOLDS = { yawLeft: 35, yawRight: 35, pitchDown: 30, pitchUp: 20 };
const MEDIAPIPE_VERSION = '0.10.3';
const MEDIAPIPE_CDN     = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}`;

// ── 캘리브레이션 ────────────────────────────────────────────
const CALIB_DURATION_MS    = 10000;
const CALIB_BUFFER_DEG     = 8;
const CALIB_MAX_OFFSET_DEG = 10;
const RING_CIRCUMFERENCE   = 314;
let calibRafId        = null;
let calibStartTime    = null;
let calibYawSamples   = [];
let calibPitchSamples = [];

function loadCalibValue(key, base) {
  if (sessionStorage.getItem('watchman_calib_done') !== '1') return base;
  const v = parseFloat(sessionStorage.getItem(key));
  if (isNaN(v) || v <= 0 || v > base + 20) return base;
  return v;
}
let calibYawLeft   = loadCalibValue('watchman_calib_yaw_left',   BASE_THRESHOLDS.yawLeft);
let calibYawRight  = loadCalibValue('watchman_calib_yaw_right',  BASE_THRESHOLDS.yawRight);
let calibPitchDown = loadCalibValue('watchman_calib_pitch_down', BASE_THRESHOLDS.pitchDown);
let calibPitchUp   = loadCalibValue('watchman_calib_pitch_up',   BASE_THRESHOLDS.pitchUp);

async function initFaceLandmarker() {
  const { FaceLandmarker, FilesetResolver } = await import(`${MEDIAPIPE_CDN}/vision_bundle.mjs`);
  const vision = await FilesetResolver.forVisionTasks(`${MEDIAPIPE_CDN}/wasm`);
  const modelAssetPath = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
  const opts = {
    runningMode: 'VIDEO', numFaces: 1,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5
  };
  try {
    faceLandmarker = await FaceLandmarker.createFromOptions(vision,
      { baseOptions: { modelAssetPath, delegate: 'GPU' }, ...opts });
  } catch {
    faceLandmarker = await FaceLandmarker.createFromOptions(vision,
      { baseOptions: { modelAssetPath, delegate: 'CPU' }, ...opts });
  }
  startCalibration();
}

function startCalibration() {
  calibYawSamples   = [];
  calibPitchSamples = [];
  calibStartTime    = null;

  const overlay = document.getElementById('calib-overlay');
  overlay.style.display = 'flex';
  document.getElementById('calib-countdown').textContent = '10';
  document.getElementById('calib-ring-fill').style.strokeDashoffset = RING_CIRCUMFERENCE;
  document.getElementById('calib-status').textContent = '측정 중...';
  ['center', 'side', 'down'].forEach(k => {
    document.getElementById(`calib-tip-${k}`).classList.remove('done');
  });

  runCalibrationLoop();
}

function runCalibrationLoop() {
  let lastSampleTime = 0;
  const SAMPLE_INTERVAL_MS = 100; // 10fps 샘플링 — currentTime 의존 제거

  function sample(ts) {
    if (!calibStartTime) calibStartTime = ts;
    const elapsed  = ts - calibStartTime;
    const progress = Math.min(elapsed / CALIB_DURATION_MS, 1);
    const secLeft  = Math.ceil((CALIB_DURATION_MS - elapsed) / 1000);

    document.getElementById('calib-ring-fill').style.strokeDashoffset =
      RING_CIRCUMFERENCE * (1 - progress);
    document.getElementById('calib-countdown').textContent = secLeft > 0 ? secLeft : '0';

    const step = Math.floor(progress * 3);
    if (step >= 1) document.getElementById('calib-tip-center').classList.add('done');
    if (step >= 2) document.getElementById('calib-tip-side').classList.add('done');

    // 100ms마다 한 번씩 샘플 수집 (매 프레임 조회로 stale DOM 방어)
    if (ts - lastSampleTime >= SAMPLE_INTERVAL_MS) {
      lastSampleTime = ts;
      const video = document.getElementById(`tile-video-${myUserId}`);
      if (faceLandmarker && video && video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
        try {
          const res = faceLandmarker.detectForVideo(video, performance.now());
          if (res.faceLandmarks?.length > 0) {
            const { yaw, pitch } = computeHeadAngles(res.faceLandmarks[0]);
            calibYawSamples.push(yaw);
            calibPitchSamples.push(pitch);
          }
        } catch (_) {}
      }
    }

    document.getElementById('calib-status').textContent =
      `측정 중... (샘플 ${calibYawSamples.length}개)`;

    if (progress < 1) {
      calibRafId = requestAnimationFrame(sample);
    } else {
      finishCalibration();
    }
  }
  calibRafId = requestAnimationFrame(sample);
}

function finishCalibration() {
  document.getElementById('calib-tip-down').classList.add('done');

  if (calibYawSamples.length >= 20) {
    const yaw   = calibPercentileRange(calibYawSamples);
    const pitch = calibPercentileRange(calibPitchSamples);
    const clamp = (val, base) =>
      Math.min(base + CALIB_MAX_OFFSET_DEG, Math.max(base, val));
    calibYawLeft   = clamp(yaw.p95   + CALIB_BUFFER_DEG, BASE_THRESHOLDS.yawLeft);
    calibYawRight  = clamp(-yaw.p5   + CALIB_BUFFER_DEG, BASE_THRESHOLDS.yawRight);
    calibPitchDown = clamp(pitch.p95 + CALIB_BUFFER_DEG, BASE_THRESHOLDS.pitchDown);
    calibPitchUp   = clamp(-pitch.p5 + CALIB_BUFFER_DEG, BASE_THRESHOLDS.pitchUp);
    document.getElementById('calib-countdown').textContent = '✓';
    document.getElementById('calib-status').textContent =
      `보정 완료 · 좌 ${calibYawLeft.toFixed(0)}° 우 ${calibYawRight.toFixed(0)}°` +
      ` 상 ${calibPitchUp.toFixed(0)}° 하 ${calibPitchDown.toFixed(0)}°`;
  } else {
    document.getElementById('calib-countdown').textContent = '!';
    document.getElementById('calib-status').textContent = '샘플 부족 — 기본값으로 시작합니다';
  }

  setTimeout(() => {
    document.getElementById('calib-overlay').style.display = 'none';
    startDetectionLoop();
  }, 1400);
}

function skipCalibration() {
  if (calibRafId !== null) { cancelAnimationFrame(calibRafId); calibRafId = null; }
  calibYawLeft   = BASE_THRESHOLDS.yawLeft;
  calibYawRight  = BASE_THRESHOLDS.yawRight;
  calibPitchDown = BASE_THRESHOLDS.pitchDown;
  calibPitchUp   = BASE_THRESHOLDS.pitchUp;
  document.getElementById('calib-overlay').style.display = 'none';
  startDetectionLoop();
}

function calibPercentileRange(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const p5  = sorted[Math.max(0, Math.floor(sorted.length * 0.05))];
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  return { p5, p95 };
}

function computeHeadAngles(landmarks) {
  const nose = landmarks[4], forehead = landmarks[10], chin = landmarks[152];
  const leftCheek = landmarks[234], rightCheek = landmarks[454];
  const faceCenterX = (leftCheek.x + rightCheek.x) / 2;
  const faceHalfW   = Math.abs(rightCheek.x - leftCheek.x) / 2;
  const yaw = Math.asin(Math.max(-1, Math.min(1,
    faceHalfW > 0 ? (nose.x - faceCenterX) / faceHalfW : 0))) * (180 / Math.PI);
  const faceCenterY = (forehead.y + chin.y) / 2;
  const faceHalfH   = Math.abs(chin.y - forehead.y) / 2;
  const pitch = Math.asin(Math.max(-1, Math.min(1,
    faceHalfH > 0 ? (nose.y - faceCenterY) / faceHalfH : 0))) * (180 / Math.PI);
  return { yaw, pitch };
}

function startDetectionLoop() {
  let lastDetectTime = 0;
  const DETECT_INTERVAL_MS = 50; // ~20fps — currentTime 의존 제거, 시간 기반 throttle

  function detect(ts) {
    // rAF를 최상단에 등록해 오류/early-return 시에도 루프가 끊기지 않음
    detectionRafId = requestAnimationFrame(detect);

    // video를 매 프레임 새로 조회 (renderGrid 재호출 방어)
    const video = document.getElementById(`tile-video-${myUserId}`);
    if (!faceLandmarker || !video) return;
    if (video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return;
    if (ts - lastDetectTime < DETECT_INTERVAL_MS) return;
    lastDetectTime = ts;

    let results;
    try {
      results = faceLandmarker.detectForVideo(video, performance.now());
    } catch (e) {
      console.warn('[SGS] detectForVideo 오류:', e);
      return;
    }

    if (results.faceLandmarks?.length > 0) {
      const { yaw, pitch } = computeHeadAngles(results.faceLandmarks[0]);
      const rawDistracted =
        yaw   >  calibYawLeft   ||
        yaw   < -calibYawRight  ||
        pitch >  calibPitchDown ||
        pitch < -calibPitchUp;
      if (rawDistracted) {
        if (distractionSince === null) distractionSince = performance.now();
        else if (performance.now() - distractionSince >= DISTRACTION_DELAY_MS) applyFocusState(false);
      } else {
        distractionSince = null;
        applyFocusState(true);
      }
    } else {
      // 얼굴 미감지 → 유예 타이머 적용
      if (distractionSince === null) distractionSince = performance.now();
      else if (performance.now() - distractionSince >= DISTRACTION_DELAY_MS) applyFocusState(false);
    }
  }
  detectionRafId = requestAnimationFrame(detect);
}

let lastFocusedState = null;
function applyFocusState(focused) {
  if (focused === lastFocusedState) return;
  lastFocusedState = focused;
  isFocused = focused;
  updateTileFocusUI(myUserId, focused);
  if (stompClient?.connected) {
    stompClient.send(`/app/room/${groupId}/focus`, {},
      JSON.stringify({ userId: myUserId, focused }));
  }
}

// ── 타이머 ────────────────────────────────────────────────
function startTimer() {
  timerInterval = setInterval(() => {
    totalSec++;
    if (isFocused) focusedSec++; else distractedSec++;
    updateTimerUI();
  }, 1000);
  document.getElementById('sgs-timer').style.display = 'inline';
}

function updateTimerUI() {
  const fmt = s => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };
  document.getElementById('sgs-timer').textContent           = fmt(totalSec);
  document.getElementById('sgs-stat-focused').textContent    = fmt(focusedSec);
  document.getElementById('sgs-stat-distracted').textContent = fmt(distractedSec);

  const total = focusedSec + distractedSec;
  const rate  = total > 0 ? Math.round((focusedSec / total) * 100) : 0;
  document.getElementById('sgs-stat-rate').textContent = `${rate}%`;
  document.getElementById('sgs-bar').style.width       = `${rate}%`;
}

// ── 세션 종료 ─────────────────────────────────────────────
async function handleExit() {
  if (!confirm('스터디를 종료하시겠습니까?')) return;
  await endSession();
}

window.addEventListener('beforeunload', () => {
  if (sessionEnded) return; // endSession()이 이미 leave를 보냄
  if (stompClient?.connected) {
    stompClient.send(`/app/room/${groupId}/leave`, {},
      JSON.stringify({ userId: myUserId, nickname: myNickname, avatar: myAvatar }));
  }
});

async function endSession() {
  if (sessionEnded) return;
  sessionEnded = true;
  clearInterval(timerInterval);
  if (detectionRafId) cancelAnimationFrame(detectionRafId);

  if (stompClient?.connected) {
    stompClient.send(`/app/room/${groupId}/leave`, {},
      JSON.stringify({ userId: myUserId, nickname: myNickname, avatar: myAvatar }));
    stompClient.disconnect();
  }

  Object.keys(peerConnections).forEach(uid => closePC(uid));
  localStream?.getTracks().forEach(t => t.stop());

  if ((focusedSec + distractedSec) > 0) {
    try {
      await fetch('/watchman/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focusedTime: focusedSec, distractedTime: distractedSec })
      });
    } catch (e) { console.error('[SGS] 세션 저장 실패:', e); }
  }

  window.location.href = `study-group-info.html?groupId=${groupId}`;
}

// ── 유틸 ──────────────────────────────────────────────────
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
