import { scene as mainScene, previewScene, previewCamera, previewRenderer } from './engine.js';
import { solidObjects } from './world.js';

// --- Shared Geometries for Mobile Performance ---
const geoBox = new THREE.BoxGeometry(1, 1, 1);
const geoCyl = new THREE.CylinderGeometry(1, 1, 1, 8);
const geoCone = new THREE.ConeGeometry(1, 1, 8);

export const MAPS_DB = {
  maze: {
    id: 'maze', name: 'Maze (CQC)', desc: 'پایگاه نظامی و راهروهای تو در تو.', size: 180,
    spawns: [new THREE.Vector3(-70,1,-70), new THREE.Vector3(70,1,70), new THREE.Vector3(-70,1,70), new THREE.Vector3(70,1,-70)],
    fog: 0x0f172a, fogDensity: 0.015, hemi: 0x475569, dir: 0x94a3b8, ground: 0x1e293b,
    build: (scene, isPreview) => {
      const matWall = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
      const matCrate = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
      
      // Central Fort
      createMesh(scene, isPreview, geoBox, matWall, 0, 4, 0, 40, 8, 40);
      createMesh(scene, isPreview, geoBox, matWall, 0, 9, 0, 15, 2, 15); // Tower
      
      // Outer Walls
      createMesh(scene, isPreview, geoBox, matWall, -45, 3, -25, 20, 6, 2);
      createMesh(scene, isPreview, geoBox, matWall, 45, 3, -25, 20, 6, 2);
      createMesh(scene, isPreview, geoBox, matWall, -45, 3, 30, 20, 6, 2);
      createMesh(scene, isPreview, geoBox, matWall, 45, 3, 30, 20, 6, 2);
      createMesh(scene, isPreview, geoBox, matWall, 0, 3, -60, 2, 6, 30);
      createMesh(scene, isPreview, geoBox, matWall, 0, 3, 60, 2, 6, 30);
      
      // Scattered Covers (Crates)
      const positions = [[-20, -20], [20, 20], [-20, 20], [20, -20], [-60, 0], [60, 0]];
      positions.forEach(p => {
        createMesh(scene, isPreview, geoBox, matCrate, p[0], 1, p[1], 4, 2, 4);
        createMesh(scene, isPreview, geoBox, matCrate, p[0]+2, 0.5, p[1]+2, 2, 1, 2);
      });
    }
  },
  sniper: {
    id: 'sniper', name: 'Sniper Valley', desc: 'دره باز با صخره‌ها و درختان برای تک‌تیراندازها.', size: 300,
    spawns: [new THREE.Vector3(-120,16,-90), new THREE.Vector3(120,16,-90), new THREE.Vector3(-120,16,90), new THREE.Vector3(120,16,90)],
    fog: 0x38bdf8, fogDensity: 0.005, hemi: 0xe0f2fe, dir: 0xfef08a, ground: 0x27272a,
    build: (scene, isPreview) => {
      const matRock = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.9 });
      const matWood = new THREE.MeshStandardMaterial({ color: 0x78350f });
      const matLeaves = new THREE.MeshStandardMaterial({ color: 0x14532d });

      // Ridges
      createMesh(scene, isPreview, geoBox, matRock, 0, 9, -120, 300, 18, 40);
      createMesh(scene, isPreview, geoBox, matRock, 0, 7.5, 120, 300, 15, 40);
      
      // Large Rocks (Covers/Elevation)
      createMesh(scene, isPreview, geoBox, matRock, -60, 4, -40, 15, 8, 15);
      createMesh(scene, isPreview, geoBox, matRock, 20, 5, -20, 12, 10, 12);
      createMesh(scene, isPreview, geoBox, matRock, -20, 4, 40, 10, 8, 10);
      createMesh(scene, isPreview, geoBox, matRock, 70, 6, 35, 18, 12, 15);
      
      // Watchtower
      createMesh(scene, isPreview, geoCyl, matWood, 0, 5, 0, 3, 10, 3);
      createMesh(scene, isPreview, geoBox, matWood, 0, 10.5, 0, 6, 1, 6); // Platform
      
      // Trees (No collision for leaves to save performance, only trunk)
      for(let i=0; i<15; i++) {
        let tx = (Math.random()-0.5)*200, tz = (Math.random()-0.5)*150;
        createMesh(scene, isPreview, geoCyl, matWood, tx, 2, tz, 1.5, 4, 1.5);
        let leaves = createMesh(scene, isPreview, geoCone, matLeaves, tx, 6, tz, 6, 8, 6, false);
      }
    }
  },
  city: {
    id: 'city', name: 'Abandoned City', desc: 'شهر مخروبه با ساختمان‌های چند طبقه.', size: 220,
    spawns: [new THREE.Vector3(0,1,-95), new THREE.Vector3(0,1,95), new THREE.Vector3(95,1,0), new THREE.Vector3(-95,1,0)],
    fog: 0x1e293b, fogDensity: 0.01, hemi: 0x64748b, dir: 0xfca5a5, ground: 0x0f172a,
    build: (scene, isPreview) => {
      const matBldg1 = new THREE.MeshStandardMaterial({ color: 0x1e293b });
      const matBldg2 = new THREE.MeshStandardMaterial({ color: 0x334155 });
      const matCar = new THREE.MeshStandardMaterial({ color: 0xb91c1c, metalness: 0.6 });

      // Buildings
      createMesh(scene, isPreview, geoBox, matBldg1, 0, 12, 0, 40, 24, 40); // Skyscraper
      createMesh(scene, isPreview, geoBox, matBldg2, -65, 8, -65, 30, 16, 25);
      createMesh(scene, isPreview, geoBox, matBldg1, 65, 6, -65, 25, 12, 30);
      createMesh(scene, isPreview, geoBox, matBldg2, -65, 10, 65, 35, 20, 25);
      createMesh(scene, isPreview, geoBox, matBldg1, 65, 7, 65, 25, 14, 35);
      
      // Barricades / Abandoned Cars
      createMesh(scene, isPreview, geoBox, matCar, 0, 1.5, -45, 6, 3, 12);
      createMesh(scene, isPreview, geoBox, matCar, 25, 1.5, 0, 12, 3, 6);
      createMesh(scene, isPreview, geoBox, matBldg2, -25, 1, 25, 8, 2, 2); // Concrete barricade
    }
  },
  jungle: {
    id: 'jungle', name: 'Jungle Ruins', desc: 'معبد باستانی با ستون‌ها و پوشش گیاهی.', size: 240,
    spawns: [new THREE.Vector3(0,1,100), new THREE.Vector3(100,1,-100), new THREE.Vector3(-100,1,-100), new THREE.Vector3(-100,1,100)],
    fog: 0x022c22, fogDensity: 0.015, hemi: 0x064e3b, dir: 0xd9f99d, ground: 0x14532d,
    build: (scene, isPreview) => {
      const matTemple = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.9 });
      const matPillar = new THREE.MeshStandardMaterial({ color: 0x065f46 });
      const matLeaves = new THREE.MeshStandardMaterial({ color: 0x166534 });

      // Main Temple
      createMesh(scene, isPreview, geoBox, matTemple, 0, 4, -40, 50, 8, 40);
      createMesh(scene, isPreview, geoBox, matTemple, 0, 10, -40, 25, 4, 20); // Tier 2
      
      // Pillars
      for(let x=-20; x<=20; x+=10) {
        createMesh(scene, isPreview, geoCyl, matPillar, x, 4, -15, 2, 8, 2);
      }
      
      // Ruins & Bridges
      createMesh(scene, isPreview, geoBox, matTemple, 0, 2, 40, 15, 4, 30); // Bridge
      createMesh(scene, isPreview, geoBox, matPillar, -60, 3, -20, 15, 6, 15);
      createMesh(scene, isPreview, geoBox, matPillar, 60, 4, 20, 15, 8, 15);
      
      // Jungle Trees
      for(let i=0; i<20; i++) {
        let tx = (Math.random()-0.5)*200, tz = (Math.random()-0.5)*180;
        if (Math.abs(tx) < 30 && Math.abs(tz+40) < 30) continue; // Don't spawn inside temple
        createMesh(scene, isPreview, geoCyl, matTemple, tx, 3, tz, 2, 6, 2);
        createMesh(scene, isPreview, geoBox, matLeaves, tx, 7, tz, 8, 6, 8, false); // Blocky leaves
      }
    }
  }
};

