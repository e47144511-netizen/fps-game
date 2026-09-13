import { showToast, playSound } from './storage.js';
import { solidObjects } from './world.js';
import { MAPS_DB, currentMapId } from './maps.js';

export const activeClones = [];
export const activeTraps = [];
export const activeDrones = [];
let abilityCooldown = 0;

// تابع ساخت مدل سه‌بعدی تاکتیکی برای کاراکترها (استفاده در کلون‌ها و شبکه)
export function createTacticalCharacter(primaryColor) {
  const grp = new THREE.Group();
  const matPrimary = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.7 });
  const matDark = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
  const matSkin = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.5 });

  // Body & Tactical Vest
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.35), matPrimary); body.position.y = 1.05;
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.4), matDark); vest.position.y = 1.1;
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.2), matDark); backpack.position.set(0, 1.1, 0.25);
  
  // Head & Helmet
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), matSkin); head.position.y = 1.55;
  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.15, 0.28), matDark); helmet.position.y = 1.65;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.29), new THREE.MeshStandardMaterial({color: 0x0f172a})); visor.position.y = 1.58;

  // Arms & Legs
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.15), matPrimary); armL.position.set(-0.35, 1.0, 0);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.15), matPrimary); armR.position.set(0.35, 1.0, 0);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), matDark); legL.position.set(-0.15, 0.35, 0);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), matDark); legR.position.set(0.15, 0.35, 0);

  // Weapon Mockup for Character
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.6), new THREE.MeshStandardMaterial({color: 0x334155}));
  gun.position.set(0.35, 0.9, -0.2);

  grp.add(body, vest, backpack, head, helmet, visor, armL, armR, legL, legR, gun);
  return grp;
}

