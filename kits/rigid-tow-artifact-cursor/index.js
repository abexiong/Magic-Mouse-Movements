import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { readMotionPolicy } from "../../src/core/motion-policy.js";
import {
  centerForTowAttachment,
  clampRange,
  cursorMaterialPolicy,
  damp,
  shouldPauseCursor,
  smokeSpawnCount,
  stepTowRigidBody,
  supportsCursorPointer,
} from "./rigid-tow-math.js";

export {
  createRigidTowAssemblyStory,
  rigidTowAssemblyAmount,
  rigidTowAssemblyPhase,
  RIGID_TOW_ASSEMBLY_POSTER,
} from "./assembly-story.js";

export const RIGID_TOW_DEMO_MODEL =
  "/magic-mouse-movements/audi-r8-cursor.glb";

const NATIVE_CURSOR_SELECTOR = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "label",
  "summary",
  "[role='button']",
  "[role='link']",
  "[contenteditable='true']",
  "[data-cursor-native]",
].join(",");
const BASE_MODEL_SPAN = 10.5;
const MAX_PARTICLES = 36;

export const RIGID_TOW_CURSOR_CONFIG = Object.freeze({
  canvasSize: 220,
  visibleScale: 0.5,
  mass: 2.4,
  momentOfInertia: 3400,
  springStiffness: 58,
  springDamping: 14,
  linearDamping: 2.9,
  lateralVelocityDamping: 8.5,
  angularDamping: 5,
  jointAlignmentTorque: 42000,
  alignmentDeadZone: THREE.MathUtils.degToRad(1.5),
  velocityAlignmentTorque: 4200,
  alignmentSpeed: 90,
  maxLateralForceRatio: 0.12,
  reverseForceRatio: 0.06,
  translationAlignmentPower: 2.4,
  towRestLength: 34,
  maxTowForce: 6500,
  maxTowTorque: 52000,
  maxLinearSpeed: 1100,
  maxAngularVelocity: 3.4,
  maxAngularAcceleration: 24,
  rotationDirection: -1,
  maxDelta: 0.05,
  maxSubstep: 1 / 120,
  inputResponse: 16,
  inputDecay: 7,
  pitchLimit: THREE.MathUtils.degToRad(4),
  rollLimit: THREE.MathUtils.degToRad(5),
  poseResponse: 9,
  boundaryMargin: 38,
  boundaryRestitution: 0.12,
  pointSize: 9,
  frontAxis: 1,
  towPointRatio: 0.98,
  smokeSpacing: 9,
});

function makeSmokeStamp() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 31);
  gradient.addColorStop(0, "rgb(136 138 144 / 78%)");
  gradient.addColorStop(0.38, "rgb(88 90 96 / 48%)");
  gradient.addColorStop(0.72, "rgb(52 53 58 / 20%)");
  gradient.addColorStop(1, "rgb(38 39 44 / 0%)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return canvas;
}

/** @param {THREE.Material} material */
function disposeMaterial(material) {
  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) value.dispose();
  }
  material.dispose();
}

/** @param {THREE.Material} material */
function stabilizeCursorMaterial(material) {
  const policy = cursorMaterialPolicy(material.opacity);
  material.transparent = policy.transparent;
  material.depthWrite = policy.depthWrite;
  material.depthTest = true;
  material.opacity = policy.opacity;
  material.alphaTest = policy.alphaTest;
  material.needsUpdate = true;
  return policy.renderOrder;
}

/** @param {THREE.Material} material */
function makeReflectionMaterial(material) {
  const reflection = material.clone();
  const styled = reflection;
  reflection.transparent = true;
  reflection.opacity = 0.1;
  reflection.depthWrite = false;
  reflection.side = THREE.DoubleSide;
  if ("roughness" in styled) styled.roughness = 1;
  if ("metalness" in styled) styled.metalness = 0.08;
  if ("clearcoat" in styled) styled.clearcoat = 0;
  if ("color" in styled) styled.color?.multiplyScalar(0.38);
  if ("emissive" in styled) styled.emissive?.multiplyScalar(0.16);
  return reflection;
}

/**
 * @param {THREE.Vector3} localPoint
 * @param {THREE.Object3D} root
 * @param {THREE.Camera} camera
 * @param {number} centerX
 * @param {number} centerY
 */
