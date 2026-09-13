let audioCtx = null;
export function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}
export function playSound(f, d, t='sine', v=0.2) {
  if (!audioCtx) return;
  try {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = t; o.frequency.value = f; g.gain.value = v;
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + d);
  } catch(e){}
}
export function showToast(text, color='#0284c7') {
  const t = document.getElementById('status-toast');
  if(!t) return;
  t.innerText = text; t.style.background = color; t.style.opacity = '1';
  setTimeout(() => t.style.opacity = '0', 1800);
}