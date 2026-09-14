import { scene, camera, renderer, initEngine, previewScene } from './engine.js';
import { initWorld } from './world.js';
import { player, updatePlayer } from './player.js';
import { updateWeapons, addFireBullets, activateGoldenMag, setWeapon, WEAPONS_DB } from './weapons.js';
import { spawnEnemies, updateEnemies, spawnAlliedSoldiers, enemies, setAutoDropCallback } from './enemies.js';
import { initControls, moveInput, toggleHudEdit } from './controls.js';
import { toggleBuildMode, updateBuilder, initBuilder, isBuildMode } from './builder.js';
import { playSound, showToast } from './storage.js';
import { 
  createHostOffer, 
  connectHost, 
  createJoinAnswer, 
  sendNetworkData, 
  updateNetwork, 
  isMultiplayer, 
  isHost, 
  remotePlayer 
} from './network.js';
import { CHARACTERS_DB, setCharacter, selectedCharacter, updateCharacters } from './characters.js';
import { MAPS_DB, startMapPreview, currentMapId } from './maps.js';

// ==========================================
// 🛠️ سیستم دیباگ ترمینال هوشمند درون بازی
// ==========================================
const dbgConsole = document.getElementById('debug-console');
const dbgContent = document.getElementById('debug-content');
document.getElementById('debug-header')?.addEventListener('click', () => {
  if (dbgConsole) {
    dbgConsole.classList.toggle('minimized');
    dbgConsole.classList.toggle('expanded');
  }
});

function safeStringify(obj) { 
  try { return JSON.stringify(obj); } catch(e) { return String(obj); } 
}

function logToDOM(msg, type) {
  if (!dbgContent) return;
  const el = document.createElement('div');
  el.style.marginBottom = '6px'; 
  el.style.borderBottom = '1px solid rgba(255,255,255,0.1)'; 
  el.style.paddingBottom = '4px';
  el.style.color = type === 'err' ? '#ef4444' : (type === 'warn' ? '#facc15' : '#38bdf8');
  el.textContent = `[${type.toUpperCase()}] ${msg}`;
  dbgContent.appendChild(el);
  dbgContent.scrollTop = dbgContent.scrollHeight;
}

const oLog = console.log, oWarn = console.warn, oErr = console.error;
console.log = (...a) => { oLog(...a); logToDOM(a.map(x => typeof x === 'object' ? safeStringify(x) : x).join(' '), 'log'); };
console.warn = (...a) => { oWarn(...a); logToDOM(a.map(x => typeof x === 'object' ? safeStringify(x) : x).join(' '), 'warn'); };
console.error = (...a) => { oErr(...a); logToDOM(a.map(x => typeof x === 'object' ? safeStringify(x) : x).join(' '), 'err'); };
window.addEventListener('error', e => logToDOM(`${e.message} at ${e.filename}:${e.lineno}`, 'err'));
window.addEventListener('unhandledrejection', e => logToDOM(e.reason, 'err'));

// ==========================================
// مدیریت وضعیت و آغاز بازی
// ==========================================
let gameStarted = false; 
let isMpFlow = false;
export const getGameStarted = () => gameStarted;

setAutoDropCallback(spawnAutoDrop);
initEngine(); 
initControls(getGameStarted, throwCarePackageFlare); 
initBuilder();

let activeCrate = null; 
export const activeFlares = []; 

export function throwCarePackageFlare() {
  const flare = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8), new THREE.MeshStandardMaterial({color: 0xef4444, emissive: 0xff0000}));
  flare.position.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1.0));
  scene.add(flare);
  const vel = camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(15); vel.y += 5;
  activeFlares.push({ mesh: flare, vel: vel, timer: 2.5, landed: false }); playSound(350, 0.2, 'sine', 0.4); showToast('🔴 فلر پرتاب شد!', '#ef4444');
}

export function spawnAutoDrop() { 
  spawnCarePackageAt(new THREE.Vector3(player.pos.x + (Math.random()-0.5)*8, 45, player.pos.z + (Math.random()-0.5)*8)); 
}

function spawnCarePackageAt(targetPos) {
  const crateMesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 1.8), new THREE.MeshStandardMaterial({ color: 0xb45309 }));
  crateMesh.position.set(targetPos.x, 45, targetPos.z); scene.add(crateMesh); activeCrate = { mesh: crateMesh, landed: false }; playSound(250, 0.8, 'sawtooth', 0.4); 
}

document.getElementById('btn-open-crate')?.addEventListener('click', () => {
  if (!activeCrate) return; 
  scene.remove(activeCrate.mesh); activeCrate = null; document.getElementById('crate-prompt').style.display = 'none'; playSound(800, 0.4, 'triangle', 0.5);
  const chosen = ['invincible', 'fire_ammo', 'allies', 'golden_mag'][Math.floor(Math.random() * 4)];
  if (chosen === 'invincible') { player.invincibleTimer = 20; showToast('🌿 آیتم جان‌سخت: ۲۰ ثانیه آسیب‌ناپذیری!', '#10b981'); } 
  else if (chosen === 'fire_ammo') { addFireBullets(5); showToast('🔥 آیتم تیر آتشین: ۵ تیر!', '#ef4444'); } 
  else if (chosen === 'allies') { spawnAlliedSoldiers(); } 
  else { activateGoldenMag(45); showToast('⚜ خشاب طلایی!', '#facc15'); }
});

