import { camera } from './engine.js';
import { solidObjects, summitCrystal } from './world.js';
import { playSound, showToast } from './storage.js';
import { hook } from './weapons.js';
import { resetKillstreak } from './enemies.js';

export const player = {
  pos: new THREE.Vector3(0, 1.8, 16), vel: new THREE.Vector3(), rotY: 0, rotX: 0,
  hp: 100, maxHp: 100, shield: 0, maxShield: 100, shieldUnlocked: false, score: 0, fuel: 100,
  isGrounded: true, isSliding: false, slideTimer: 0, slideDir: new THREE.Vector3(), currentCamH: 1.8,
  isWallRunning: false, wallNormal: new THREE.Vector3(), wallRunDir: new THREE.Vector3(), wallRunSide: 0.38, camTilt: 0,
  isHoldingJump: false, isDead: false, invincibleTimer: 0,
  baseSpeedMultiplier: 1.0, isInvisible: false
};

const wallRay = new THREE.Raycaster(), footRay = new THREE.Raycaster();

export function damagePlayer(amt) {
  if (player.isDead || player.invincibleTimer > 0) return;
  if (player.shieldUnlocked && player.shield > 0) {
    player.shield -= amt;
    if (player.shield < 0) { player.hp += player.shield; player.shield = 0; }
  } else { player.hp -= amt; }
  
  document.getElementById('player-hp').innerText = Math.max(0, Math.round(player.hp));
  document.getElementById('player-shield').innerText = player.shieldUnlocked ? Math.max(0, Math.round(player.shield)) : 'قفل';
  document.getElementById('damage-overlay').style.opacity = '1'; setTimeout(() => document.getElementById('damage-overlay').style.opacity = '0', 80);
  playSound(120, 0.1, 'sawtooth', 0.25);

  if (player.hp <= 0) {
    player.isDead = true; document.getElementById('respawn-banner').style.display = 'flex';
    resetKillstreak();
    setTimeout(() => {
      player.pos.set(0, 1.8, 16); player.vel.set(0, 0, 0); player.hp = 100; player.shield = 0; player.shieldUnlocked = false; player.fuel = 100;
      document.getElementById('player-hp').innerText = '100'; document.getElementById('player-shield').innerText = 'قفل';
      document.getElementById('respawn-banner').style.display = 'none'; player.isDead = false;
    }, 3000);
  }
}

export function useMedkit() {
  if (player.isDead) return;
  if (player.hp >= player.maxHp && (!player.shieldUnlocked || player.shield >= player.maxShield)) { showToast('جان شما پر است!', '#38bdf8'); return; }
  player.hp = Math.min(player.maxHp, player.hp + 50);
  if (player.shieldUnlocked) player.shield = Math.min(player.maxShield, player.shield + 50);
  document.getElementById('player-hp').innerText = Math.round(player.hp);
  if(player.shieldUnlocked) document.getElementById('player-shield').innerText = Math.round(player.shield);
  playSound(650, 0.2, 'sine', 0.3); showToast('💉 هیل انجام شد!', '#10b981');
}

