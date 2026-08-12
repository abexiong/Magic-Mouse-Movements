import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { readMotionPolicy } from "../../src/core/motion-policy.js";

export const RIGID_TOW_ASSEMBLY_POSTER =
  "/kits/rigid-tow-artifact-cursor/demo/audi-r8-assembly-poster.jpg";

const ASSEMBLY_DURATION = 8_000;

/** @param {number} value */
function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

/** @param {number} value */
function smoothstep(value) {
  const clamped = clamp01(value);
  return clamped * clamped * (3 - 2 * clamped);
}

/**
 * Convert one complete story position into assembled-to-exploded-to-assembled motion.
 *
 * @param {number} progress
 */
export function rigidTowAssemblyAmount(progress) {
  const value = clamp01(progress);
  if (value < 0.1) return 0;
  if (value < 0.42) return smoothstep((value - 0.1) / 0.32);
  if (value < 0.58) return 1;
  if (value < 0.92) return smoothstep(1 - (value - 0.58) / 0.34);
  return 0;
}

/** @param {number} progress */
export function rigidTowAssemblyPhase(progress) {
  const value = clamp01(progress);
  if (value < 0.1) return "assembled";
  if (value < 0.42) return "expanding";
  if (value < 0.58) return "exploded";
  if (value < 0.92) return "reassembling";
  return "assembled";
}

/** @param {THREE.Material} material */
function stabilizeMaterial(material) {
  const opaque = material.opacity >= 0.9;
  material.transparent = !opaque;
  material.depthWrite = opaque;
  material.depthTest = true;
  material.opacity = opaque ? 1 : material.opacity;
  material.alphaTest = opaque ? 0.02 : 0;
  material.needsUpdate = true;
}

/** @param {THREE.Material} material */
function disposeMaterial(material) {
  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) value.dispose();
  }
  material.dispose();
}

/**
 * @typedef {{
 *   modelUrl?: string,
 *   posterUrl?: string,
 *   autoplay?: boolean,
 *   scrollFromActivation?: boolean,
 *   scrollDistance?: number,
 * }} RigidTowAssemblyStoryOptions
 */

/**
 * Create a real Three.js exploded-view story from the same licensed Audi used by the cursor.
 * It previews once, then lets ordinary page scrolling scrub the expansion and reassembly.
 *
 * @param {HTMLElement} container
 * @param {RigidTowAssemblyStoryOptions} [options]
 */
