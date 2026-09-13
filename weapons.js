import { scene, camera } from './engine.js';
import { solidObjects } from './world.js';
import { player, damagePlayer } from './player.js';
import { enemies, registerKill } from './enemies.js';
import { playSound, showToast } from './storage.js';

export const WEAPONS_DB = {
  rifle: { id: 'rifle', name: 'M4 Assault', magSize: 30, fireRate: 0.11, range: 85, damage: 34, recoilCam: 0.005, pellets: 1, spread: 0.012, reloadTime: 1.4, sound: 800, color: 0x334155 },
  smg: { id: 'smg', name: 'Uzi SMG', magSize: 40, fireRate: 0.065, range: 45, damage: 20, recoilCam: 0.002, pellets: 1, spread: 0.025, reloadTime: 1.1, sound: 950, color: 0x1e293b },
  shotgun: { id: 'shotgun', name: 'Combat Shotgun', magSize: 8, fireRate: 0.70, range: 25, damage: 22, recoilCam: 0.04, pellets: 8, spread: 0.09, reloadTime: 2.2, sound: 320, color: 0x475569 },
  sniper: { id: 'sniper', name: 'Heavy Sniper', magSize: 5, fireRate: 1.3, range: 200, damage: 95, recoilCam: 0.08, pellets: 1, spread: 0.001, reloadTime: 2.5, sound: 250, color: 0x0f172a },
  pistol: { id: 'pistol', name: 'Tactical Pistol', magSize: 12, fireRate: 0.2, range: 40, damage: 25, recoilCam: 0.008, pellets: 1, spread: 0.015, reloadTime: 1.0, sound: 1100, color: 0x94a3b8 },
  lmg: { id: 'lmg', name: 'LMG Drum', magSize: 100, fireRate: 0.09, range: 75, damage: 30, recoilCam: 0.007, pellets: 1, spread: 0.03, reloadTime: 4.0, sound: 600, color: 0x1e293b },
  burst: { id: 'burst', name: 'Burst Rifle', magSize: 24, fireRate: 0.4, range: 80, damage: 28, recoilCam: 0.004, pellets: 1, spread: 0.01, reloadTime: 1.6, sound: 850, color: 0x475569, isBurst: true },
  tactical: { id: 'tactical', name: 'Bullpup T.R', magSize: 20, fireRate: 0.15, range: 60, damage: 45, recoilCam: 0.01, pellets: 1, spread: 0.005, reloadTime: 1.5, sound: 750, color: 0x0284c7 }
};

export let currentWeapon = { ...WEAPONS_DB['rifle'], currentAmmo: WEAPONS_DB['rifle'].magSize };
export let fireBulletsRemaining = 0, goldenMagTimer = 0, isShootingContinuous = false, isReloading = false, grenadeCount = 5, gunRecoilCurrent = 0, lastShotTime = 0, isAimingGrenade = false, isBursting = false;

export function setWeapon(id) {
  if(WEAPONS_DB[id]) {
    currentWeapon = { ...WEAPONS_DB[id], currentAmmo: WEAPONS_DB[id].magSize };
    buildWeaponMesh(id); updateAmmoUI();
  }
}

export const gunGroup = new THREE.Group();
let currentGunMesh = null;
camera.add(gunGroup);