export function updatePlayer(dt, moveInput) {
  const fw = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotY);
  const rt = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotY);
  
  // رفع مشکل نمایش ارتفاع - فقط در صورت وجود اِلمان اجرا می‌شود
  const heightValEl = document.getElementById('player-height-val');
  if (heightValEl) {
    heightValEl.innerText = Math.max(0, player.pos.y - 1.8).toFixed(1);
  }

  if (player.invincibleTimer > 0) {
    player.invincibleTimer -= dt; document.getElementById('invincible-overlay').style.opacity = '1';
    if (player.invincibleTimer <= 0) { document.getElementById('invincible-overlay').style.opacity = '0'; showToast('اثر سرم آدرنالین تمام شد!', '#f59e0b'); }
  }

  if (summitCrystal) {
    summitCrystal.rotation.y += 0.03;
    if (!hook.unlocked && player.pos.distanceTo(summitCrystal.position) < 3.2) { hook.unlocked = true; document.getElementById('btn-hook').style.display = 'flex'; playSound(800, 0.5, 'triangle', 0.4); showToast('🎉 قله فتح شد! قلاب آزاد گردید 🪝', '#10b981'); }
  }

  if (player.isDead) return;

  let wCheck = null;
  if (!player.isGrounded && !hook.active) {
    const o = player.pos.clone(); o.y -= 0.1; const dirs = [rt.clone(), rt.clone().negate(), new THREE.Vector3(1,0,0), new THREE.Vector3(-1,0,0), new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,-1)];
    for (let d of dirs) { wallRay.set(o, d); wallRay.far = 1.35; const hits = wallRay.intersectObjects(solidObjects, true); if (hits.length > 0 && hits[0].face && Math.abs(hits[0].face.normal.y) < 0.3) { wCheck = { normal: hits[0].face.normal.clone(), dist: hits[0].distance }; break; } }
  }

  if (wCheck && moveInput.y > 0.15) {
    if (!player.isWallRunning) { 
      player.isWallRunning = true; 
      player.wallNormal.copy(wCheck.normal); 
      const tangent = new THREE.Vector3(-wCheck.normal.z, 0, wCheck.normal.x); 
      if (tangent.dot(fw) < 0) tangent.negate(); 
      player.wallRunDir.copy(tangent); 
      const dotRight = rt.dot(wCheck.normal);
      player.wallRunSide = (dotRight < 0) ? 0.45 : -0.45; 
    }
    player.camTilt += (player.wallRunSide - player.camTilt) * 10 * dt;
  } else {
    if (player.isWallRunning) { player.isWallRunning = false; if (moveInput.y <= 0.15) player.vel.y = -18.0; }
    player.camTilt += (0 - player.camTilt) * 10 * dt;
  }

  let targetH = 1.8;
  if (player.isSliding) { player.slideTimer -= dt; targetH = 1.0; player.camTilt += ((moveInput.x * 0.15) - player.camTilt) * 8 * dt; if (player.slideTimer <= 0) player.isSliding = false; }
  player.currentCamH += (targetH - player.currentCamH) * 14 * dt;

  const np = player.pos.clone();
  let currentSpeed = 9.5 * player.baseSpeedMultiplier;
  
  if (player.isWallRunning) { np.addScaledVector(player.wallRunDir, 14.5 * moveInput.y * dt); if (wCheck && wCheck.dist < 0.55) np.addScaledVector(player.wallNormal, (0.55 - wCheck.dist)); player.vel.y = -0.35; }
  else if (player.isSliding) { np.addScaledVector(player.slideDir, (12 * player.baseSpeedMultiplier + player.slideTimer * 12) * dt); }
  else { np.addScaledVector(fw, moveInput.y * currentSpeed * dt); np.addScaledVector(rt, moveInput.x * currentSpeed * dt); }

  if (player.isHoldingJump && !player.isGrounded && player.fuel > 0) { player.vel.y = 10.0; player.fuel = Math.max(0, player.fuel - 45 * dt); playSound(140, 0.05, 'sawtooth', 0.08); }
  else if (!player.isWallRunning) { if (player.isGrounded) { player.fuel = Math.min(100, player.fuel + 40 * dt); } player.vel.y -= 28 * dt; }
  
  const fuelFill = document.getElementById('fuel-bar-fill');
  if (fuelFill) fuelFill.style.width = player.fuel + '%'; 
  np.y += player.vel.y * dt;

  player.isGrounded = false; footRay.set(new THREE.Vector3(np.x, np.y - player.currentCamH + 0.4, np.z), new THREE.Vector3(0, -1, 0)); footRay.far = 0.8; const hits = footRay.intersectObjects(solidObjects, true);
  if (hits.length > 0 && player.vel.y <= 0) { np.y = hits[0].point.y + player.currentCamH; player.vel.y = 0; player.isGrounded = true; } else if (np.y <= player.currentCamH) { np.y = player.currentCamH; player.vel.y = 0; player.isGrounded = true; }
  
  np.x = Math.max(-149, Math.min(149, np.x)); np.z = Math.max(-149, Math.min(149, np.z)); player.pos.copy(np);
  camera.position.set(player.pos.x, player.pos.y - (1.8 - player.currentCamH), player.pos.z); camera.rotation.order = 'YXZ'; camera.rotation.y = player.rotY; camera.rotation.x = player.rotX; camera.rotation.z = player.camTilt;
}