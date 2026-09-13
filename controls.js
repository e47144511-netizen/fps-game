import { player, useMedkit } from './player.js';
import { setShootingContinuous, setAimingGrenade, throwGrenade, fireHook, performShoot, switchWeapon, triggerReload } from './weapons.js';
import { initAudio, playSound, showToast } from './storage.js';
import { camera, scene } from './engine.js';
import { sendNetworkData } from './network.js';
import { useAbility } from './characters.js';

export const moveInput = { x: 0, y: 0 }; 
let isADS = false, isHudEditing = false, selHud = null;

export function toggleHudEdit(s) {
  isHudEditing = s; 
  const bar = document.getElementById('hud-size-slider-bar'); 
  if(bar) bar.style.display = s ? 'flex' : 'none';
  document.querySelectorAll('.hud-draggable').forEach(el => el.classList.toggle('edit-active', s));
  showToast(s ? 'ویرایش دکمه‌ها فعال شد' : 'تنظیمات ذخیره شد', '#8b5cf6');
}

export function initControls(getStarted, onCallCrate) {
  const joyZone = document.getElementById('joystick-zone'), joyKnob = document.getElementById('joystick-knob'), hudSlider = document.getElementById('slider-btn-size');
  let joyId = null, joyCenter = { x: 0, y: 0 };

  document.querySelectorAll('.hud-draggable').forEach(el => {
    let dId = null, sX = 0, sY = 0, iL = 0, iT = 0;
    el.addEventListener('pointerdown', e => { if (!isHudEditing) return; e.stopPropagation(); selHud = el; if(hudSlider) hudSlider.value = el.offsetWidth; dId = e.pointerId; sX = e.clientX; sY = e.clientY; const r = el.getBoundingClientRect(); iL = r.left; iT = r.top; el.style.left = iL+'px'; el.style.top = iT+'px'; el.style.right = 'auto'; el.style.bottom = 'auto'; });
    window.addEventListener('pointermove', e => { if (isHudEditing && e.pointerId === dId) { el.style.left = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, iL + (e.clientX - sX)))+'px'; el.style.top = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, iT + (e.clientY - sY)))+'px'; } });
    window.addEventListener('pointerup', e => { if (e.pointerId === dId) dId = null; });
  });
  if(hudSlider) hudSlider.addEventListener('input', () => { if(selHud) { selHud.style.width = hudSlider.value+'px'; selHud.style.height = hudSlider.value+'px'; } });
  document.getElementById('btn-save-hud')?.addEventListener('click', () => toggleHudEdit(false));

  if(joyZone) {
    joyZone.addEventListener('pointerdown', e => { if (!getStarted() || player.isDead || isHudEditing) return; initAudio(); joyId = e.pointerId; const r = joyZone.getBoundingClientRect(); joyCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    window.addEventListener('pointermove', e => { if (e.pointerId === joyId && getStarted() && !player.isDead && !isHudEditing) { const dx = e.clientX - joyCenter.x, dy = e.clientY - joyCenter.y, max = joyZone.offsetWidth / 2 - 5, dist = Math.min(max, Math.hypot(dx, dy)), ang = Math.atan2(dy, dx); joyKnob.style.transform = `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist}px)`; moveInput.x = (Math.cos(ang) * dist) / max; moveInput.y = -(Math.sin(ang) * dist) / max; } });
    const resetJoy = e => { if (e.pointerId === joyId) { joyId = null; moveInput.x = 0; moveInput.y = 0; joyKnob.style.transform = `translate(0px, 0px)`; } }; 
    window.addEventListener('pointerup', resetJoy); window.addEventListener('pointercancel', resetJoy);
  }

  let lookId = null, lX = 0, lY = 0;
  document.getElementById('touch-look-zone')?.addEventListener('pointerdown', e => { if (!getStarted() || player.isDead || isHudEditing) return; initAudio(); lookId = e.pointerId; lX = e.clientX; lY = e.clientY; });
  window.addEventListener('pointermove', e => { if (e.pointerId === lookId && getStarted() && !player.isDead && !isHudEditing) { player.rotY -= (e.clientX - lX) * (isADS ? 0.002 : 0.005); player.rotX = Math.max(-1.4, Math.min(1.4, player.rotX - (e.clientY - lY) * (isADS ? 0.002 : 0.005))); lX = e.clientX; lY = e.clientY; } });
  window.addEventListener('pointerup', e => { if (e.pointerId === lookId) lookId = null; });

  document.getElementById('btn-jump')?.addEventListener('pointerdown', () => { if (player.isDead || !getStarted() || isHudEditing) return; player.isHoldingJump = true; if (player.isWallRunning) { player.vel.y = 13.5; const pushAway = player.wallNormal.clone().multiplyScalar(16); player.vel.x = pushAway.x; player.vel.z = pushAway.z; player.isWallRunning = false; playSound(440, 0.1, 'triangle', 0.25); } else if (player.isGrounded) { player.vel.y = 14.2; player.isGrounded = false; playSound(300, 0.1, 'square', 0.15); } });
  const stopJump = () => player.isHoldingJump = false; 
  document.getElementById('btn-jump')?.addEventListener('pointerup', stopJump); 
  document.getElementById('btn-jump')?.addEventListener('pointercancel', stopJump);

  document.getElementById('btn-slide')?.addEventListener('pointerdown', () => { if (player.isDead || !getStarted() || !player.isGrounded || isHudEditing) return; player.isSliding = true; player.slideTimer = 0.95; const fw = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotY), rt = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotY); player.slideDir.copy(fw).multiplyScalar(moveInput.y || 1).addScaledVector(rt, moveInput.x).normalize(); playSound(200, 0.2, 'sawtooth', 0.2); });

  const btnShoot = document.getElementById('btn-shoot');
  btnShoot?.addEventListener('pointerdown', () => { if (!getStarted() || player.isDead || isHudEditing) return; setShootingContinuous(true); performShoot(); sendNetworkData({ t: 's' }); });
  const stopShoot = () => setShootingContinuous(false); btnShoot?.addEventListener('pointerup', stopShoot); btnShoot?.addEventListener('pointercancel', stopShoot);

  const btnGrenade = document.getElementById('btn-grenade');
  btnGrenade?.addEventListener('pointerdown', () => { if (!getStarted() || player.isDead || isHudEditing) return; setAimingGrenade(true); });
  btnGrenade?.addEventListener('pointerup', () => { if (isHudEditing) return; setAimingGrenade(false); throwGrenade(); });
  btnGrenade?.addEventListener('pointercancel', () => setAimingGrenade(false));

  document.getElementById('btn-hook')?.addEventListener('pointerdown', () => { if (!isHudEditing) fireHook(); });
  document.getElementById('btn-heal')?.addEventListener('pointerdown', () => { if (!isHudEditing && getStarted()) useMedkit(); });
  
  // رفع مشکل با دریافت Callback به جای Import
  document.getElementById('btn-call-crate')?.addEventListener('pointerdown', () => { 
    if (!isHudEditing && getStarted()) { 
      if (onCallCrate) onCallCrate(); 
      document.getElementById('btn-call-crate').style.display = 'none'; 
    } 
  });

  document.getElementById('btn-ability')?.addEventListener('pointerdown', () => { 
    if (!isHudEditing && getStarted() && !player.isDead) {
      useAbility({ player, scene, camera }); 
    }
  });

  document.getElementById('btn-ads')?.addEventListener('pointerdown', () => { if (!getStarted() || player.isDead || isHudEditing) return; isADS = !isADS; camera.fov = isADS ? 42 : 72; camera.updateProjectionMatrix(); playSound(isADS ? 650 : 500, 0.05, 'triangle', 0.15); });
  document.getElementById('weapon-switch-btn')?.addEventListener('pointerdown', () => { if (!getStarted() || player.isDead) return; switchWeapon(); });
  document.getElementById('btn-reload')?.addEventListener('pointerdown', () => { if (!getStarted() || player.isDead || isHudEditing) return; triggerReload(); });
}