function buildWeaponMesh(id) {
  if (currentGunMesh) gunGroup.remove(currentGunMesh);
  currentGunMesh = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: currentWeapon.color, roughness: 0.6 });
  const w = currentWeapon.id;

  if (w === 'rifle' || w === 'burst') {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.6), mat);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.12), mat); m.position.set(0, -0.15, -0.1);
    currentGunMesh.add(b, m);
  } else if (w === 'smg') {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.35), mat);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, 0.08), mat); m.position.set(0, -0.15, 0);
    currentGunMesh.add(b, m);
  } else if (w === 'shotgun') {
    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), mat); b1.rotation.x = Math.PI/2; b1.position.x = -0.05;
    const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), mat); b2.rotation.x = Math.PI/2; b2.position.x = 0.05;
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.25), mat); s.position.z = 0.2;
    currentGunMesh.add(b1, b2, s);
  } else if (w === 'sniper') {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.95), mat);
    const sc = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.35), new THREE.MeshStandardMaterial({color: 0x000})); sc.position.set(0, 0.12, -0.1);
    currentGunMesh.add(b, sc);
  } else if (w === 'pistol') {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.25), mat);
    const g = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.08), mat); g.position.set(0, -0.12, 0.05); g.rotation.x = -0.2;
    currentGunMesh.add(b, g);
  } else if (w === 'lmg') {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.7), mat);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.16, 16), mat); drum.rotation.z = Math.PI/2; drum.position.set(0, -0.15, -0.1);
    currentGunMesh.add(b, drum);
  } else if (w === 'tactical') {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.55), mat);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.12), mat); m.position.set(0, -0.15, 0.15); // Bullpup
    currentGunMesh.add(b, m);
  }
  
  currentGunMesh.position.set(0.28, -0.28, -0.55);
  gunGroup.add(currentGunMesh);
}

export function updateAmmoUI() { document.getElementById('weapon-name-chip').innerText = currentWeapon.name; const ind = document.getElementById('ammo-indicator'); if (isReloading) { ind.innerText = "لودینگ"; ind.style.color = "#ef4444"; } else { ind.innerText = `${currentWeapon.currentAmmo}/${currentWeapon.magSize}`; ind.style.color = fireBulletsRemaining > 0 ? "#f97316" : "#38bdf8"; } }
export function triggerReload() { 
  if (isReloading || isBursting || currentWeapon.currentAmmo === currentWeapon.magSize) return; 
  isReloading = true; updateAmmoUI(); playSound(260, 0.3, 'sawtooth', 0.25); 
  const rTime = (currentWeapon.reloadTime * 1000) / player.baseSpeedMultiplier; // Speedster buff
  setTimeout(() => { currentWeapon.currentAmmo = currentWeapon.magSize; isReloading = false; updateAmmoUI(); playSound(520, 0.12, 'sine', 0.25); }, rTime * (goldenMagTimer > 0 ? 0.4 : 1.0)); 
}

function executeSingleShot(onHitNetwork = null) {
  if (currentWeapon.currentAmmo <= 0) return false;
  currentWeapon.currentAmmo--; let isFB = false, dmgM = 1.0; if (fireBulletsRemaining > 0) { fireBulletsRemaining--; isFB = true; dmgM = 2.5; } updateAmmoUI();
  gunRecoilCurrent = 0.08; player.rotX = Math.min(1.4, player.rotX + currentWeapon.recoilCam); document.getElementById('flash').style.opacity = '1'; setTimeout(() => document.getElementById('flash').style.opacity = '0', 40); playSound(isFB ? 950 : currentWeapon.sound, 0.08, 'sawtooth', 0.3);

  const startPos = camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1.0)), eMeshes = enemies.filter(e => !e.dead).map(e => e.mesh), hCands = [...eMeshes, ...solidObjects];
  for (let p = 0; p < currentWeapon.pellets; p++) {
    shootRay.setFromCamera(new THREE.Vector2((Math.random() - 0.5) * currentWeapon.spread, (Math.random() - 0.5) * currentWeapon.spread), camera); shootRay.far = currentWeapon.range;
    const hits = shootRay.intersectObjects(hCands, true); let tp = camera.position.clone().add(shootRay.ray.direction.clone().multiplyScalar(currentWeapon.range));
    if (hits.length > 0) { tp = hits[0].point; const en = enemies.find(e => !e.dead && (e.mesh === hits[0].object || e.mesh.children.includes(hits[0].object))); if (en) { en.hp -= (currentWeapon.damage * dmgM); hits[0].object.material.color.setHex(0xffffff); setTimeout(() => hits[0].object.material.color.setHex(en.type === 'rusher' ? 0xef4444 : 0x8b5cf6), 80); if (en.hp <= 0) { en.dead = true; scene.remove(en.mesh); registerKill(); } } else if (onHitNetwork) onHitNetwork(hits[0].object); }
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(isFB ? 0.04 : 0.02, isFB ? 0.04 : 0.02, Math.min(startPos.distanceTo(tp), 2.5)), new THREE.MeshBasicMaterial({ color: isFB ? 0xf97316 : 0xfacc15 })); tr.position.copy(startPos); const dir = tp.clone().sub(startPos).normalize(); tr.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); scene.add(tr); visualBullets.push({ mesh: tr, vel: dir.multiplyScalar(120), life: 1.0 });
  }
  return true;
}