// Helper for optimized map building
function createMesh(scene, isPreview, geometry, material, x, y, z, sx, sy, sz, isSolid=true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.userData.isMapObj = true;
  scene.add(mesh);
  if (!isPreview && isSolid) solidObjects.push(mesh);
  return mesh;
}

export let currentMapId = 'maze';
export let previewAnimId = null;

export function loadMap(mapId, targetScene, isPreview = false) {
  const mapData = MAPS_DB[mapId];
  if (!mapData) return;
  currentMapId = mapId;
  
  const toRemove = [];
  targetScene.children.forEach(c => { if (c.userData.isMapObj || c.isLight) toRemove.push(c); });
  toRemove.forEach(c => targetScene.remove(c));
  if (!isPreview) solidObjects.length = 0; 

  targetScene.background = new THREE.Color(mapData.fog);
  targetScene.fog = new THREE.FogExp2(mapData.fog, mapData.fogDensity);

  const hemi = new THREE.HemisphereLight(mapData.hemi, 0x000000, 0.9);
  targetScene.add(hemi);
  const dir = new THREE.DirectionalLight(mapData.dir, 1.0);
  dir.position.set(50, 100, 40);
  targetScene.add(dir);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(mapData.size, mapData.size), new THREE.MeshStandardMaterial({ color: mapData.ground, roughness: 1.0 }));
  ground.rotation.x = -Math.PI / 2; ground.userData.isMapObj = true;
  targetScene.add(ground); 
  if (!isPreview) solidObjects.push(ground);

  const hs = mapData.size / 2;
  const boundMat = new THREE.MeshStandardMaterial({ color: 0x020617 });
  createMesh(targetScene, isPreview, geoBox, boundMat, 0, 15, -hs, mapData.size, 30, 4);
  createMesh(targetScene, isPreview, geoBox, boundMat, 0, 15, hs, mapData.size, 30, 4);
  createMesh(targetScene, isPreview, geoBox, boundMat, -hs, 15, 0, 4, 30, mapData.size);
  createMesh(targetScene, isPreview, geoBox, boundMat, hs, 15, 0, 4, 30, mapData.size);

  mapData.build(targetScene, isPreview);
}

export function startMapPreview(mapId) {
  const container = document.getElementById('map-preview-container');
  if (!container.contains(previewRenderer.domElement)) {
    previewRenderer.domElement.id = "map-preview-canvas";
    container.appendChild(previewRenderer.domElement);
  }
  
  const rect = container.getBoundingClientRect();
  previewRenderer.setSize(rect.width, rect.height);
  previewCamera.aspect = rect.width / rect.height;
  previewCamera.updateProjectionMatrix();

  loadMap(mapId, previewScene, true);
  
  let angle = 0;
  const radius = MAPS_DB[mapId].size * 0.45;
  
  if (previewAnimId) cancelAnimationFrame(previewAnimId);
  function renderPreview() {
    angle += 0.005;
    previewCamera.position.set(Math.cos(angle) * radius, 60, Math.sin(angle) * radius);
    previewCamera.lookAt(0, 0, 0);
    previewRenderer.render(previewScene, previewCamera);
    previewAnimId = requestAnimationFrame(renderPreview);
  }
  renderPreview();
}