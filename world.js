import { scene } from './engine.js';
import { loadMap, currentMapId } from './maps.js';

export const solidObjects = [];
export let summitCrystal = null; // برای جت‌پک و قله مخفی حفظ می‌شود

export function initWorld(mapId = currentMapId) {
  loadMap(mapId, scene, false);
  
  // پارکوری که روی همه مپ‌ها به عنوان ایستر اگ ساخته می‌شود
  const parkourColors = [0x38bdf8, 0x818cf8, 0xc084fc, 0xf472b6, 0xfacc15, 0x4ade80];
  for (let i = 1; i <= 28; i++) {
    const size = Math.max(2.8, 4.0 - i * 0.035);
    const plat = new THREE.Mesh(new THREE.BoxGeometry(size, 0.8, size), new THREE.MeshStandardMaterial({ color: parkourColors[i % parkourColors.length], roughness: 0.4 }));
    const posX = Math.cos(i * 0.52) * (7.0 + (i % 3) * 2.2), posZ = Math.sin(i * 0.52) * (7.0 + (i % 3) * 2.2), posY = i * 2.25;
    plat.position.set(posX, posY, posZ); plat.userData.isMapObj = true; 
    scene.add(plat); 
    solidObjects.push(plat); // اضافه کردن به لیست Collision
    
    if (i === 28) {
      if(summitCrystal) scene.remove(summitCrystal);
      summitCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.6), new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xeab308, emissiveIntensity: 0.85 }));
      summitCrystal.position.set(posX, posY + 2.5, posZ); summitCrystal.userData.isMapObj = true; 
      scene.add(summitCrystal);
    }
  }
}