export const CHARACTERS_DB = {
  clone: { id: 'clone', name: 'Clone', icon: '🪞', color: '#a855f7', desc: '5 کلون فریبنده و متحرک می‌سازد.',
    activate: (ctx) => {
      const angles = [-60, -30, 0, 30, 60];
      angles.forEach(deg => {
        const rad = (deg * Math.PI) / 180; const rot = ctx.player.rotY + rad;
        const grp = createTacticalCharacter(0xa855f7); // رنگ بنفش برای کلون
        
        const dir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
        grp.position.copy(ctx.player.pos).add(dir.multiplyScalar(3)); 
        grp.position.y = ctx.player.pos.y - 1.8; 
        grp.rotation.y = rot;
        
        ctx.scene.add(grp);
        activeClones.push({ mesh: grp, dir: dir, life: 8.0, scene: ctx.scene, shootTimer: 0 });
      });
      abilityCooldown = 20.0;
    }
  },
  stonewall: { id: 'stonewall', name: 'Stonewall', icon: '🛡️', color: '#3b82f6', desc: 'سنگر استوانه‌ای ضد گلوله نصب می‌کند.',
    activate: (ctx) => {
      // ارتقای گرافیک سپر به حالت تکنولوژیک
      const geo = new THREE.CylinderGeometry(3, 3, 3, 16, 1, true, -Math.PI * 0.55, Math.PI * 1.1);
      const mat = new THREE.MeshStandardMaterial({color: 0x3b82f6, side: THREE.DoubleSide, transparent: true, opacity: 0.8, metalness: 0.8, wireframe: false});
      const mesh = new THREE.Mesh(geo, mat);
      
      const frameGeo = new THREE.CylinderGeometry(3.1, 3.1, 0.2, 16, 1, true, -Math.PI * 0.55, Math.PI * 1.1);
      const frameMat = new THREE.MeshStandardMaterial({color: 0x0f172a, side: THREE.DoubleSide});
      const frameTop = new THREE.Mesh(frameGeo, frameMat); frameTop.position.y = 1.5;
      const frameBot = new THREE.Mesh(frameGeo, frameMat); frameBot.position.y = -1.5;
      mesh.add(frameTop, frameBot);

      const fw = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), ctx.player.rotY);
      mesh.position.copy(ctx.player.pos).add(fw.multiplyScalar(2.0)); mesh.position.y = ctx.player.pos.y - 0.3; mesh.rotation.y = ctx.player.rotY;
      ctx.scene.add(mesh); solidObjects.push(mesh);
      setTimeout(() => { ctx.scene.remove(mesh); solidObjects.splice(solidObjects.indexOf(mesh), 1); }, 15000);
      abilityCooldown = 25.0;
    }
  },
  trapper: { id: 'trapper', name: 'Trapper', icon: '🪤', color: '#f97316', desc: 'هر 20 ثانیه مین مجاورتی روی زمین قرار می‌دهد.',
    activate: (ctx) => {
      // ارتقای مدل مین تاکتیکی
      const grp = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.1, 8), new THREE.MeshStandardMaterial({color: 0x1e293b}));
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshStandardMaterial({color: 0xef4444, emissive: 0xff0000, emissiveIntensity: 1.0}));
      led.position.y = 0.05;
      grp.add(base, led);
      
      grp.position.copy(ctx.player.pos); grp.position.y -= 1.75; ctx.scene.add(grp);
      activeTraps.push({ mesh: grp, active: true, scene: ctx.scene, led: led });
      abilityCooldown = 20.0;
    }
  },
  speedster: { id: 'speedster', name: 'Speedster', icon: '⚡', color: '#eab308', desc: 'قابلیت دائمی: سرعت حرکت و ریلود بسیار بالا.',
    activate: (ctx) => { showToast('سرعتی نیازی به کلیک ندارد (دائمی است)', '#eab308'); }
  },
  teleporter: { id: 'teleporter', name: 'Teleporter', icon: '🌀', color: '#06b6d4', desc: 'تلپورت در مسیر نگاه تا فاصله مجاز امن.',
    activate: (ctx) => {
      const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(0,0), ctx.camera); ray.far = 30;
      const hits = ray.intersectObjects(solidObjects, true);
      let t = ctx.camera.position.clone().add(ray.ray.direction.clone().multiplyScalar(30));
      if (hits.length > 0) t = hits[0].point.clone().add(ray.ray.direction.clone().multiplyScalar(-1.5));
      ctx.player.pos.set(t.x, Math.max(1.8, t.y), t.z);
      playSound(300, 0.2, 'square', 0.4);
      abilityCooldown = 20.0;
    }
  },
  drone_caller: { id: 'drone_caller', name: 'Drone', icon: '🛰️', color: '#10b981', desc: 'پهپاد رزمی دنبال‌کننده با ۲ اسلحه.',
    activate: (ctx) => {
      // ارتقای گرافیک Drone به یک کوادکوپتر جنگی
      const grp = new THREE.Group();
      const matBody = new THREE.MeshStandardMaterial({color: 0x1e293b});
      const matGlow = new THREE.MeshStandardMaterial({color: 0x10b981, emissive: 0x10b981});
      
      const core = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.6), matBody);
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.65), matGlow);
      const prop1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 8), new THREE.MeshStandardMaterial({color: 0x000})); prop1.position.set(0.3, 0.1, 0.3);
      const prop2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 8), new THREE.MeshStandardMaterial({color: 0x000})); prop2.position.set(-0.3, 0.1, -0.3);
      const prop3 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 8), new THREE.MeshStandardMaterial({color: 0x000})); prop3.position.set(0.3, 0.1, -0.3);
      const prop4 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 8), new THREE.MeshStandardMaterial({color: 0x000})); prop4.position.set(-0.3, 0.1, 0.3);
      const gunL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4), matBody); gunL.rotation.x = Math.PI/2; gunL.position.set(-0.2, -0.15, -0.3);
      const gunR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4), matBody); gunR.rotation.x = Math.PI/2; gunR.position.set(0.2, -0.15, -0.3);
      
      grp.add(core, eye, prop1, prop2, prop3, prop4, gunL, gunR);
      grp.position.copy(ctx.player.pos); grp.position.y += 3.5;
      
      ctx.scene.add(grp); activeDrones.push({ mesh: grp, life: 15.0, cd: 0, scene: ctx.scene, p: ctx.player, props: [prop1, prop2, prop3, prop4] });
      abilityCooldown = 30.0;
    }
  },
  silencer: { id: 'silencer', name: 'Silencer', icon: '🔇', color: '#64748b', desc: '5 ثانیه کاملاً نامرئی + سرعت فوق‌العاده.',
    activate: (ctx) => {
      ctx.player.isInvisible = true; ctx.player.baseSpeedMultiplier = 2.5;
      setTimeout(() => { ctx.player.isInvisible = false; ctx.player.baseSpeedMultiplier = 1.0; showToast('نامرئی تمام شد', '#64748b'); }, 5000);
      abilityCooldown = 25.0;
    }
  },
  rewind: { id: 'rewind', name: 'Rewind', icon: '🔄', color: '#f43f5e', desc: 'تلپورت به دورترین نقطه امن از تمام دشمنان.',
    activate: (ctx) => {
      const map = MAPS_DB[currentMapId]; let best = new THREE.Vector3(), maxD = -1;
      for(let i=0; i<50; i++) {
        let tp = new THREE.Vector3((Math.random()-0.5)*map.size, 1.8, (Math.random()-0.5)*map.size);
        let minE = 9999;
        ctx.enemiesList.forEach(e => { if(!e.dead){ let d = e.mesh.position.distanceTo(tp); if(d<minE) minE=d; } });
        if(minE > maxD) { maxD = minE; best.copy(tp); }
      }
      ctx.player.pos.copy(best); playSound(600, 0.3, 'sine', 0.4);
      abilityCooldown = 20.0;
    }
  }
};