function projectModelPoint(localPoint, root, camera, centerX, centerY) {
  const projected = localPoint.clone();
  root.localToWorld(projected);
  projected.project(camera);
  return {
    x: centerX + projected.x * RIGID_TOW_CURSOR_CONFIG.canvasSize / 2,
    y: centerY - projected.y * RIGID_TOW_CURSOR_CONFIG.canvasSize / 2,
  };
}

/** @param {HTMLElement} container */
function drawStaticFallback(container) {
  const fallback = document.createElement("div");
  fallback.dataset.rigidTowFallback = "true";
  fallback.setAttribute("aria-hidden", "true");
  Object.assign(fallback.style, {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: "112px",
    height: "44px",
    border: "1px solid rgb(244 145 24 / 52%)",
    borderRadius: "48% 58% 32% 32% / 58% 62% 28% 30%",
    background: "linear-gradient(145deg, rgb(45 49 58 / 92%), rgb(11 13 18 / 96%))",
    boxShadow: "0 18px 32px rgb(0 0 0 / 34%)",
    transform: "translate(-50%, -50%) rotate(-8deg)",
    pointerEvents: "none",
  });
  container.appendChild(fallback);
  return fallback;
}

/**
 * @typedef {{
 *   modelUrl?: string,
 *   debug?: boolean,
 *   showConnector?: boolean,
 *   hideNativeCursor?: boolean,
 * }} RigidTowArtifactCursorOptions
 */

/**
 * Create the fixed-front-joint rigid tow interaction inside one container.
 *
 * @param {HTMLElement} container
 * @param {RigidTowArtifactCursorOptions} [options]
 */