export function createRigidTowAssemblyStory(container, options = {}) {
  if (!(container instanceof HTMLElement)) {
    throw new TypeError("Rigid Tow assembly story requires an HTMLElement container.");
  }

  const originalPosition = container.style.position;
  const computedPosition = window.getComputedStyle(container).position;
  if (computedPosition === "static") container.style.position = "relative";

  const layer = document.createElement("div");
  const poster = document.createElement("img");
  const canvas = document.createElement("canvas");
  const readout = document.createElement("div");
  const readoutLabel = document.createElement("span");
  const readoutPhase = document.createElement("strong");
  const meter = document.createElement("i");
  layer.className = "rigid-tow-assembly-story";
  layer.dataset.assemblyAmount = "0.000";
  layer.dataset.modelLoads = "0";
  layer.dataset.phase = "assembled";
  layer.dataset.progress = "0.000";
  layer.dataset.rendering = "false";
  layer.dataset.status = "loading";
  layer.setAttribute("aria-hidden", "true");
  poster.alt = "";
  poster.decoding = "async";
  poster.src = options.posterUrl ?? RIGID_TOW_ASSEMBLY_POSTER;
  readoutLabel.textContent = "Audi assembly study";
  readoutPhase.textContent = "Assembled";
  readout.append(readoutLabel, readoutPhase, meter);
  Object.assign(layer.style, {
    position: "absolute",
    zIndex: "0",
    inset: "0",
    overflow: "hidden",
    pointerEvents: "none",
    background: "radial-gradient(circle at 56% 45%, rgb(68 91 139 / 34%), transparent 42%), linear-gradient(145deg, #111722, #07090d)",
  });
  for (const element of [poster, canvas]) {
    Object.assign(element.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
    });
  }
  Object.assign(poster.style, {
    objectFit: "cover",
    opacity: "1",
    transition: "opacity 240ms ease",
  });
  Object.assign(canvas.style, {
    opacity: "0",
    transition: "opacity 240ms ease",
  });
  Object.assign(readout.style, {
    position: "absolute",
    zIndex: "2",
    right: "24px",
    bottom: "24px",
    display: "grid",
    gridTemplateColumns: "auto auto",
    gap: "5px 12px",
    minWidth: "190px",
    padding: "11px 13px",
    border: "1px solid rgb(255 255 255 / 13%)",
    borderRadius: "6px",
    color: "rgb(220 228 242 / 72%)",
    background: "rgb(7 9 13 / 68%)",
    backdropFilter: "blur(12px)",
    font: "600 9px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  });
  Object.assign(readoutPhase.style, {
    color: "#f49118",
    fontWeight: "700",
    textAlign: "right",
  });
  Object.assign(meter.style, {
    gridColumn: "1 / -1",
    display: "block",
    width: "100%",
    height: "2px",
    background: "linear-gradient(90deg, #f49118 var(--assembly-progress, 0%), rgb(255 255 255 / 12%) var(--assembly-progress, 0%))",
  });
  layer.append(poster, canvas, readout);
  container.prepend(layer);

  const policy = readMotionPolicy({ renderOnCoarsePointer: true });
  const forcedStatic = new URLSearchParams(window.location.search).get("motion") === "static";
  if (policy.staticFallback || forcedStatic) {
    layer.dataset.status = "static";
    return {
      start() {},
      pause() {},
      resize() {},
      setProgress() {},
      destroy() {
        layer.remove();
        if (computedPosition === "static") container.style.position = originalPosition;
      },
    };
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch {
    layer.dataset.status = "renderer-unavailable";
    return {
      start() {},
      pause() {},
      resize() {},
      setProgress() {},
      destroy() {
        layer.remove();
        if (computedPosition === "static") container.style.position = originalPosition;
      },
    };
  }

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 120);
  camera.position.set(19, 12, 24);
  camera.lookAt(0, 0.25, 0);
  scene.add(new THREE.HemisphereLight(0xf2f6ff, 0x171b25, 3.5));
  scene.add(new THREE.AmbientLight(0xffffff, 0.68));
  const key = new THREE.DirectionalLight(0xffffff, 4.2);
  key.position.set(-12, 20, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xf49118, 2.2);
  rim.position.set(12, 8, -16);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0x7097df, 1.7);
  fill.position.set(-15, 4, -10);
  scene.add(fill);

  const modelRoot = new THREE.Group();
  modelRoot.rotation.set(-0.03, -0.5, 0);
  scene.add(modelRoot);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 34),
    new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.28 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3.45;
  floor.receiveShadow = true;
  scene.add(floor);

  /** @type {Array<{ node: THREE.Group, start: THREE.Vector3, end: THREE.Vector3 }>} */
  const parts = [];
  let loadedModel = null;
  let disposed = false;
  let requested = false;
  let intersecting = true;
  let frameId = null;
  let scrollFrameId = null;
  let autoplayFrameId = null;
  let autoplayStartedAt = 0;
  let scrollOrigin = window.scrollY;
  let currentProgress = 0;
  let scrollOwnsProgress = false;

  const resize = () => {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    requestRender();
  };

  const render = () => {
    frameId = null;
    if (disposed || !requested || !intersecting || document.hidden || !loadedModel) return;
    layer.dataset.rendering = "true";
    renderer.render(scene, camera);
    layer.dataset.rendering = "false";
  };

  function requestRender() {
    if (frameId !== null || disposed || !requested || !intersecting || document.hidden) return;
    frameId = window.requestAnimationFrame(render);
  }

  const setProgress = (progress) => {
    currentProgress = clamp01(progress);
    const amount = rigidTowAssemblyAmount(currentProgress);
    const phase = rigidTowAssemblyPhase(currentProgress);
    for (const part of parts) {
      part.node.position.lerpVectors(part.start, part.end, amount);
    }
    modelRoot.rotation.y = -0.5 + Math.sin(currentProgress * Math.PI) * 0.08;
    layer.dataset.assemblyAmount = amount.toFixed(3);
    layer.dataset.phase = phase;
    layer.dataset.progress = currentProgress.toFixed(3);
    layer.style.setProperty("--assembly-progress", `${currentProgress * 100}%`);
    readoutPhase.textContent = phase.replace(/^./, (character) => character.toUpperCase());
    requestRender();
  };

  const updateFromScroll = () => {
    scrollFrameId = null;
    if (!requested || disposed) return;
    const distance = options.scrollDistance ?? Math.max(window.innerHeight * 1.15, 760);
    setProgress((window.scrollY - scrollOrigin) / distance);
  };

  const handleScroll = () => {
    if (!requested || disposed) return;
    if (Math.abs(window.scrollY - scrollOrigin) > 18) {
      scrollOwnsProgress = true;
      if (autoplayFrameId !== null) window.cancelAnimationFrame(autoplayFrameId);
      autoplayFrameId = null;
    }
    if (scrollFrameId === null) scrollFrameId = window.requestAnimationFrame(updateFromScroll);
  };

  const runAutoplay = (now) => {
    autoplayFrameId = null;
    if (disposed || !requested || scrollOwnsProgress || !intersecting || document.hidden) return;
    if (!autoplayStartedAt) autoplayStartedAt = now;
    const progress = clamp01((now - autoplayStartedAt) / ASSEMBLY_DURATION);
    setProgress(progress);
    if (progress < 1) autoplayFrameId = window.requestAnimationFrame(runAutoplay);
  };

  const start = () => {
    if (requested) return;
    requested = true;
    scrollOrigin = options.scrollFromActivation
      ? window.scrollY
      : container.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.55;
    setProgress(currentProgress);
    if (options.autoplay !== false && !scrollOwnsProgress) {
      autoplayStartedAt = 0;
      autoplayFrameId = window.requestAnimationFrame(runAutoplay);
    }
  };

  const pause = () => {
    requested = false;
    if (frameId !== null) window.cancelAnimationFrame(frameId);
    if (scrollFrameId !== null) window.cancelAnimationFrame(scrollFrameId);
    if (autoplayFrameId !== null) window.cancelAnimationFrame(autoplayFrameId);
    frameId = null;
    scrollFrameId = null;
    autoplayFrameId = null;
    layer.dataset.rendering = "false";
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      intersecting = Boolean(entry?.isIntersecting);
      if (intersecting) requestRender();
      else if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
        layer.dataset.rendering = "false";
      }
    },
    { rootMargin: "160px 0px" },
  );
  intersectionObserver.observe(container);
  window.addEventListener("scroll", handleScroll, { passive: true });
  document.addEventListener("visibilitychange", requestRender);
  resize();

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(
    options.modelUrl ?? "/kits/rigid-tow-artifact-cursor/demo/audi-r8-cursor.glb",
    (gltf) => {
      if (disposed) return;
      loadedModel = gltf.scene;
      const rawBounds = new THREE.Box3().setFromObject(loadedModel);
      const rawCenter = rawBounds.getCenter(new THREE.Vector3());
      const rawSize = rawBounds.getSize(new THREE.Vector3());
      const scale = 15 / Math.max(rawSize.x, rawSize.z, 1);
      loadedModel.scale.setScalar(scale);
      loadedModel.position.copy(rawCenter).multiplyScalar(-scale);
      modelRoot.add(loadedModel);
      loadedModel.updateMatrixWorld(true);

      const meshes = [];
      loadedModel.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        meshes.push(object);
        object.castShadow = true;
        object.receiveShadow = false;
        object.frustumCulled = false;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(stabilizeMaterial);
      });

      const modelCenter = new THREE.Box3().setFromObject(loadedModel).getCenter(new THREE.Vector3());
      meshes.forEach((mesh, index) => {
        const parent = mesh.parent;
        if (!parent) return;
        const worldCenter = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
        const direction = worldCenter.clone().sub(modelCenter);
        if (direction.lengthSq() < 0.09) {
          const angle = index * 2.399963;
          direction.set(Math.cos(angle), (index % 5 - 2) * 0.18, Math.sin(angle));
        }
        direction.normalize();
        direction.x *= 4.7;
        direction.y = direction.y * 3 + ((index % 4) - 1.5) * 0.28;
        direction.z *= 3.8;
        const localStart = mesh.position.clone();
        const localOrigin = parent.worldToLocal(worldCenter.clone());
        const localTarget = parent.worldToLocal(worldCenter.clone().add(direction));
        parts.push({
          node: mesh,
          start: localStart,
          end: localStart.clone().add(localTarget.sub(localOrigin)),
        });
      });

      const scaledBounds = new THREE.Box3().setFromObject(loadedModel);
      floor.position.y = scaledBounds.min.y - 0.12;
      layer.dataset.modelLoads = "1";
      layer.dataset.parts = String(parts.length);
      layer.dataset.status = "ready";
      poster.style.opacity = "0";
      canvas.style.opacity = "1";
      setProgress(currentProgress);
    },
    undefined,
    () => {
      layer.dataset.status = "model-unavailable";
    },
  );

  return {
    start,
    pause,
    resize,
    setProgress,
    destroy() {
      if (disposed) return;
      disposed = true;
      pause();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("visibilitychange", requestRender);
      loadedModel?.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach(disposeMaterial);
        else disposeMaterial(object.material);
      });
      floor.geometry.dispose();
      disposeMaterial(floor.material);
      renderer.dispose();
      layer.remove();
      if (computedPosition === "static") container.style.position = originalPosition;
    },
  };
}
