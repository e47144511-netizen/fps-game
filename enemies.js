import { scene } from './engine.js';
import { player, damagePlayer } from './player.js';
import { showToast, playSound } from './storage.js';
import { activeClones } from './characters.js';

export const enemies = []; 
export const enemyBullets = []; 
export const allies = [];
export let totalKills = 0; 
export let killstreakCount = 0;

let autoDropCb = null;
export function setAutoDropCallback(cb) { autoDropCb = cb; }

export function resetKillstreak() { 
  killstreakCount = 0; 
  document.getElementById('killstreak-indicator').innerText = '0'; 
}

export function registerKill() {
  totalKills++; 
  killstreakCount++; 
  player.score += 50;
  document.getElementById('kills-total').innerText = totalKills; 
  document.getElementById('killstreak-indicator').innerText = killstreakCount; 
  
  if (killstreakCount >= 5 && !player.shieldUnlocked) { 
    player.shieldUnlocked = true; 
    player.shield = 100; 
    document.getElementById('player-shield').innerText = '100'; 
    playSound(850, 0.5, 'triangle', 0.5); 
    showToast('🛡️ با ۵ کیل پیاپی سپر دفاعی ۱۰۰٪ فعال شد!', '#38bdf8'); 
  }
  if (killstreakCount % 3 === 0 && killstreakCount % 6 !== 0) { 
    document.getElementById('btn-call-crate').style.display = 'flex'; 
    playSound(700, 0.4, 'triangle', 0.4); 
    showToast(`⚡ فلر جعبه هوایی آماده پرتاب است 📦`, '#eab308'); 
  }
  if (killstreakCount > 0 && killstreakCount % 6 === 0) { 
    if (autoDropCb) autoDropCb(); 
    playSound(900, 0.6, 'triangle', 0.6); 
    showToast('🎁 جایزه ۶ کیل! جعبه ویژه از آسمان رها شد!', '#a855f7'); 
  }
}

export function spawnAlliedSoldiers() {
  for (let i = 0; i < 2; i++) { 
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 1.8, 8), 
      new THREE.MeshStandardMaterial({ color: 0x10b981 })
    ); 
    mesh.position.copy(player.pos).add(new THREE.Vector3((i === 0 ? 3 : -3), 0, -2)); 
    scene.add(mesh); 
    allies.push({ mesh, hp: 150, cd: 0.8, dead: false }); 
  }
  playSound(500, 0.3, 'sine', 0.4); 
  showToast('📡 دو سرباز پشتیبان وارد میدان نبرد شدند!', '#10b981');
}

// ----------------------------------------------------
// سیستم مدیریت و کش مدل اختصاصی سه‌بعدی دشمن
// ----------------------------------------------------
let cachedEnemyGLTF = null;

if (window.THREE && window.THREE.GLTFLoader) {
  const loader = new THREE.GLTFLoader();
  loader.load('./enemy.glb', (gltf) => {
    cachedEnemyGLTF = gltf.scene;
    // نرمال‌سازی سایز بر مبنای ابعاد واقعی جعبه محاطی (ارتفاع 1.8 متر)
    const box = new THREE.Box3().setFromObject(cachedEnemyGLTF);
    const size = new THREE.Vector3();
    box.getSize(size);
    const targetHeight = 1.8;
    const scaleFactor = targetHeight / (size.y || 1);
    cachedEnemyGLTF.scale.setScalar(scaleFactor);
  }, undefined, (err) => {
    console.warn("فایل enemy.glb یافت نشد؛ حالت پیش‌فرض اعمال شد.");
  });
}

function createEnemyMesh(tintColor) {
  if (cachedEnemyGLTF) {
    const enemyModel = cachedEnemyGLTF.clone(true);
    enemyModel.traverse((node) => {
      if (node.isMesh && node.material) {
        node.material = node.material.clone();
        if (node.material.color) {
          node.material.color.setHex(tintColor);
        }
      }
    });
    return enemyModel;
  }

  // Fallback تاکتیکی بهینه شده در صورت لود نشدن glb
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.4), new THREE.MeshStandardMaterial({ color: tintColor }));
  body.position.y = 0.9;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
  head.position.y = 1.55;
  grp.add(body, head);
  return grp;
}

export function spawnEnemies() {
  enemies.forEach(e => scene.remove(e.mesh)); 
  enemies.length = 0;

  // اسپاون 4 نیروی هجومی (Rusher)
  for (let i = 0; i < 4; i++) { 
    const mesh = createEnemyMesh(0xef4444);
    mesh.position.set(-25 + i * 16, 0.9, -25); 
    scene.add(mesh); 
    enemies.push({ mesh, type: 'rusher', hp: 70, speed: 4.2, cd: Math.random() * 2, dead: false }); 
  }

  // اسپاون 2 تک‌تیرانداز در ارتفاع (Sniper)
  [[-35, -35], [35, 35]].forEach(([x, z]) => { 
    const mesh = createEnemyMesh(0x8b5cf6);
    mesh.position.set(x, 15, z); 
    scene.add(mesh); 
    enemies.push({ mesh, type: 'sniper', hp: 120, speed: 0, cd: 2.5, dead: false }); 
  });
}