export function createRigidTowArtifactCursor(container, options = {}) {
  if (!(container instanceof HTMLElement)) {
    throw new TypeError("Rigid Tow Artifact Cursor requires an HTMLElement container.");
  }

  const originalPosition = container.style.position;
  const originalCursor = container.style.cursor;
  const computedPosition = window.getComputedStyle(container).position;
  if (computedPosition === "static") container.style.position = "relative";

  const policy = readMotionPolicy({ renderOnCoarsePointer: true });
  const forcedStatic = new URLSearchParams(window.location.search).get("motion") === "static";
  if (policy.staticFallback || forcedStatic) {
    const fallback = drawStaticFallback(container);
    return {
      start() {},
      pause() {},
      resize() {},
      destroy() {
        fallback.remove();
        if (computedPosition === "static") container.style.position = originalPosition;
      },
    };
  }

  const layer = document.createElement("div");
  const smokeCanvas = document.createElement("canvas");
  const carCanvas = document.createElement("canvas");
  const point = document.createElement("div");
  layer.className = "rigid-tow-artifact-cursor-layer";
  smokeCanvas.className = "rigid-tow-artifact-cursor-smoke";
  carCanvas.className = "rigid-tow-artifact-cursor-car";
  point.className = "rigid-tow-artifact-cursor-point";
  layer.dataset.active = "false";
  layer.dataset.engaged = "false";
  layer.dataset.frontAttached = "false";
  layer.dataset.modelLoads = "0";
  layer.dataset.rendering = "false";
  layer.dataset.scope = "container";
  layer.dataset.status = "loading";
  layer.dataset.visible = "false";
  layer.dataset.physics = "rigid-front-tow-joint";
  layer.dataset.referenceArtifact = "audi-r8";
  layer.setAttribute("aria-hidden", "true");
  Object.assign(layer.style, {
    position: "absolute",
    zIndex: "4",
    inset: "0",
    overflow: "hidden",
    pointerEvents: "none",
    contain: "strict",
  });
  Object.assign(smokeCanvas.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
  });
  Object.assign(carCanvas.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: `${RIGID_TOW_CURSOR_CONFIG.canvasSize}px`,
    height: `${RIGID_TOW_CURSOR_CONFIG.canvasSize}px`,
    opacity: "0",
    pointerEvents: "none",
    willChange: "transform",
  });
  Object.assign(point.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: `${RIGID_TOW_CURSOR_CONFIG.pointSize}px`,
    height: `${RIGID_TOW_CURSOR_CONFIG.pointSize}px`,
    border: "1px solid rgb(255 205 132 / 82%)",
    borderRadius: "50%",
    background: "#f49118",
    boxShadow: "0 0 0 3px rgb(244 145 24 / 15%), 0 2px 7px rgb(0 0 0 / 45%)",
    opacity: "0",
    pointerEvents: "none",
    willChange: "transform",
  });
  layer.append(smokeCanvas, carCanvas, point);
  container.prepend(layer);

  const smokeContext = smokeCanvas.getContext("2d");
  if (!smokeContext) throw new Error("Canvas 2D is unavailable.");

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: carCanvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch {
    layer.dataset.status = "renderer-unavailable";
    layer.remove();
    const fallback = drawStaticFallback(container);
    return {
      start() {},
      pause() {},
      resize() {},
      destroy() {
        fallback.remove();
        if (computedPosition === "static") container.style.position = originalPosition;
      },
    };
  }

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(
    RIGID_TOW_CURSOR_CONFIG.canvasSize,
    RIGID_TOW_CURSOR_CONFIG.canvasSize,
    false,
  );
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-12, 12, 12, -12, 0.1, 100);
  camera.position.set(7, 28, 10);
  camera.lookAt(0, -0.15, 0);
  camera.updateMatrixWorld();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x343640, 3.8));
  scene.add(new THREE.AmbientLight(0xffffff, 0.95));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(-10, 22, -9);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(512, 512);
  keyLight.shadow.camera.left = -6;
  keyLight.shadow.camera.right = 6;
  keyLight.shadow.camera.top = 6;
  keyLight.shadow.camera.bottom = -6;
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 60;
  keyLight.shadow.bias = -0.0006;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xdce6ff, 2.25);
  fillLight.position.set(14, 17, 11);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0xfd9a1c, 1.15);
  rimLight.position.set(4, 11, -15);
  scene.add(rimLight);

  const motionRoot = new THREE.Group();
  motionRoot.rotation.order = "YXZ";
  scene.add(motionRoot);
  const towPointLocal = new THREE.Vector3(0, 0, -2.5);
  const rearPointLocal = new THREE.Vector3(0, 0, 2.5);
  const modelOriginLocal = new THREE.Vector3();
  const shadowMaterial = new THREE.ShadowMaterial({
    color: 0x050506,
    opacity: 0.34,
  });
  shadowMaterial.depthWrite = false;
  const shadowGeometry = new THREE.PlaneGeometry(7, 5.2);
  const shadowPlane = new THREE.Mesh(shadowGeometry, shadowMaterial);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.receiveShadow = true;
  shadowPlane.renderOrder = 2;
  scene.add(shadowPlane);

  let width = Math.max(1, container.clientWidth);
  let height = Math.max(1, container.clientHeight);
  const state = {
    ready: false,
    visible: false,
    engaged: false,
    requested: false,
    running: false,
    pointerType: "mouse",
    pointerX: width / 2,
    pointerY: height / 2,
    currentX: width / 2,
    currentY: height / 2,
    velocityX: 0,
    velocityY: 0,
    angularVelocity: 0,
    towForceX: 0,
    towForceY: 0,
    lateralForce: 0,
    towTorque: 0,
    alignmentError: 0,
    towDistance: RIGID_TOW_CURSOR_CONFIG.towRestLength,
    pointerVelocityX: 0,
    pointerVelocityY: 0,
    previousPointerX: width / 2,
    previousPointerY: height / 2,
    lastInputAt: 0,
    lastFrameX: width / 2,
    lastFrameY: height / 2,
    lastSmokeX: width / 2,
    lastSmokeY: height / 2,
    smokeSeeded: false,
    yaw: 0,
    pitch: 0,
    roll: 0,
    lastPointerAt: 0,
    lastFrameAt: performance.now(),
    frameId: null,
    particles: [],
  };
  const showTowDebug = options.debug
    ?? new URLSearchParams(window.location.search).has("towDebug");
  const showTowConnector = options.showConnector ?? showTowDebug;
  const smokeStamp = makeSmokeStamp();
  let loadedModel = null;
  let fallbackElement = null;
  const reflectionMaterials = [];
  let disposed = false;
  let intersecting = true;

  const resize = () => {
    const bounds = container.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 1.25);
    smokeCanvas.width = Math.max(1, Math.floor(width * ratio));
    smokeCanvas.height = Math.max(1, Math.floor(height * ratio));
    smokeCanvas.style.width = `${width}px`;
    smokeCanvas.style.height = `${height}px`;
    smokeContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    state.currentX = clampRange(state.currentX, 0, width);
    state.currentY = clampRange(state.currentY, 0, height);
  };

  const setFollowerVisible = (visible) => {
    state.visible = visible;
    layer.dataset.visible = String(visible);
    carCanvas.style.opacity = visible ? "1" : "0";
    smokeCanvas.style.opacity = visible ? "1" : "0";
  };

  const setEngaged = (engaged) => {
    state.engaged = engaged;
    layer.dataset.engaged = String(engaged);
    point.style.opacity = engaged ? "1" : "0";
    if (options.hideNativeCursor !== false && state.pointerType !== "touch") {
      container.style.cursor = engaged ? "none" : originalCursor;
    }
  };

  const placePoint = (x, y) => {
    point.style.transform = `translate3d(${x - RIGID_TOW_CURSOR_CONFIG.pointSize / 2}px, ${y - RIGID_TOW_CURSOR_CONFIG.pointSize / 2}px, 0)`;
  };

  const drawEffects = (deltaSeconds, front, center, forward, lateralForce) => {
    smokeContext.clearRect(0, 0, width, height);
    if (state.visible && state.engaged && showTowConnector) {
      smokeContext.beginPath();
      smokeContext.moveTo(state.pointerX, state.pointerY);
      smokeContext.lineTo(front.x, front.y);
      smokeContext.strokeStyle = "rgb(244 145 24 / 52%)";
      smokeContext.lineWidth = 1.1;
      smokeContext.stroke();
    }
    if (state.visible && state.engaged && showTowDebug) {
      const lateralX = -forward.y;
      const lateralY = forward.x;
      const lateralScale = 0.035;
      smokeContext.save();
      smokeContext.font = "11px ui-monospace, monospace";
      smokeContext.lineCap = "round";
      smokeContext.beginPath();
      smokeContext.moveTo(center.x, center.y);
      smokeContext.lineTo(center.x + forward.x * 54, center.y + forward.y * 54);
      smokeContext.strokeStyle = "rgb(104 224 154 / 90%)";
      smokeContext.lineWidth = 1.5;
      smokeContext.stroke();
      smokeContext.beginPath();
      smokeContext.moveTo(front.x, front.y);
      smokeContext.lineTo(
        front.x + lateralX * lateralForce * lateralScale,
        front.y + lateralY * lateralForce * lateralScale,
      );
      smokeContext.strokeStyle = "rgb(92 190 255 / 92%)";
      smokeContext.lineWidth = 2;
      smokeContext.stroke();
      for (const marker of [
        { x: state.pointerX, y: state.pointerY, color: "#f49118", label: "target" },
        { x: front.x, y: front.y, color: "#ffd08a", label: "tow" },
        { x: center.x, y: center.y, color: "#68e09a", label: "mass" },
      ]) {
        smokeContext.beginPath();
        smokeContext.arc(marker.x, marker.y, 3.2, 0, Math.PI * 2);
        smokeContext.fillStyle = marker.color;
        smokeContext.fill();
        smokeContext.fillStyle = "rgb(255 255 255 / 88%)";
        smokeContext.fillText(marker.label, marker.x + 6, marker.y - 6);
      }
      smokeContext.restore();
    }
    const survivors = [];
    for (const particle of state.particles) {
      particle.life -= deltaSeconds;
      if (particle.life <= 0) continue;
      particle.x += particle.vx * deltaSeconds;
      particle.y += particle.vy * deltaSeconds;
      particle.vx *= 0.982;
      particle.vy -= 3.2 * deltaSeconds;
      const progress = 1 - particle.life / particle.maxLife;
      const size = particle.size * (1 + progress * 0.72);
      smokeContext.globalAlpha = particle.alpha * (1 - progress) ** 1.7;
      smokeContext.drawImage(
        smokeStamp,
        particle.x - size / 2,
        particle.y - size / 2,
        size,
        size,
      );
      survivors.push(particle);
    }
    smokeContext.globalAlpha = 1;
    state.particles = survivors;
    layer.dataset.active = String(survivors.length > 0);
    layer.dataset.frontAttached = String(state.visible && state.engaged);
  };

  const spawnSmoke = (count, front, rear) => {
    if (!state.visible || count <= 0) return;
    const exhaustHeading = Math.atan2(rear.y - front.y, rear.x - front.x);
    const sideX = -Math.sin(exhaustHeading);
    const sideY = Math.cos(exhaustHeading);
    for (let index = 0; index < count; index += 1) {
      if (state.particles.length >= MAX_PARTICLES) state.particles.shift();
      const lateral = (Math.random() - 0.5) * 7;
      const life = 0.62 + Math.random() * 0.26;
      state.particles.push({
        x: rear.x + sideX * lateral,
        y: rear.y + sideY * lateral,
        vx: Math.cos(exhaustHeading) * (8 + Math.random() * 10) + sideX * lateral * 0.25,
        vy: Math.sin(exhaustHeading) * (8 + Math.random() * 10) + sideY * lateral * 0.25 - 3,
        size: 16 + Math.random() * 10,
        life,
        maxLife: life,
        alpha: 0.3 + Math.random() * 0.09,
      });
    }
  };

  const projectTowArmAtYaw = (yaw) => {
    motionRoot.rotation.set(0, yaw, 0);
    motionRoot.updateMatrixWorld(true);
    const origin = projectModelPoint(modelOriginLocal, motionRoot, camera, 0, 0);
    const tow = projectModelPoint(towPointLocal, motionRoot, camera, 0, 0);
    return { x: tow.x - origin.x, y: tow.y - origin.y };
  };

  const containBody = () => {
    const margin = Math.min(
      RIGID_TOW_CURSOR_CONFIG.boundaryMargin,
      width * 0.18,
      height * 0.18,
    );
    if (state.currentX < margin) {
      state.currentX = margin;
      state.velocityX = Math.max(0, state.velocityX)
        * RIGID_TOW_CURSOR_CONFIG.boundaryRestitution;
    } else if (state.currentX > width - margin) {
      state.currentX = width - margin;
      state.velocityX = Math.min(0, state.velocityX)
        * RIGID_TOW_CURSOR_CONFIG.boundaryRestitution;
    }
    if (state.currentY < margin) {
      state.currentY = margin;
      state.velocityY = Math.max(0, state.velocityY)
        * RIGID_TOW_CURSOR_CONFIG.boundaryRestitution;
    } else if (state.currentY > height - margin) {
      state.currentY = height - margin;
      state.velocityY = Math.min(0, state.velocityY)
        * RIGID_TOW_CURSOR_CONFIG.boundaryRestitution;
    }
  };

  const render = (now) => {
    state.frameId = null;
    if (disposed || !state.requested || !intersecting || document.hidden) return;
    const deltaSeconds = clampRange((now - state.lastFrameAt) / 1000, 0, 0.05);
    state.lastFrameAt = now;
    state.pointerVelocityX = damp(
      state.pointerVelocityX,
      0,
      RIGID_TOW_CURSOR_CONFIG.inputDecay,
      deltaSeconds,
    );
    state.pointerVelocityY = damp(
      state.pointerVelocityY,
      0,
      RIGID_TOW_CURSOR_CONFIG.inputDecay,
      deltaSeconds,
    );
    const next = stepTowRigidBody(
      {
        x: state.currentX,
        y: state.currentY,
        velocityX: state.velocityX,
        velocityY: state.velocityY,
        angle: state.yaw,
        angularVelocity: state.angularVelocity,
      },
      {
        x: state.pointerX,
        y: state.pointerY,
        velocityX: state.pointerVelocityX,
        velocityY: state.pointerVelocityY,
        active: state.engaged,
      },
      deltaSeconds,
      RIGID_TOW_CURSOR_CONFIG,
      projectTowArmAtYaw,
    );
    state.currentX = next.x;
    state.currentY = next.y;
    state.velocityX = next.velocityX;
    state.velocityY = next.velocityY;
    state.yaw = next.angle;
    state.angularVelocity = next.angularVelocity;
    state.towForceX = next.forceX;
    state.towForceY = next.forceY;
    state.lateralForce = next.lateralForce;
    state.towTorque = next.torque;
    state.alignmentError = next.alignmentError;
    state.towDistance = next.towDistance;
    containBody();

    const pitchTarget = clampRange(
      -next.longitudinalForce / RIGID_TOW_CURSOR_CONFIG.maxTowForce
        * RIGID_TOW_CURSOR_CONFIG.pitchLimit,
      -RIGID_TOW_CURSOR_CONFIG.pitchLimit,
      RIGID_TOW_CURSOR_CONFIG.pitchLimit,
    );
    const rollTarget = clampRange(
      -next.lateralForce / RIGID_TOW_CURSOR_CONFIG.maxTowForce
        * RIGID_TOW_CURSOR_CONFIG.rollLimit
        - state.angularVelocity / RIGID_TOW_CURSOR_CONFIG.maxAngularVelocity
          * RIGID_TOW_CURSOR_CONFIG.rollLimit * 0.22,
      -RIGID_TOW_CURSOR_CONFIG.rollLimit,
      RIGID_TOW_CURSOR_CONFIG.rollLimit,
    );
    state.pitch = damp(
      state.pitch,
      pitchTarget,
      RIGID_TOW_CURSOR_CONFIG.poseResponse,
      deltaSeconds,
    );
    state.roll = damp(
      state.roll,
      rollTarget,
      RIGID_TOW_CURSOR_CONFIG.poseResponse,
      deltaSeconds,
    );
    motionRoot.rotation.set(state.pitch, state.yaw, state.roll);
    motionRoot.updateMatrixWorld(true);

    const projectedOrigin = projectModelPoint(modelOriginLocal, motionRoot, camera, 0, 0);
    const projectedTow = projectModelPoint(towPointLocal, motionRoot, camera, 0, 0);
    const physicsFront = {
      x: state.currentX + next.towArmX,
      y: state.currentY + next.towArmY,
    };
    state.towDistance = Math.hypot(
      state.pointerX - physicsFront.x,
      state.pointerY - physicsFront.y,
    );
    const canvasCenter = centerForTowAttachment(
      physicsFront,
      projectedTow,
      projectedOrigin,
    );
    carCanvas.style.transform = `translate3d(${canvasCenter.x - RIGID_TOW_CURSOR_CONFIG.canvasSize / 2}px, ${canvasCenter.y - RIGID_TOW_CURSOR_CONFIG.canvasSize / 2}px, 0)`;
    const front = projectModelPoint(
      towPointLocal,
      motionRoot,
      camera,
      canvasCenter.x,
      canvasCenter.y,
    );
    const rear = projectModelPoint(
      rearPointLocal,
      motionRoot,
      camera,
      canvasCenter.x,
      canvasCenter.y,
    );
    if (!state.smokeSeeded) {
      state.lastSmokeX = rear.x;
      state.lastSmokeY = rear.y;
      state.smokeSeeded = true;
    }
    const movement = Math.hypot(
      state.currentX - state.lastFrameX,
      state.currentY - state.lastFrameY,
    );
    const smokeDistance = Math.hypot(
      rear.x - state.lastSmokeX,
      rear.y - state.lastSmokeY,
    );
    const followerSpeed = Math.hypot(state.velocityX, state.velocityY);
    const recentlyMoved = now - state.lastPointerAt < 150;
    const spawnCount = recentlyMoved && movement > 0.3
      ? smokeSpawnCount(smokeDistance, RIGID_TOW_CURSOR_CONFIG.smokeSpacing, 2)
      : 0;
    if (spawnCount > 0) {
      spawnSmoke(spawnCount, front, rear);
      state.lastSmokeX = rear.x;
      state.lastSmokeY = rear.y;
    }
    if (state.ready && state.visible) renderer.render(scene, camera);
    const forwardLength = Math.max(Math.hypot(next.towArmX, next.towArmY), 1);
    drawEffects(
      deltaSeconds,
      front,
      { x: state.currentX, y: state.currentY },
      { x: next.towArmX / forwardLength, y: next.towArmY / forwardLength },
      next.lateralForce,
    );
    state.lastFrameX = state.currentX;
    state.lastFrameY = state.currentY;
    layer.dataset.yaw = state.yaw.toFixed(4);
    layer.dataset.angularVelocity = state.angularVelocity.toFixed(4);
    layer.dataset.towDistance = state.towDistance.toFixed(2);
    layer.dataset.lateralForce = state.lateralForce.toFixed(1);
    layer.dataset.translationGate = next.translationGate.toFixed(3);
    const jointError = state.engaged
      ? Math.abs(state.towDistance - RIGID_TOW_CURSOR_CONFIG.towRestLength)
      : 0;
    const rotationActivity = Math.max(
      Math.abs(state.angularVelocity),
      Math.abs(state.alignmentError),
      Math.abs(state.pitch),
      Math.abs(state.roll),
    );
    if (shouldPauseCursor({
      visible: state.visible,
      particleCount: state.particles.length,
      idleMilliseconds: now - state.lastPointerAt,
      lag: jointError,
      speed: followerSpeed,
      headingError: rotationActivity,
    })) {
      state.running = false;
      layer.dataset.rendering = "false";
      return;
    }
    state.frameId = window.requestAnimationFrame(render);
  };

  const startRendering = () => {
    if (
      state.running
      || !state.requested
      || !intersecting
      || document.hidden
    ) return;
    state.running = true;
    layer.dataset.rendering = "true";
    state.lastFrameAt = performance.now();
    state.frameId = window.requestAnimationFrame(render);
  };

  const beginSettle = () => {
    if (!state.visible || !state.engaged) return;
    setEngaged(false);
    state.lastPointerAt = performance.now();
    startRendering();
  };

  const updatePointer = (event) => {
    if (
      !state.requested
      || !event.isPrimary
      || !supportsCursorPointer(event.pointerType)
    ) return;
    const bounds = container.getBoundingClientRect();
    const nextX = event.clientX - bounds.left;
    const nextY = event.clientY - bounds.top;
    const inStage = nextX >= 0 && nextX <= width && nextY >= 0 && nextY <= height;
    const nativeCursor = event.target instanceof Element
      && Boolean(event.target.closest(NATIVE_CURSOR_SELECTOR));
    if (!inStage || nativeCursor || !state.ready) {
      beginSettle();
      return;
    }
    const now = performance.now();
    const deltaX = nextX - state.previousPointerX;
    const deltaY = nextY - state.previousPointerY;
    const inputDelta = state.lastInputAt > 0
      ? clampRange((now - state.lastInputAt) / 1000, 1 / 240, 0.08)
      : 1 / 60;
    state.pointerVelocityX = damp(
      state.pointerVelocityX,
      deltaX / inputDelta,
      RIGID_TOW_CURSOR_CONFIG.inputResponse,
      inputDelta,
    );
    state.pointerVelocityY = damp(
      state.pointerVelocityY,
      deltaY / inputDelta,
      RIGID_TOW_CURSOR_CONFIG.inputResponse,
      inputDelta,
    );
    state.pointerType = event.pointerType || "mouse";
    state.pointerX = nextX;
    state.pointerY = nextY;
    state.previousPointerX = nextX;
    state.previousPointerY = nextY;
    state.lastInputAt = now;
    state.lastPointerAt = now;
    placePoint(nextX, nextY);
    const wasVisible = state.visible;
    setFollowerVisible(true);
    setEngaged(true);
    if (!wasVisible) {
      state.yaw = 0;
      const initialArm = projectTowArmAtYaw(state.yaw);
      const initialArmLength = Math.max(Math.hypot(initialArm.x, initialArm.y), 1);
      const initialFrontX = nextX
        - initialArm.x / initialArmLength * RIGID_TOW_CURSOR_CONFIG.towRestLength;
      const initialFrontY = nextY
        - initialArm.y / initialArmLength * RIGID_TOW_CURSOR_CONFIG.towRestLength;
      state.currentX = initialFrontX - initialArm.x;
      state.currentY = initialFrontY - initialArm.y;
      state.velocityX = 0;
      state.velocityY = 0;
      state.angularVelocity = 0;
      state.pointerVelocityX = 0;
      state.pointerVelocityY = 0;
      state.pitch = 0;
      state.roll = 0;
      state.lastFrameX = state.currentX;
      state.lastFrameY = state.currentY;
      state.lastSmokeX = initialFrontX;
      state.lastSmokeY = initialFrontY;
      state.smokeSeeded = false;
    }
    startRendering();
  };

  const handlePointerEnd = (event) => {
    if (event.isPrimary && supportsCursorPointer(event.pointerType)) beginSettle();
  };
  const handleVisibility = () => {
    if (!document.hidden) {
      if (state.requested) startRendering();
      return;
    }
    state.running = false;
    state.particles = [];
    setEngaged(false);
    layer.dataset.active = "false";
    layer.dataset.rendering = "false";
    if (state.frameId !== null) window.cancelAnimationFrame(state.frameId);
    state.frameId = null;
    smokeContext.clearRect(0, 0, width, height);
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      intersecting = Boolean(entry?.isIntersecting);
      if (!intersecting && state.frameId !== null) {
        window.cancelAnimationFrame(state.frameId);
        state.frameId = null;
        state.running = false;
        layer.dataset.rendering = "false";
      } else if (state.requested) {
        startRendering();
      }
    },
    { rootMargin: "180px 0px" },
  );
  intersectionObserver.observe(container);
  container.addEventListener("pointerdown", updatePointer, { passive: true });
  container.addEventListener("pointermove", updatePointer, { passive: true });
  container.addEventListener("pointerup", handlePointerEnd, { passive: true });
  container.addEventListener("pointercancel", handlePointerEnd, { passive: true });
  container.addEventListener("pointerleave", beginSettle, { passive: true });
  document.addEventListener("visibilitychange", handleVisibility);
  resize();

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(
    options.modelUrl ?? RIGID_TOW_DEMO_MODEL,
    (gltf) => {
      if (disposed) return;
      loadedModel = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(loadedModel);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      const longest = Math.max(size.x, size.z, 1);
      const scale = BASE_MODEL_SPAN * RIGID_TOW_CURSOR_CONFIG.visibleScale / longest;
      loadedModel.scale.setScalar(scale);
      loadedModel.position.copy(center).multiplyScalar(-scale);
      loadedModel.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.frustumCulled = false;
        object.castShadow = true;
        object.receiveShadow = false;
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        object.renderOrder = Math.max(...materials.map(stabilizeCursorMaterial));
      });
      motionRoot.add(loadedModel);
      const halfLength = size.z * scale / 2;
      const halfHeight = size.y * scale / 2;
      towPointLocal.set(
        0,
        halfHeight * 0.08,
        RIGID_TOW_CURSOR_CONFIG.frontAxis * halfLength
          * RIGID_TOW_CURSOR_CONFIG.towPointRatio,
      );
      rearPointLocal.set(
        0,
        -halfHeight * 0.02,
        -RIGID_TOW_CURSOR_CONFIG.frontAxis * halfLength * 0.92,
      );
      const groundY = -halfHeight - 0.035;
      shadowPlane.position.y = groundY;
      const reflectionRoot = new THREE.Group();
      const reflection = loadedModel.clone(true);
      reflection.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.castShadow = false;
        object.receiveShadow = false;
        if (Array.isArray(object.material)) {
          object.material = object.material.map((material) => {
            const reflected = makeReflectionMaterial(material);
            reflectionMaterials.push(reflected);
            return reflected;
          });
        } else {
          const reflected = makeReflectionMaterial(object.material);
          reflectionMaterials.push(reflected);
          object.material = reflected;
        }
      });
      reflectionRoot.position.y = groundY * 2;
      reflectionRoot.scale.y = -1;
      reflectionRoot.add(reflection);
      motionRoot.add(reflectionRoot);
      state.ready = true;
      layer.dataset.status = "ready";
      layer.dataset.modelScale = String(RIGID_TOW_CURSOR_CONFIG.visibleScale);
      layer.dataset.modelLoads = "1";
    },
    undefined,
    () => {
      state.ready = false;
      layer.dataset.status = "model-unavailable";
      setEngaged(false);
      setFollowerVisible(false);
      fallbackElement = drawStaticFallback(container);
    },
  );

  return {
    start() {
      state.requested = true;
      if (state.visible) startRendering();
    },
    pause() {
      state.requested = false;
      setEngaged(false);
      state.running = false;
      layer.dataset.rendering = "false";
      if (state.frameId !== null) window.cancelAnimationFrame(state.frameId);
      state.frameId = null;
    },
    resize,
    destroy() {
      if (disposed) return;
      disposed = true;
      state.requested = false;
      state.running = false;
      if (state.frameId !== null) window.cancelAnimationFrame(state.frameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      container.removeEventListener("pointerdown", updatePointer);
      container.removeEventListener("pointermove", updatePointer);
      container.removeEventListener("pointerup", handlePointerEnd);
      container.removeEventListener("pointercancel", handlePointerEnd);
      container.removeEventListener("pointerleave", beginSettle);
      document.removeEventListener("visibilitychange", handleVisibility);
      container.style.cursor = originalCursor;
      if (computedPosition === "static") container.style.position = originalPosition;
      loadedModel?.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach(disposeMaterial);
        else disposeMaterial(object.material);
      });
      reflectionMaterials.forEach((material) => material.dispose());
      shadowGeometry.dispose();
      shadowMaterial.dispose();
      renderer.dispose();
      fallbackElement?.remove();
      layer.remove();
    },
  };
}
