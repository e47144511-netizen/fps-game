import { scene } from './engine.js';
import { playSound, showToast } from './storage.js';
import { damagePlayer } from './player.js';
import { createTacticalCharacter } from './characters.js';

export let isMultiplayer = false;
let peerConnection = null, dataChannel = null;

export const remotePlayer = createTacticalCharacter(0xef4444);
remotePlayer.visible = false; 
scene.add(remotePlayer);

export const remoteTarget = { pos: new THREE.Vector3(), rotY: 0 };

// تنظیم STUN سرورهای پایدار گوگل
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// تابع ایمن برای انکود به Base64 بدون کرش روی یونیکد
function safeEncode(obj) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
}

// تابع ایمن برای دیکود Base64 با مدیریت خطا
function safeDecode(str) {
  return JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
}

function initDataChannel(channel, onConnected) {
  channel.onopen = () => { 
    isMultiplayer = true; 
    remotePlayer.visible = true; 
    const chip = document.getElementById('mp-chip');
    if (chip) {
      chip.innerText = "🟢 متصل"; 
      chip.style.color = "#10b981";
    }
    showToast('اتصال با موفقیت برقرار شد!', '#10b981'); 
    if (typeof onConnected === 'function') onConnected(); 
  };
  
  channel.onclose = () => { 
    isMultiplayer = false; 
    remotePlayer.visible = false; 
    const chip = document.getElementById('mp-chip');
    if (chip) chip.innerText = "قطع ارتباط"; 
    showToast('ارتباط قطع شد', '#ef4444');
  };

  channel.onmessage = (e) => { 
    try {
      const d = JSON.parse(e.data); 
      if (d.t === 'm') { 
        remoteTarget.pos.set(d.x, d.y - 1.8, d.z); 
        remoteTarget.rotY = d.ry; 
      } 
      else if (d.t === 's') { 
        playSound(600, 0.08, 'sawtooth', 0.25); 
      } 
      else if (d.t === 'h') { 
        damagePlayer(d.dmg); 
      } 
    } catch(err) {
      console.error("Net parse error:", err);
    }
  };
}

// 1. ساخت کد میزبان (Offer)
export async function createHostOffer(onConnected) {
  try {
    const hostOfferBox = document.getElementById('host-offer-text');
    if (hostOfferBox) hostOfferBox.value = "در حال تولید کد اتصال...";

    peerConnection = new RTCPeerConnection(rtcConfig);
    dataChannel = peerConnection.createDataChannel('game');
    initDataChannel(dataChannel, onConnected);

    // ثبت تغییرات ICE
    peerConnection.onicecandidate = () => { 
      if (peerConnection.localDescription && hostOfferBox) {
        hostOfferBox.value = safeEncode(peerConnection.localDescription);
      }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    // نمایش بلافاصله کد پایه بدون معطل ماندن برای کل Candidateها
    if (hostOfferBox) {
      hostOfferBox.value = safeEncode(peerConnection.localDescription);
      hostOfferBox.select();
    }
    showToast('کد میزبان آماده شد! کپی کنید', '#10b981');
  } catch (err) { 
    console.error(err);
    showToast('خطا در ساخت کد میزبان', '#ef4444'); 
  }
}

// 2. تولید کد پاسخ توسط مهمان (Answer)
export async function createJoinAnswer(onConnected) {
  try {
    const joinInput = document.getElementById('join-offer-input');
    const joinAnswerBox = document.getElementById('join-answer-text');
    const val = joinInput ? joinInput.value.trim() : '';

    if (!val) { 
      showToast('لطفاً کد میزبان را داخل کادر بالا وارد کنید', '#eab308'); 
      return; 
    }

    if (joinAnswerBox) joinAnswerBox.value = "در حال تولید پاسخ...";

    peerConnection = new RTCPeerConnection(rtcConfig);
    peerConnection.ondatachannel = (e) => initDataChannel(e.channel, onConnected);

    peerConnection.onicecandidate = () => { 
      if (peerConnection.localDescription && joinAnswerBox) {
        joinAnswerBox.value = safeEncode(peerConnection.localDescription);
      }
    };

    const parsedOffer = safeDecode(val);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(parsedOffer));
    
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    if (joinAnswerBox) {
      joinAnswerBox.value = safeEncode(peerConnection.localDescription);
      joinAnswerBox.select();
    }
    showToast('کد پاسخ تولید شد! آن را برای میزبان بفرستید', '#10b981');
  } catch (err) { 
    console.error(err);
    showToast('کد میزبان نامعتبر است یا درست کپی نشده', '#ef4444'); 
    const joinAnswerBox = document.getElementById('join-answer-text');
    if (joinAnswerBox) joinAnswerBox.value = "";
  }
}

// 3. ثبت نهایی پاسخ در دستگاه میزبان
export async function connectHost() { 
  try {
    const hostAnswerInput = document.getElementById('host-answer-input');
    const val = hostAnswerInput ? hostAnswerInput.value.trim() : '';
    if (!val) {
      showToast('کد پاسخ دوستتان را وارد کنید', '#eab308');
      return;
    }
    const parsedAnswer = safeDecode(val);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(parsedAnswer)); 
    showToast('پاسخ با موفقیت تایید شد!', '#10b981');
  } catch (err) { 
    console.error(err);
    showToast('کد پاسخ وارد شده نامعتبر است', '#ef4444'); 
  }
}

export function sendNetworkData(data) { 
  if (isMultiplayer && dataChannel && dataChannel.readyState === 'open') {
    dataChannel.send(JSON.stringify(data)); 
  }
}

export function updateNetwork(dt) { 
  if (isMultiplayer && remotePlayer.visible) { 
    remotePlayer.position.lerp(remoteTarget.pos, 14 * dt); 
    remotePlayer.rotation.y += (remoteTarget.rotY - remotePlayer.rotation.y) * 10 * dt; 
  } 
}
