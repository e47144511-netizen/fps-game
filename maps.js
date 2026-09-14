import { scene } from './engine.js';

export let currentMapId = 'maze';

export const MAPS_DB = {
  maze: {
    id: 'maze',
    name: 'قلعه هزارتو',
    spawns: [new THREE.Vector3(0, 1.8, 0), new THREE.Vector3(15, 1.8, 15)],
    build: (targetScene) => {
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(180, 180),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
      );
      floor.rotation.x = -Math.PI / 2;
      targetScene.add(floor);

      const wallMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
      for (let i = -60; i <= 60; i += 30) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 40), wallMat);
        wall.position.set(i, 3, 0);
        targetScene.add(wall);
      }
    }
  },
  sniper: {
    id: 'sniper',
    name: 'دره تک‌تیرانداز',
    spawns: [new THREE.Vector3(-35, 1.8, -35), new THREE.Vector3(35, 1.8, 35)],
    build: (targetScene) => {
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(300, 240),
        new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 })
      );
      floor.rotation.x = -Math.PI / 2;
      targetScene.add(floor);

      const rockMat = new THREE.MeshStandardMaterial({ color: 0x57534e });
      for (let i = -80; i <= 80; i += 40) {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(8), rockMat);
        rock.position.set(i, 4, i * 0.5);
        targetScene.add(rock);
      }
    }
  },
  city: {
    id: 'city',
    name: 'شهر ویران‌شده',
    spawns: [new THREE.Vector3(0, 1.8, -40), new THREE.Vector3(0, 1.8, 40)],
    build: (targetScene) => {
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(220, 220),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 })
      );
      floor.rotation.x = -Math.PI / 2;
      targetScene.add(floor);

      const bldgMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
      for (let x = -50; x <= 50; x += 50) {
        for (let z = -50; z <= 50; z += 50) {
          const bldg = new THREE.Mesh(new THREE.BoxGeometry(20, 30, 20), bldgMat);
          bldg.position.set(x, 15, z);
          targetScene.add(bldg);
        }
      }
    }
  },
  jungle: {
    id: 'jungle',
    name: 'معبد جنگلی',
    spawns: [new THREE.Vector3(-20, 1.8, 0), new THREE.Vector3(20, 1.8, 0)],
    build: (targetScene) => {
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(240, 240),
        new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.9 })
      );
      floor.rotation.x = -Math.PI / 2;
      targetScene.add(floor);

      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x065f46 });
      for (let i = -60; i <= 60; i += 30) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 16, 8), pillarMat);
        pillar.position.set(i, 8, (i % 20) * 2);
        targetScene.add(pillar);
      }
    }
  }
};

let previewRenderer = null;
let previewScene = null;
let previewCamera = null;

export function startMapPreview(mapId) {
  currentMapId = mapId;
  const container = document.getElementById('map-preview-container');
  if (!container) return;

  if (!previewRenderer) {
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 180;

    previewScene = new THREE.Scene();
    previewScene.background = new THREE.Color(0x0a0f1d);

    previewCamera = new THREE.PerspectiveCamera(50, width / height, 0.1, 500);
    previewCamera.position.set(0, 45, 65);
    previewCamera.lookAt(0, 0, 0);

    const ambLight = new THREE.AmbientLight(0xffffff, 0.8);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(20, 40, 20);
    previewScene.add(ambLight, dirLight);

    previewRenderer = new THREE.WebGLRenderer({ antialias: true });
    previewRenderer.setSize(width, height);
    previewRenderer.domElement.id = 'map-preview-canvas';
    container.innerHTML = '';
    container.appendChild(previewRenderer.domElement);
  }

  // پاکسازی آبجکت‌های مپ قبلی به جز نورها
  for (let i = previewScene.children.length - 1; i >= 0; i--) {
    const obj = previewScene.children[i];
    if (!obj.isLight) {
      previewScene.remove(obj);
    }
  }

  if (MAPS_DB[mapId] && typeof MAPS_DB[mapId].build === 'function') {
    MAPS_DB[mapId].build(previewScene);
  }

  previewRenderer.render(previewScene, previewCamera);
  }