export let selectedCharacter = CHARACTERS_DB['clone'];
export function setCharacter(id) { if(CHARACTERS_DB[id]) selectedCharacter = CHARACTERS_DB[id]; }

export function useAbility(ctx) {
  if (abilityCooldown > 0) return showToast(`کمی صبر کنید... (${Math.ceil(abilityCooldown)}s)`, '#ef4444');
  if (selectedCharacter && selectedCharacter.activate) selectedCharacter.activate(ctx);
  const btn = document.getElementById('btn-ability'); if(btn) btn.classList.add('used');
}

export function updateCharacters(dt, enemiesList, ctx) {
  if (abilityCooldown > 0) {
    abilityCooldown -= dt;
    if(abilityCooldown <= 0) { const btn = document.getElementById('btn-ability'); if(btn) btn.classList.remove('used'); }
  }

  for (let i = activeClones.length - 1; i >= 0; i--) {
    const c = activeClones[i]; c.life -= dt;
    c.mesh.position.addScaledVector(c.dir, 4.0 * dt); 
    c.mesh.position.y = (ctx.player.pos.y - 1.8) + Math.abs(Math.sin(Date.now()*0.01))*0.15; 
    
    c.shootTimer -= dt;
    if(c.shootTimer <= 0) {
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 10), new THREE.MeshBasicMaterial({color: 0xfacc15}));
      tr.position.copy(c.mesh.position).add(new THREE.Vector3(0,1.5,0)); tr.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), c.dir);
      c.scene.add(tr); setTimeout(() => c.scene.remove(tr), 50); c.shootTimer = 0.5 + Math.random();
    }
    if (c.life <= 0) { c.scene.remove(c.mesh); activeClones.splice(i, 1); }
  }

  for (let i = activeDrones.length - 1; i >= 0; i--) {
    const d = activeDrones[i]; d.life -= dt;
    if (d.life <= 0) { d.scene.remove(d.mesh); activeDrones.splice(i, 1); continue; }
    const targetPos = d.p.pos.clone(); targetPos.y += 3.5; d.mesh.position.lerp(targetPos, 5 * dt);
    
    // انیمیشن ملخ‌های پهپاد
    if(d.props) d.props.forEach(p => p.rotation.y += 20 * dt);

    d.cd -= dt;
    if (d.cd <= 0) {
      let nearestE = null, minDist = 30;
      enemiesList.forEach(e => { if(!e.dead) { const dE = e.mesh.position.distanceTo(d.mesh.position); if(dE < minDist) { minDist = dE; nearestE = e; } }});
      if (nearestE) {
        d.mesh.lookAt(nearestE.mesh.position);
        const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([d.mesh.position.clone(), nearestE.mesh.position.clone()]), new THREE.LineBasicMaterial({color: 0x10b981})); d.scene.add(l); setTimeout(()=> d.scene.remove(l), 50);
        nearestE.hp -= 15; if(nearestE.hp <= 0) { nearestE.dead = true; d.scene.remove(nearestE.mesh); }
        playSound(850, 0.1, 'sawtooth', 0.1); d.cd = 0.4;
      }
    }
  }

  for (let i = activeTraps.length - 1; i >= 0; i--) {
    const t = activeTraps[i]; if (!t.active) continue;
    if(t.led) t.led.material.emissiveIntensity = Math.abs(Math.sin(Date.now() * 0.005)); // افکت چشمک زن
    
    enemiesList.forEach(e => {
      if(!e.dead && t.active && e.mesh.position.distanceTo(t.mesh.position) < 3.0) { 
        e.hp -= 60; e.cd = 3.0; 
        const ex = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 8), new THREE.MeshBasicMaterial({color: 0xf97316})); ex.position.copy(t.mesh.position); t.scene.add(ex); setTimeout(()=> t.scene.remove(ex), 200);
        t.active = false; t.scene.remove(t.mesh); activeTraps.splice(i, 1); playSound(400, 0.3, 'square', 0.4);
      }
    });
  }
}