/* 데모 C · tech3d — 히어로 우측 three.js 장면 (ES 모듈)
   조건: (min-width:1024px) and (hover:hover), 움직임 줄이기 아님, WebGL 가능.
   아니면 아무것도 하지 않고 정적 이미지(c-obj-knot.webp)가 그대로 남는다.
   window load 이후 동적 import, DPR 상한 1.5, 탭이 숨겨지거나 히어로가 화면 밖이면 rAF 정지. */

const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js";
const hero = document.querySelector(".t3-hero");
const mount = hero ? hero.querySelector(".t3-hero__gl") : null;
const fxQuery = window.matchMedia("(min-width: 1024px) and (hover: hover)");
const BRAND = [0x601986, 0x601986, 0x8a3fb5, 0xda2664, 0x34dacc];
const PARALLAX_PX = 20;

function webglAvailable() {
  try {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") || probe.getContext("webgl");
    if (!gl) return false;
    const lose = gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
    return true;
  } catch (err) {
    return false;
  }
}

function canRun() {
  return Boolean(mount) && fxQuery.matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches && webglAvailable();
}

function dotTexture(THREE) {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.45, "rgba(255,255,255,.9)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function knotLines(THREE) {
  const TUBULAR = 160;
  const RADIAL = 10;
  const solid = new THREE.TorusKnotGeometry(1.05, 0.3, TUBULAR, RADIAL, 2, 3);
  const index = [];
  for (let i = 0; i <= TUBULAR; i++) {
    for (let j = 0; j <= RADIAL; j++) {
      const a = i * (RADIAL + 1) + j;
      if (i % 2 === 0 && j < RADIAL) index.push(a, a + 1);      /* 링 (2칸마다) */
      if (i < TUBULAR) index.push(a, a + RADIAL + 1);            /* 길이 방향 */
    }
  }
  const lines = new THREE.BufferGeometry();
  lines.setAttribute("position", solid.getAttribute("position"));
  lines.setIndex(index);
  return lines;
}

/* 크기별 3개 층 (합계 370개): 작은 입자는 많이, 큰 입자는 적게 */
function makeLayer(THREE, count, size, spread, texture) {
  const base = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const phase = new Float32Array(count * 2);
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    base[i * 3] = (Math.random() * 2 - 1) * spread.x;
    base[i * 3 + 1] = (Math.random() * 2 - 1) * spread.y;
    base[i * 3 + 2] = (Math.random() * 2 - 1) * spread.z;
    color.setHex(BRAND[(Math.random() * BRAND.length) | 0]);
    colors.set([color.r, color.g, color.b], i * 3);
    phase[i * 2] = Math.random() * Math.PI * 2;
    phase[i * 2 + 1] = 0.25 + Math.random() * 0.45;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(base.slice(), 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size, map: texture, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, sizeAttenuation: true
  });
  return { points: new THREE.Points(geometry, material), base, phase, count };
}

async function start() {
  let THREE;
  try {
    THREE = await import(THREE_URL);
  } catch (err) {
    return; /* CDN 실패: 정적 이미지 유지 */
  }
  if (!fxQuery.matches) return;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.className = "t3-hero__canvas";
  mount.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  const texture = dotTexture(THREE);
  const spread = { x: 4.2, y: 4.6, z: 3 };
  const layers = [
    makeLayer(THREE, 230, 0.12, spread, texture),
    makeLayer(THREE, 105, 0.2, spread, texture),
    makeLayer(THREE, 35, 0.32, spread, texture)
  ];
  const field = new THREE.Group();
  layers.forEach((l) => field.add(l.points));
  scene.add(field);

  /* 얇은 와이어프레임 토러스 노트: 삼각형 대각선 없이 링 + 길이 방향 선만 */
  const knot = new THREE.LineSegments(knotLines(THREE), new THREE.LineBasicMaterial({ color: 0x601986, transparent: true, opacity: 0.42 }));
  const knotGroup = new THREE.Group();
  knotGroup.position.set(0.2, 0.9, 0);
  knotGroup.add(knot);
  scene.add(knotGroup);

  let cssH = 1;
  function resize() {
    const w = mount.clientWidth || 1;
    const h = mount.clientHeight || 1;
    cssH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(mount);

  /* 포인터 시차 ±20px: 화면 px 를 z=0 평면의 월드 단위로 환산 */
  const pointer = { x: 0, y: 0 };
  const offset = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  const visibleH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

  let raf = 0;
  let running = false;
  let inView = true;
  let last = 0;
  let elapsed = 0;
  let firstFrame = true;

  function frame(now) {
    raf = window.requestAnimationFrame(frame);
    const dt = Math.min((now - (last || now)) / 1000, 0.05);
    last = now;
    elapsed += dt;

    layers.forEach((l) => {
      const arr = l.points.geometry.attributes.position.array;
      for (let i = 0; i < l.count; i++) {
        const p = l.phase[i * 2];
        const s = l.phase[i * 2 + 1];
        arr[i * 3] = l.base[i * 3] + Math.sin(elapsed * s + p) * 0.28;
        arr[i * 3 + 1] = l.base[i * 3 + 1] + Math.cos(elapsed * s * 0.8 + p) * 0.34;
        arr[i * 3 + 2] = l.base[i * 3 + 2] + Math.sin(elapsed * s * 0.6 + p * 1.7) * 0.2;
      }
      l.points.geometry.attributes.position.needsUpdate = true;
    });
    field.rotation.y = Math.sin(elapsed * 0.05) * 0.35;

    knot.rotation.x += dt * 0.09;
    knot.rotation.y += dt * 0.16;

    const k = 1 - Math.exp(-dt / 0.25);
    const worldPerPx = visibleH / cssH;
    offset.x += (pointer.x * PARALLAX_PX * worldPerPx - offset.x) * k;
    offset.y += (-pointer.y * PARALLAX_PX * worldPerPx - offset.y) * k;
    field.position.set(offset.x, offset.y, 0);
    knotGroup.position.set(0.2 - offset.x * 0.35, 0.9 - offset.y * 0.35, 0);

    renderer.render(scene, camera);
    if (firstFrame) {
      firstFrame = false;
      hero.classList.add("has-gl");
      mount.setAttribute("data-gl", "on");
    }
  }

  function play() {
    if (running || document.hidden || !inView || !fxQuery.matches) return;
    running = true;
    last = 0;
    raf = window.requestAnimationFrame(frame);
  }
  function pause() {
    if (!running) return;
    running = false;
    window.cancelAnimationFrame(raf);
  }

  document.addEventListener("visibilitychange", () => (document.hidden ? pause() : play()));
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) play(); else pause();
  }).observe(hero);
  fxQuery.addEventListener("change", (e) => {
    hero.classList.toggle("has-gl", e.matches);
    if (e.matches) play(); else pause();
  });
  play();
}

if (canRun()) {
  const go = () => { start().catch(() => {}); };
  if (document.readyState === "complete") go();
  else window.addEventListener("load", go, { once: true });
}
