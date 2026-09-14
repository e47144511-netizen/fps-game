import { scene } from './engine.js';
import { playSound, showToast } from './storage.js';
import { damagePlayer, player } from './player.js';
import { createTacticalCharacter } from './characters.js';
import { initWorld } from './world.js';
import { MAPS_DB, currentMapId } from './maps.js';

export let isMultiplayer = false;
export let isHost = false;
let peerConnection = null;
let dataChannel = null;

// ساخت مدل سه‌بعدی تاکتیکی برای رقیب
export const remotePlayer = createTacticalCharacter(0xef4444);
remotePlayer.visible = false; 
scene.add(remotePlayer);

export const remoteTarget = { 
  pos: new THREE.Vector3(0, 0, 0), 
  rotY: 0,
  isSliding: false
};

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

function logNet(msg, type = 'info') {
  const fullMsg = `[NETWORK] ${msg}`;
  if (type === 'err') console.error(fullMsg);
  else if (type === 'warn') console.warn(fullMsg);
  else console.log(fullMsg);
}

function safeEncode(obj) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
}

function safeDecode(str) {
  return JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
}

// بستن و ریست اتصال قبلی در صورت وجود
export function resetNetwork() {
  if (dataChannel) {
    try { dataChannel.close(); } catch(e){}
    dataChannel = null;
  }
  if (peerConnection) {
    try { peerConnection.close(); } catch(e){}
    peerConnection = null;
  }
  isMultiplayer = false;
  remotePlayer.visible = false;
  const chip = document.getElementById('mp-chip');
  if (chip) {
    chip.innerText = "تک‌نفره";
    chip.style.color = "#fff";
  }
}

function setupDataChannelEvents(channel, onConnected) {
  dataChannel = channel;
  
  dataChannel.onopen = () => {
    isMultiplayer = true;
    remotePlayer.visible = true;
    logNet("Data Channel Open - Connection established successfully!");
    
    const chip = document.getElementById('mp-chip');
    if (chip) {
      chip.innerText = isHost ? "🟢 میزبان (متصل)" : "🟢 مهمان (متصل)";
      chip.style.color = "#10b981";
    }
    showToast('اتصال چندنفره برقرار شد!', '#10b981');
    
    // اگر هاست هستیم، اطلاعات نقشه و شروع بازی را برای مهمان می‌فرستیم
    if (isHost) {
      sendNetworkData({
        t: 'init',
        map: currentMapId,
        hostSpawnIndex: 0,
        guestSpawnIndex: 1
      });
    }

    if (typeof onConnected === 'function') onConnected();
  };

  dataChannel.onclose = () => {
    logNet("Data Channel Closed", "warn");
    isMultiplayer = false;
    remotePlayer.visible = false;
    const chip = document.getElementById('mp-chip');
    if (chip) {
      chip.innerText = "قطع ارتباط";
      chip.style.color = "#ef4444";
    }
    showToast('ارتباط با رقیب قطع شد', '#ef4444');
  };

  dataChannel.onerror = (err) => {
    logNet(`DataChannel Error: ${err.message || err}`, "err");
  };

  dataChannel.onmessage = (e) => {
    try {
      const d = JSON.parse(e.data);
      
      // ۱. پیام راه‌اندازی اولیه توسط هاست
      if (d.t === 'init') {
        logNet(`Host selected map: ${d.map}`);
        initWorld(d.map);
        if (MAPS_DB[d.map] && MAPS_DB[d.map].spawns) {
          const spawnPoint = MAPS_DB[d.map].spawns[d.guestSpawnIndex] || MAPS_DB[d.map].spawns[0];
          player.pos.copy(spawnPoint);
        }
        showToast(`ورود به نقشه ${MAPS_DB[d.map].name}`, '#38bdf8');
      }
      
      // ۲. داده‌های موقعیت و چرخش رقیب
      else if (d.t === 'm') {
        remoteTarget.pos.set(d.x, d.y - 1.8, d.z);
        remoteTarget.rotY = d.ry;
        remoteTarget.isSliding = !!d.sl;
      }
      
      // ۳. شلیک رقیب
      else if (d.t === 's') {
        playSound(600, 0.08, 'sawtooth', 0.25);
        // ایجاد خط گلوله بصری از سمت اسلحه رقیب به جهت روبرو
        const origin = remotePlayer.position.clone().add(new THREE.Vector3(0, 1.2, 0));
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), remoteTarget.rotY);
        const tr = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.03, 20),
          new THREE.MeshBasicMaterial({ color: 0xfacc15 })
        );
        tr.position.copy(origin).add(forward.clone().multiplyScalar(10));
        tr.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), forward);
        scene.add(tr);
        setTimeout(() => scene.remove(tr), 50);
      }
      
      // ۴. دریافت دمیج از رقیب
      else if (d.t === 'h') {
        damagePlayer(d.dmg);
      }
      
      // ۵. پرتاب نارنجک رقیب
      else if (d.t === 'g') {
        playSound(350, 0.1, 'triangle', 0.3);
      }
    } catch(err) {
      logNet(`Parse incoming packet error: ${err}`, "err");
    }
  };
}