function hideAllModals() { 
  document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); 
}

// گوش دادن ایمن و سریع به کلیک و لمس روی موبایل
function addSafeClick(id, handler) {
  const el = document.getElementById(id);
  if (!el) return;
  const execute = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handler(e);
  };
  el.addEventListener('pointerdown', execute);
  el.addEventListener('click', execute);
}

// ۱. شروع تک‌نفره
addSafeClick('btn-start-flow-solo', () => { 
  isMpFlow = false; 
  openCharacterSelect(); 
});

// ۲. شروع چندنفره
addSafeClick('btn-start-flow-mp', () => { 
  isMpFlow = true; 
  hideAllModals(); 
  document.getElementById('mp-options-modal').style.display = 'flex'; 
});

// ۳. ایجاد اتاق هاست
addSafeClick('btn-create-offer', () => {
  createHostOffer();
});

// ۴. تایید اتصال هاست
addSafeClick('btn-confirm-host', async () => { 
  await connectHost(); 
  openCharacterSelect(); 
});

// ۵. تولید پاسخ کلاینت (مهمان)
addSafeClick('btn-create-answer', () => { 
  createJoinAnswer(() => {
    openCharacterSelect();
  }); 
});

// ۶. ورود کلاینت به انتخاب کاراکتر
addSafeClick('btn-mp-proceed', () => {
  openCharacterSelect();
});

let chosenCharId = 'clone'; 
function openCharacterSelect() {
  hideAllModals(); 
  document.getElementById('character-select-modal').style.display = 'flex';
  const c = document.getElementById('character-list-container'); 
  c.innerHTML = '';
  
  Object.values(CHARACTERS_DB).forEach(char => {
    const d = document.createElement('div'); 
    d.className = 'select-card'; 
    d.innerHTML = `<div class="card-icon">${char.icon}</div><div class="card-title" style="color: ${char.color};">${char.name}</div><div class="card-desc">${char.desc}</div>`;
    
    const pick = (e) => { 
      e.stopPropagation();
      document.querySelectorAll('#character-list-container .select-card').forEach(x => x.classList.remove('selected')); 
      d.classList.add('selected'); 
      chosenCharId = char.id;
      setCharacter(char.id);
    };
    d.addEventListener('pointerdown', pick);
    d.addEventListener('click', pick);
    c.appendChild(d);
  });
  
  if (c.firstChild) {
    c.firstChild.classList.add('selected');
    chosenCharId = Object.values(CHARACTERS_DB)[0].id;
    setCharacter(chosenCharId);
  }
}

addSafeClick('btn-confirm-character', openWeaponSelect);

let chosenWeaponId = 'rifle'; 
function openWeaponSelect() {
  hideAllModals(); 
  document.getElementById('weapon-select-modal').style.display = 'flex';
  const c = document.getElementById('weapon-list-container'); 
  c.innerHTML = '';
  
  Object.values(WEAPONS_DB).forEach(wpn => {
    const d = document.createElement('div'); 
    d.className = 'select-card'; 
    d.innerHTML = `<div class="card-title" style="color: #f97316;">${wpn.name}</div><div class="card-desc">Dmg: ${wpn.damage}<br>Mag: ${wpn.magSize}<br>Type: ${wpn.id}</div>`;
    
    const pick = (e) => { 
      e.stopPropagation();
      document.querySelectorAll('#weapon-list-container .select-card').forEach(x => x.classList.remove('selected')); 
      d.classList.add('selected'); 
      chosenWeaponId = wpn.id;
      setWeapon(wpn.id);
    };
    d.addEventListener('pointerdown', pick);
    d.addEventListener('click', pick);
    c.appendChild(d);
  });
  
  if (c.firstChild) {
    c.firstChild.classList.add('selected');
    chosenWeaponId = Object.values(WEAPONS_DB)[0].id;
    setWeapon(chosenWeaponId);
  }
}

addSafeClick('btn-confirm-weapon', () => {
  // اگر در حالت چندنفره مهمان هستیم، منتظر مپ انتخاب شده هاست می‌مانیم
  if (isMpFlow && !isHost) {
    startGameSession();
  } else {
    openMapSelect();
  }
});