export function updateEnemies(dt) {
  let allDead = true;

  enemies.forEach(e => {
    if (e.dead) return; 
    allDead = false;
    
    let tgtPos = null, tgtDist = 9999;
    if (!player.isInvisible) { 
      tgtPos = player.pos.clone(); 
      tgtDist = player.pos.distanceTo(e.mesh.position); 
    }
    allies.forEach(a => { 
      if (!a.dead) { 
        const d = a.mesh.position.distanceTo(e.mesh.position); 
        if (d < tgtDist) { 
          tgtPos = a.mesh.position; 
          tgtDist = d; 
        } 
      } 
    });
    activeClones.forEach(c => { 
      const d = c.mesh.position.distanceTo(e.mesh.position); 
      if (d < tgtDist) { 
        tgtPos = c.mesh.position; 
        tgtDist = d; 
      } 
    });

    if (!tgtPos) return; 

    const diff = tgtPos.clone().sub(e.mesh.position);
    if (e.type === 'rusher') { 
      if (tgtDist > 3) e.mesh.position.addScaledVector(diff.normalize(), e.speed * dt); 
      e.mesh.lookAt(tgtPos.x, e.mesh.position.y, tgtPos.z); 
      e.cd -= dt; 
      if (e.cd <= 0 && tgtDist < 30) { 
        e.cd = 1.6; 
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff0044 })); 
        b.position.copy(e.mesh.position).add(new THREE.Vector3(0, 1.0, 0)); 
        scene.add(b); 
        enemyBullets.push({ 
          mesh: b, 
          vel: tgtPos.clone().add(new THREE.Vector3(0, -0.3, 0)).sub(b.position).normalize().multiplyScalar(22), 
          life: 3.5 
        }); 
      } 
    } 
    else if (e.type === 'sniper') { 
      e.mesh.lookAt(tgtPos.x, e.mesh.position.y, tgtPos.z); 
      e.cd -= dt; 
      if (e.cd <= 0 && tgtDist < 80) { 
        e.cd = 2.4; 
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff0044 })); 
        b.position.copy(e.mesh.position).add(new THREE.Vector3(0, 1.0, 0)); 
        scene.add(b); 
        enemyBullets.push({ 
          mesh: b, 
          vel: tgtPos.clone().add(new THREE.Vector3(0, -0.3, 0)).sub(b.position).normalize().multiplyScalar(38), 
          life: 3.5 
        }); 
      } 
    }
  });

  allies.forEach(a => {
    if (a.dead) return; 
    const toPlayer = player.pos.clone().sub(a.mesh.position); 
    if (toPlayer.length() > 5) a.mesh.position.addScaledVector(toPlayer.normalize(), 5.0 * dt);
    
    let nE = null, mD = 35; 
    enemies.forEach(e => { 
      if (!e.dead) { 
        const d = a.mesh.position.distanceTo(e.mesh.position); 
        if (d < mD) { 
          mD = d; 
          nE = e; 
        } 
      } 
    });
    if (nE) { 
      a.mesh.lookAt(nE.mesh.position.x, a.mesh.position.y, nE.mesh.position.z); 
      a.cd -= dt; 
      if (a.cd <= 0) { 
        a.cd = 0.5; 
        nE.hp -= 20; 
        nE.mesh.traverse((c) => {
          if (c.isMesh && c.material) {
            c.material.color.setHex(0xffffff);
            setTimeout(() => c.material.color.setHex(nE.type === 'rusher' ? 0xef4444 : 0x8b5cf6), 60);
          }
        });
        if (nE.hp <= 0) { 
          nE.dead = true; 
          scene.remove(nE.mesh); 
          registerKill(); 
        } 
        playSound(750, 0.05, 'sawtooth', 0.15); 
      } 
    }
  });

  if (allDead && enemies.length > 0) { 
    showToast('موج جدید دشمنان در راه است!'); 
    setTimeout(spawnEnemies, 3000); 
  }

  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i]; 
    b.mesh.position.addScaledVector(b.vel, dt); 
    b.life -= dt;
    if (Math.hypot(b.mesh.position.x - player.pos.x, b.mesh.position.z - player.pos.z) < 0.6 && 
        b.mesh.position.y >= player.pos.y - player.currentCamH && 
        b.mesh.position.y <= player.pos.y + 0.2) { 
      damagePlayer(15); 
      scene.remove(b.mesh); 
      enemyBullets.splice(i, 1); 
      continue; 
    }
    if (b.life <= 0) { 
      scene.remove(b.mesh); 
      enemyBullets.splice(i, 1); 
    }
  }
}