export function performShoot(onHitNetwork = null) {
  if (player.isDead || isReloading || isBursting) return; 
  if (currentWeapon.currentAmmo <= 0) { playSound(200, 0.05, 'square'); triggerReload(); return; }
  
  if (currentWeapon.isBurst) {
    isBursting = true; let burstShots = 0;
    const burstInterval = setInterval(() => {
      if (burstShots >= 3 || !executeSingleShot(onHitNetwork)) { clearInterval(burstInterval); isBursting = false; if (currentWeapon.currentAmmo === 0) triggerReload(); }
      burstShots++;
    }, 100);
  } else {
    executeSingleShot(onHitNetwork);
    if (currentWeapon.currentAmmo === 0) setTimeout(triggerReload, 100);
  }
}

export function addFireBullets(c = 5) { fireBulletsRemaining += c; showToast(`🔥 ۵ تیر آتشین!`, '#f97316'); }
export function activateGoldenMag(d = 45) { goldenMagTimer = d; showToast(`⚜️ خشاب طلایی فعال شد!`, '#facc15'); }
export function setShootingContinuous(s) { isShootingContinuous = s; }
export function setAimingGrenade(s) { isAimingGrenade = s; if(!s) trajLine.visible = false; }
export function throwGrenade() { if (player.isDead) return; if (grenadeCount <= 0) return showToast('بمب تمام شده است!', '#ef4444'); grenadeCount--; document.getElementById('grenade-indicator').innerText = grenadeCount; const gM = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshStandardMaterial({ color: 0x166534 })); const fw = camera.getWorldDirection(new THREE.Vector3()); gM.position.copy(camera.position).add(fw.clone().multiplyScalar(0.8)); scene.add(gM); const tv = fw.clone().multiplyScalar(18); tv.y += 4.8; thrownGrenades.push({ mesh: gM, vel: tv, fuse: 1.8 }); playSound(350, 0.1, 'triangle', 0.3); }

// ==========================================
// توابع گمشده برای کنترل‌ها (اضافه شد)
// ==========================================
export function switchWeapon() {
  const keys = Object.keys(WEAPONS_DB);
  const currentIdx = keys.indexOf(currentWeapon.id);
  const nextIdx = (currentIdx + 1) % keys.length;
  setWeapon(keys[nextIdx]);
  playSound(300, 0.1, 'sine', 0.2);
}

export function fireHook() {
  if (!hook.unlocked || player.isDead) {
    if(!hook.unlocked) showToast('اول باید قله را فتح کنید!', '#ef4444');
    return;
  }
  const fw = camera.getWorldDirection(new THREE.Vector3());
  shootRay.set(camera.position, fw);
  shootRay.far = 45;
  const hits = shootRay.intersectObjects(solidObjects, true);
  if (hits.length > 0) {
    hook.target.copy(hits[0].point);
    hook.active = true;
    playSound(400, 0.1, 'square', 0.3);
  } else {
    showToast('هدف خیلی دور است!', '#ef4444');
  }
}
// ==========================================

export const hook = { active: false, target: new THREE.Vector3(), speed: 36.0, unlocked: false };
const hookLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 3 })); hookLine.visible = false; scene.add(hookLine);
const trajPts = Array.from({length:25}, ()=>new THREE.Vector3()); const trajGeo = new THREE.BufferGeometry().setFromPoints(trajPts); const trajLine = new THREE.Line(trajGeo, new THREE.LineDashedMaterial({color:0x22c55e, dashSize:0.3, gapSize:0.2, linewidth:2})); trajLine.visible = false; scene.add(trajLine);
const visualBullets = [], thrownGrenades = [], explosions = [], shootRay = new THREE.Raycaster();

