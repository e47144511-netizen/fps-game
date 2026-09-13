export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b16);
scene.fog = new THREE.FogExp2(0x070b16, 0.012);

export const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 650);
scene.add(camera);

export const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.getElementById('canvas-container').appendChild(renderer.domElement);

// صحنه پیش‌نمایش نقشه (Preview 3D)
export const previewScene = new THREE.Scene();
previewScene.background = new THREE.Color(0x0f172a);
export const previewCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
export const previewRenderer = new THREE.WebGLRenderer({ antialias: true });
previewRenderer.shadowMap.enabled = true;

export function initEngine() {
  function updateRes() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', updateRes);
  window.addEventListener('orientationchange', () => setTimeout(updateRes, 200));

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.85); 
  scene.add(hemiLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.9); 
  dirLight.position.set(30, 80, 40); 
  scene.add(dirLight);

  const prevHemi = new THREE.HemisphereLight(0xffffff, 0x475569, 1.0);
  previewScene.add(prevHemi);
  const prevDir = new THREE.DirectionalLight(0xffffff, 0.8);
  prevDir.position.set(50, 100, 50);
  previewScene.add(prevDir);
}