let chosenMapId = 'maze'; 
function openMapSelect() {
  hideAllModals(); 
  document.getElementById('map-select-modal').style.display = 'flex';
  const c = document.getElementById('map-list-container'); 
  c.innerHTML = '';
  
  Object.values(MAPS_DB).forEach(map => {
    const d = document.createElement('div'); 
    d.className = 'select-card'; 
    d.style.flex = '0 0 120px'; 
    d.innerHTML = `<div class="card-title" style="color: #10b981;">${map.name}</div>`;
    
    const pick = (e) => { 
      e.stopPropagation();
      document.querySelectorAll('#map-list-container .select-card').forEach(x => x.classList.remove('selected')); 
      d.classList.add('selected'); 
      chosenMapId = map.id;
      startMapPreview(map.id); 
    };
    d.addEventListener('pointerdown', pick);
    d.addEventListener('click', pick);
    c.appendChild(d);
  });
  
  if (c.firstChild) {
    c.firstChild.classList.add('selected');
    chosenMapId = Object.values(MAPS_DB)[0].id;
    startMapPreview(chosenMapId);
  }
}

function startGameSession() {
  hideAllModals();
  initWorld(chosenMapId); 
  
  // اسپاون در موقعیت درست
  if (MAPS_DB[chosenMapId] && MAPS_DB[chosenMapId].spawns) {
    const spIdx = (isMultiplayer && !isHost) ? 1 : 0;
    player.pos.copy(MAPS_DB[chosenMapId].spawns[spIdx] || MAPS_DB[chosenMapId].spawns[0]); 
  }

  if (selectedCharacter && selectedCharacter.id === 'speedster') { 
    player.baseSpeedMultiplier = 2.5; 
  }
  
  if (!isMultiplayer) {
    spawnEnemies();
  } else if (isHost) {
    // ارسال اطلاعات هماهنگی اولیه به مهمان
    sendNetworkData({
      t: 'init',
      map: chosenMapId,
      hostSpawnIndex: 0,
      guestSpawnIndex: 1
    });
  }

  gameStarted = true; 
  console.log("GAME STARTED. MAP:", MAPS_DB[chosenMapId]?.name || chosenMapId);
  showToast(`نبرد در نقشه ${MAPS_DB[chosenMapId]?.name || chosenMapId} آغاز شد!`, '#10b981');
}

addSafeClick('btn-confirm-map', startGameSession);

addSafeClick('btn-settings-gear', () => { gameStarted = false; document.getElementById('gear-menu-modal').style.display = 'flex'; });
addSafeClick('gear-btn-hud-edit', () => { document.getElementById('gear-menu-modal').style.display = 'none'; gameStarted = true; toggleHudEdit(true); });
addSafeClick('gear-btn-mode', () => { toggleBuildMode(); document.getElementById('gear-menu-modal').style.display = 'none'; gameStarted = true; });
document.querySelectorAll('.btn-back-menu').forEach(btn => btn.addEventListener('click', () => { document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); gameStarted = true; }));

const clock = new THREE.Clock(); 
let netTimer = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  
  if (!gameStarted) return; 

  updatePlayer(dt, moveInput);
  
  if (!isBuildMode) { 
    updateWeapons(dt); 
    if (!isMultiplayer) {
      updateEnemies(dt); 
    }
    updateCharacters(dt, enemies, { player, scene, camera, enemiesList: enemies }); 
  }
  
  updateBuilder(); 
  updateNetwork(dt);

  if (isMultiplayer) { 
    netTimer += dt; 
    if (netTimer > 0.05) { 
      sendNetworkData({ 
        t: 'm', 
        x: Number(player.pos.x.toFixed(2)), 
        y: Number(player.pos.y.toFixed(2)), 
        z: Number(player.pos.z.toFixed(2)), 
        ry: Number(player.rotY.toFixed(3)),
        sl: player.isSliding ? 1 : 0
      }); 
      netTimer = 0; 
    } 
  }

  for (let i = activeFlares.length - 1; i >= 0; i--) {
    const f = activeFlares[i];
    if (!f.landed) { 
      f.vel.y -= 25 * dt; 
      f.mesh.position.addScaledVector(f.vel, dt); 
      if (f.mesh.position.y <= 0.2) { 
        f.mesh.position.y = 0.2; 
        f.landed = true; 
        playSound(150, 0.2, 'sawtooth', 0.2); 
      } 
    } else { 
      f.timer -= dt; 
      if (f.timer <= 0) { 
        spawnCarePackageAt(f.mesh.position); 
        scene.remove(f.mesh); 
        activeFlares.splice(i, 1); 
      } 
    }
  }

  if (activeCrate) {
    if (!activeCrate.landed) { 
      activeCrate.mesh.position.y -= 12.0 * dt; 
      if (activeCrate.mesh.position.y <= 0.9) { 
        activeCrate.mesh.position.y = 0.9; 
        activeCrate.landed = true; 
        playSound(200, 0.3, 'sawtooth', 0.3); 
      } 
    } else { 
      const dist = player.pos.distanceTo(activeCrate.mesh.position); 
      const promptEl = document.getElementById('crate-prompt'); 
      if (promptEl) promptEl.style.display = (dist < 3.5) ? 'block' : 'none'; 
    }
  }
  
  renderer.render(scene, camera);
}

animate();
              