export function updateWeapons(dt) {
  if (currentGunMesh) { currentGunMesh.position.y = -0.28 + (player.isSliding ? 0.12 : 0); currentGunMesh.position.z = -0.55 + gunRecoilCurrent; gunRecoilCurrent = Math.max(0, gunRecoilCurrent - 2.5 * dt); }
  if (goldenMagTimer > 0) goldenMagTimer -= dt; const now = performance.now() / 1000; if (isShootingContinuous && !currentWeapon.isBurst && now - lastShotTime >= (goldenMagTimer > 0 ? currentWeapon.fireRate * 0.75 : currentWeapon.fireRate)) { performShoot(); lastShotTime = now; }
  
  if (isAimingGrenade && !player.isDead && grenadeCount > 0) { trajLine.visible = true; const fw = camera.getWorldDirection(new THREE.Vector3()), stP = camera.position.clone().add(fw.clone().multiplyScalar(0.8)), v = fw.clone().multiplyScalar(18); v.y += 4.8; const sP = stP.clone(), sV = v.clone(), pts = []; for (let i = 0; i < 25; i++) { pts.push(sP.clone()); sV.y -= 22 * 0.06; sP.addScaledVector(sV, 0.06); if (sP.y < 0.2) { sP.y = 0.2; break; } } while (pts.length < 25) pts.push(pts[pts.length - 1]); trajGeo.setFromPoints(pts); trajLine.computeLineDistances(); } else trajLine.visible = false;

  if (hook.active) { player.isWallRunning = false; player.isGrounded = false; const toT = hook.target.clone().sub(player.pos); hookLine.geometry.setFromPoints([player.pos.clone().add(new THREE.Vector3(0, -0.2, 0)), hook.target]); if (toT.length() > 1.8) { player.pos.addScaledVector(toT.normalize(), hook.speed * dt); player.vel.set(0, 0, 0); } else { hook.active = false; hookLine.visible = false; player.vel.set(toT.x * 6, 9.5, toT.z * 6); playSound(320, 0.1, 'sine', 0.2); } }
  
  for (let i = thrownGrenades.length - 1; i >= 0; i--) { const g = thrownGrenades[i]; g.vel.y -= 22 * dt; g.mesh.position.addScaledVector(g.vel, dt); g.fuse -= dt; if (g.mesh.position.y <= 0.25) { g.mesh.position.y = 0.25; g.vel.y *= -0.45; g.vel.x *= 0.7; g.vel.z *= 0.7; } if (g.fuse <= 0) { playSound(110, 0.45, 'sawtooth', 0.45); const ex = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 10), new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.9 })); ex.position.copy(g.mesh.position); scene.add(ex); explosions.push({ mesh: ex, scale: 0.5, maxRad: 8.5, opacity: 0.9 }); if (player.pos.distanceTo(g.mesh.position) < 8.5) damagePlayer(Math.round((1 - player.pos.distanceTo(g.mesh.position) / 8.5) * 60)); enemies.forEach(e => { if (!e.dead && e.mesh.position.distanceTo(g.mesh.position) < 8.5) { e.hp -= Math.round((1 - e.mesh.position.distanceTo(g.mesh.position) / 8.5) * 140); if (e.hp <= 0) { e.dead = true; scene.remove(e.mesh); registerKill(); } } }); scene.remove(g.mesh); thrownGrenades.splice(i, 1); } }
  for (let i = explosions.length - 1; i >= 0; i--) { const ex = explosions[i]; ex.scale += (ex.maxRad - ex.scale) * 14 * dt; ex.opacity -= 1.8 * dt; ex.mesh.scale.setScalar(ex.scale); ex.mesh.material.opacity = Math.max(0, ex.opacity); if (ex.opacity <= 0) { scene.remove(ex.mesh); explosions.splice(i, 1); } }
  for (let i = visualBullets.length - 1; i >= 0; i--) { const v = visualBullets[i]; v.mesh.position.addScaledVector(v.vel, dt); v.life -= dt; if (v.life <= 0) { scene.remove(v.mesh); visualBullets.splice(i, 1); } }
}