// تولید Offer توسط میزبان
export async function createHostOffer() {
  try {
    resetNetwork();
    isHost = true;
    logNet("Creating Host Offer...");
    const hostBox = document.getElementById('host-offer-text');
    if (hostBox) hostBox.value = "در حال تجمیع کد شبکه (صبر کنید)...";

    peerConnection = new RTCPeerConnection(rtcConfig);
    const dc = peerConnection.createDataChannel('game', { ordered: false, maxRetransmits: 0 }); // بهینه برای بازی آنلاین کم‌تاخیر
    setupDataChannelEvents(dc);

    peerConnection.onconnectionstatechange = () => {
      logNet(`PeerConnection State: ${peerConnection.connectionState}`);
    };

    peerConnection.oniceconnectionstatechange = () => {
      logNet(`ICE Connection State: ${peerConnection.iceConnectionState}`);
      if (peerConnection.iceConnectionState === 'connected') {
        logNet("ICE Connected successfully!");
      }
    };

    // صبر برای جمع‌آوری تمامی Candidateها تا کدی کامل و بدون نیاز به سرور ارسال شود
    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) {
        logNet("All ICE Candidates gathered!");
        if (hostBox && peerConnection.localDescription) {
          hostBox.value = safeEncode(peerConnection.localDescription);
          hostBox.select();
          showToast('کد اتاق ساخته شد! کپی کنید و به دوستتان بدهید', '#10b981');
        }
      }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    // Fallback در صورتی که رویداد null دیر بیاید
    setTimeout(() => {
      if (hostBox && hostBox.value.startsWith("در حال تجمیع") && peerConnection.localDescription) {
        hostBox.value = safeEncode(peerConnection.localDescription);
        logNet("Offer generated via fallback timeout.");
      }
    }, 1500);

  } catch(err) {
    logNet(`Create Offer Error: ${err.message || err}`, "err");
    showToast('خطا در ساخت اتاق میزبان', '#ef4444');
  }
}

// مهمان: تولید پاسخ با استفاده از کد میزبان
export async function createJoinAnswer(onConnected) {
  try {
    resetNetwork();
    isHost = false;
    logNet("Creating Join Answer...");
    const joinInput = document.getElementById('join-offer-input');
    const joinAnswerBox = document.getElementById('join-answer-text');
    const val = joinInput ? joinInput.value.trim() : '';

    if (!val) {
      showToast('ابتدا کد میزبان را در کادر بالا وارد کنید', '#eab308');
      return;
    }

    if (joinAnswerBox) joinAnswerBox.value = "در حال تولید کد پاسخ (صبر کنید)...";

    peerConnection = new RTCPeerConnection(rtcConfig);

    peerConnection.ondatachannel = (e) => {
      logNet("Data Channel received by Client");
      setupDataChannelEvents(e.channel, onConnected);
    };

    peerConnection.onconnectionstatechange = () => {
      logNet(`Client Connection State: ${peerConnection.connectionState}`);
    };

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) {
        logNet("Client ICE Candidates gathered!");
        if (joinAnswerBox && peerConnection.localDescription) {
          joinAnswerBox.value = safeEncode(peerConnection.localDescription);
          joinAnswerBox.select();
          showToast('کد پاسخ آماده شد! آن را برای میزبان بفرستید', '#10b981');
        }
      }
    };

    const offerDesc = safeDecode(val);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offerDesc));
    logNet("Remote Offer Description set on Client");

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    setTimeout(() => {
      if (joinAnswerBox && joinAnswerBox.value.startsWith("در حال تولید") && peerConnection.localDescription) {
        joinAnswerBox.value = safeEncode(peerConnection.localDescription);
      }
    }, 1500);

  } catch(err) {
    logNet(`Create Answer Error: ${err.message || err}`, "err");
    showToast('کد میزبان نامعتبر است', '#ef4444');
    const joinAnswerBox = document.getElementById('join-answer-text');
    if (joinAnswerBox) joinAnswerBox.value = "";
  }
}

// میزبان: تایید کد پاسخ ارسالی از مهمان
export async function connectHost() {
  try {
    const hostAnswerInput = document.getElementById('host-answer-input');
    const val = hostAnswerInput ? hostAnswerInput.value.trim() : '';
    if (!val) {
      showToast('لطفاً کد پاسخ دوستتان را وارد کنید', '#eab308');
      return;
    }
    const answerDesc = safeDecode(val);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answerDesc));
    logNet("Remote Answer applied on Host!");
    showToast('پاسخ مهمان تایید شد! در حال برقراری اتصال...', '#10b981');
  } catch(err) {
    logNet(`Connect Host Error: ${err.message || err}`, "err");
    showToast('کد پاسخ وارد شده نامعتبر است', '#ef4444');
  }
}

export function sendNetworkData(data) {
  if (isMultiplayer && dataChannel && dataChannel.readyState === 'open') {
    try {
      dataChannel.send(JSON.stringify(data));
    } catch(e) {
      logNet(`Send Data Error: ${e}`, "err");
    }
  }
}

export function updateNetwork(dt) {
  if (isMultiplayer && remotePlayer.visible) {
    // درونیابی موقعیت و چرخش برای جلوگیری از Jitter
    remotePlayer.position.lerp(remoteTarget.pos, Math.min(1.0, 16 * dt));
    
    // تصحیح زوایای پیوسته (Rotation lerp)
    let diffRot = remoteTarget.rotY - remotePlayer.rotation.y;
    while (diffRot < -Math.PI) diffRot += Math.PI * 2;
    while (diffRot > Math.PI) diffRot -= Math.PI * 2;
    remotePlayer.rotation.y += diffRot * Math.min(1.0, 14 * dt);

    // تغییر زاویه در حالت Slide
    if (remoteTarget.isSliding) {
      remotePlayer.rotation.z = THREE.MathUtils.lerp(remotePlayer.rotation.z, 0.35, 10 * dt);
    } else {
      remotePlayer.rotation.z = THREE.MathUtils.lerp(remotePlayer.rotation.z, 0, 10 * dt);
    }
  }
      }
    
