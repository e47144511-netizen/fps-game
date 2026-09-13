import { scene, camera } from './engine.js';
import { solidObjects } from './world.js';
import { player } from './player.js';
import { playSound } from './storage.js';

export let isBuildMode = false;
let buildAngle = 0;
let selType = 'maze_wall';

const ghostGroup = new THREE.Group(); ghostGroup.visible = false; scene.add(ghostGroup);
let ghostMesh = new THREE.Mesh(new THREE.BoxGeometry(4.0, 4.0, 0.6), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5 }));
ghostGroup.add(ghostMesh);

function getGeo(t) {
  if(t==='maze_wall') return new THREE.BoxGeometry(4,4,0.6); if(t==='board') return new THREE.BoxGeometry(3,0.25,2);
  if(t==='cube') return new THREE.BoxGeometry(2,2,2); if(t==='slab') return new THREE.BoxGeometry(2,0.6,2);
  return new THREE.BoxGeometry(2,1.5,2);
}

export function toggleBuildMode() {
  isBuildMode = !isBuildMode;
  document.getElementById('minecraft-hotbar').style.display = isBuildMode ? 'flex' : 'none';
  document.getElementById('build-controls').style.display = isBuildMode ? 'flex' : 'none';
  document.getElementById('btn-place-block').style.display = isBuildMode ? 'flex' : 'none';
  document.getElementById('btn-break-block').style.display = isBuildMode ? 'flex' : 'none';
  ghostGroup.visible = isBuildMode;
}

export function updateBuilder() {
  if (!isBuildMode) return;
  const tp = player.pos.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(6));
  ghostGroup.position.set(Math.round(tp.x), Math.max(0.5, Math.round(tp.y * 2) / 2), Math.round(tp.z));
  ghostGroup.rotation.y = (buildAngle * Math.PI) / 180 + player.rotY;
}

export function initBuilder() {
  document.querySelectorAll('.hotbar-slot').forEach(s => s.addEventListener('click', () => { document.querySelectorAll('.hotbar-slot').forEach(x=>x.classList.remove('active')); s.classList.add('active'); selType = s.getAttribute('data-type'); ghostGroup.remove(ghostMesh); ghostMesh = new THREE.Mesh(getGeo(selType), ghostMesh.material); ghostGroup.add(ghostMesh); }));
  document.getElementById('btn-angle-plus').addEventListener('pointerdown', () => { buildAngle=(buildAngle+15)%360; document.getElementById('angle-display').innerText=buildAngle+'°'; });
  document.getElementById('btn-angle-minus').addEventListener('pointerdown', () => { buildAngle=(buildAngle-15+360)%360; document.getElementById('angle-display').innerText=buildAngle+'°'; });
  document.getElementById('btn-place-block').addEventListener('pointerdown', () => { if(!isBuildMode)return; const b = new THREE.Mesh(getGeo(selType), new THREE.MeshStandardMaterial({ color: selType==='maze_wall'?0x475569:0x0284c7 })); b.position.copy(ghostGroup.position); b.rotation.y = ghostGroup.rotation.y; b.userData.isUserBlock = true; scene.add(b); solidObjects.push(b); playSound(400,0.1,'sine',0.2); });
  document.getElementById('btn-break-block').addEventListener('pointerdown', () => { if(!isBuildMode)return; const r = new THREE.Raycaster(); r.setFromCamera(new THREE.Vector2(0,0), camera); r.far = 14; const h = r.intersectObjects(solidObjects, true); for(let x of h) { if(x.object.userData.isUserBlock) { scene.remove(x.object); solidObjects.splice(solidObjects.indexOf(x.object), 1); playSound(180,0.1,'square',0.2); return; } } });
}