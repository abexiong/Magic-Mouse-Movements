import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  rigidTowCursorEligibility,
  centerForTowAttachment,
  circularTowArm,
  cursorMaterialPolicy,
  damp,
  normalizeAngle,
  shortestAngleDifference,
  shouldPauseCursor,
  smokeSpawnCount,
  stepTowRigidBody,
  supportsCursorPointer,
  towAttachmentPosition,
} from "../dist/kits/rigid-tow-artifact-cursor/rigid-tow-math.js";
import {
  rigidTowAssemblyAmount,
  rigidTowAssemblyPhase,
} from "../dist/kits/rigid-tow-artifact-cursor/assembly-story.js";

const eligiblePolicy = {
  finePointer: true,
  coarsePointer: false,
  reducedMotion: false,
  saveData: false,
  forcedStatic: false,
  webgl: true,
};

const rigidTowConfig = {
  mass: 2.4,
  momentOfInertia: 3400,
  springStiffness: 58,
  springDamping: 14,
  linearDamping: 2.9,
  lateralVelocityDamping: 8.5,
  angularDamping: 5,
  jointAlignmentTorque: 42000,
  alignmentDeadZone: 1.5 * Math.PI / 180,
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
  rotationDirection: 1,
  maxDelta: 0.05,
  maxSubstep: 1 / 120,
};

const armAtAngle = (angle) => circularTowArm(angle, 26);

const initialBody = () => ({
  x: 0,
  y: 0,
  velocityX: 0,
  velocityY: 0,
  angle: 0,
  angularVelocity: 0,
});

test("assembly story expands, holds, and returns to the identical assembled state", () => {
  assert.equal(rigidTowAssemblyAmount(0), 0);
  assert.equal(rigidTowAssemblyAmount(0.1), 0);
  assert.ok(rigidTowAssemblyAmount(0.26) > 0.45);
  assert.equal(rigidTowAssemblyAmount(0.42), 1);
  assert.equal(rigidTowAssemblyAmount(0.58), 1);
  assert.ok(rigidTowAssemblyAmount(0.75) > 0 && rigidTowAssemblyAmount(0.75) < 1);
  assert.equal(rigidTowAssemblyAmount(0.92), 0);
  assert.equal(rigidTowAssemblyAmount(1), 0);
  assert.equal(rigidTowAssemblyPhase(0.05), "assembled");
  assert.equal(rigidTowAssemblyPhase(0.3), "expanding");
  assert.equal(rigidTowAssemblyPhase(0.5), "exploded");
  assert.equal(rigidTowAssemblyPhase(0.7), "reassembling");
  assert.equal(rigidTowAssemblyPhase(1), "assembled");
});

function assertFiniteBody(body) {
  for (const key of [
    "x",
    "y",
    "velocityX",
    "velocityY",
    "angle",
    "angularVelocity",
    "attachmentX",
    "attachmentY",
  ]) {
    assert.equal(Number.isFinite(body[key]), true, key);
  }
  assert.ok(Math.abs(body.angularVelocity) <= rigidTowConfig.maxAngularVelocity + 1e-9);
  assert.ok(body.angle >= -Math.PI && body.angle < Math.PI);
}

function runPath({ fps, seconds, targetAt, body = initialBody() }) {
  let current = body;
  let maximumTowDistance = 0;
  let maximumAngleStep = 0;
  for (let frame = 0; frame < Math.round(fps * seconds); frame += 1) {
    const time = frame / fps;
    const next = stepTowRigidBody(
      current,
      targetAt(time, current),
      1 / fps,
      rigidTowConfig,
      armAtAngle,
    );
    maximumTowDistance = Math.max(maximumTowDistance, next.towDistance);
    maximumAngleStep = Math.max(
      maximumAngleStep,
      Math.abs(shortestAngleDifference(current.angle, next.angle)),
    );
    assertFiniteBody(next);
    current = next;
  }
  return { body: current, maximumTowDistance, maximumAngleStep };
}

test("cursor eligibility requires every capability and preference gate", () => {
  assert.equal(rigidTowCursorEligibility(eligiblePolicy), true);
  assert.equal(rigidTowCursorEligibility({
    ...eligiblePolicy,
    finePointer: false,
    coarsePointer: true,
  }), true);
  assert.equal(rigidTowCursorEligibility({
    ...eligiblePolicy,
    finePointer: false,
    coarsePointer: false,
  }), false);
  for (const key of ["reducedMotion", "saveData", "forcedStatic"]) {
    assert.equal(rigidTowCursorEligibility({ ...eligiblePolicy, [key]: true }), false, key);
  }
  assert.equal(rigidTowCursorEligibility({ ...eligiblePolicy, webgl: false }), false);
});

test("damping advances without overshooting and clamps long frames", () => {
  const first = damp(0, 100, 24, 1 / 60);
  assert.ok(first > 0 && first < 100);
  assert.equal(damp(4, 4, 24, 1), 4);
  assert.ok(damp(0, 100, 24, 1) < 100);
});

test("solid Audi panels use stable depth while glass remains transparent", () => {
  assert.deepEqual(cursorMaterialPolicy(1), {
    transparent: false,
    depthWrite: true,
    opacity: 1,
    alphaTest: 0.02,
    renderOrder: 0,
  });
  assert.deepEqual(cursorMaterialPolicy(0.901961), {
    transparent: false,
    depthWrite: true,
    opacity: 1,
    alphaTest: 0.02,
    renderOrder: 0,
  });
  assert.deepEqual(cursorMaterialPolicy(0.701961), {
    transparent: true,
    depthWrite: false,
    opacity: 0.701961,
    alphaTest: 0,
    renderOrder: 3,
  });
});

test("the fixed front attachment stays on the rigid body centerline", () => {
  const arm = circularTowArm(Math.PI / 2, 26);
  assert.ok(Math.abs(arm.x) < 1e-9);
  assert.ok(Math.abs(arm.y - 26) < 1e-9);
  assert.deepEqual(towAttachmentPosition({ x: 40, y: 60 }, arm), { x: 40, y: 86 });
  assert.deepEqual(centerForTowAttachment(
    { x: 400, y: 250 },
    { x: 28, y: -9 },
    { x: 3, y: 1 },
  ), { x: 375, y: 260 });
});

test("a side pull rotates the nose before translating the center of mass", () => {
  const result = runPath({
    fps: 60,
    seconds: 0.2,
    targetAt: () => ({ x: 26, y: 150, velocityX: 0, velocityY: 0, active: true }),
  });
  assert.ok(result.body.angle > 0.18);
  assert.ok(result.body.y > 0);
  assert.ok(result.body.y < 8);
  assert.ok(Math.abs(result.body.lateralForce) <= (
    rigidTowConfig.maxTowForce * rigidTowConfig.maxLateralForceRatio + 1e-9
  ));
  assert.ok(Math.abs(result.body.rawLateralForce) > Math.abs(result.body.lateralForce));
  assert.ok(result.body.translationGate < 0.2);
});

test("mirrored camera projection maps screen torque into Three.js yaw", () => {
  const mirroredArmAtAngle = (angle) => ({
    x: Math.cos(angle) * 26,
    y: -Math.sin(angle) * 26,
  });
  const next = stepTowRigidBody(
    initialBody(),
    { x: 26, y: -120, velocityX: 0, velocityY: 0, active: true },
    1 / 30,
    { ...rigidTowConfig, rotationDirection: -1 },
    mirroredArmAtAngle,
  );
  const rotatedArm = mirroredArmAtAngle(next.angle);
  assert.ok(next.forceY < 0);
  assert.ok(next.torque > 0);
  assert.ok(next.angle > 0);
  assert.ok(rotatedArm.y < 0);
});

test("circular cursor motion stays finite and keeps the tow joint bounded", () => {
  const result = runPath({
    fps: 60,
    seconds: 8,
    targetAt: (time) => ({
      x: Math.cos(time * 0.9) * 130,
      y: Math.sin(time * 0.9) * 130,
      velocityX: -Math.sin(time * 0.9) * 117,
      velocityY: Math.cos(time * 0.9) * 117,
      active: true,
    }),
  });
  assert.ok(result.maximumTowDistance < 190);
  assert.ok(result.maximumAngleStep < 0.065);
  assert.ok(Math.hypot(result.body.velocityX, result.body.velocityY) < 700);
});

test("rapid reversals preserve momentum without uncontrolled spinning", () => {
  const result = runPath({
    fps: 60,
    seconds: 5,
    targetAt: (time) => {
      const direction = Math.floor(time / 0.22) % 2 === 0 ? 1 : -1;
      return {
        x: direction * 150,
        y: 35,
        velocityX: 0,
        velocityY: 0,
        active: true,
      };
    },
  });
  assert.ok(result.maximumTowDistance < 260);
  assert.ok(result.maximumAngleStep < 0.065);
});

test("a rear pull turns the nose before allowing meaningful reverse translation", () => {
  const result = runPath({
    fps: 60,
    seconds: 0.35,
    targetAt: () => ({ x: -170, y: 24, velocityX: 0, velocityY: 0, active: true }),
  });
  assert.ok(Math.abs(result.body.angle) > 0.55);
  assert.ok(result.body.x > -9);
  assert.ok(result.body.translationGate < 0.2);
});

test("a stationary target finishes a fast reversal with the nose leading", () => {
  const alignedRight = runPath({
    fps: 60,
    seconds: 2.5,
    targetAt: () => ({ x: 180, y: 0, velocityX: 0, velocityY: 0, active: true }),
  }).body;
  const reversed = runPath({
    fps: 60,
    seconds: 6,
    body: alignedRight,
    targetAt: () => ({ x: -180, y: 0, velocityX: 0, velocityY: 0, active: true }),
  }).body;
  const noseDistance = Math.hypot(-180 - reversed.attachmentX, -reversed.attachmentY);
  const rear = towAttachmentPosition(
    reversed,
    circularTowArm(reversed.angle + Math.PI, 26),
  );
  const rearDistance = Math.hypot(-180 - rear.x, -rear.y);
  assert.ok(noseDistance < rearDistance);
  assert.ok(Math.abs(reversed.alignmentError) <= rigidTowConfig.alignmentDeadZone + 0.01);
  assert.ok(Math.abs(reversed.angularVelocity) < 0.01);
});

test("cursor crossing uses the shortest wrapped angle without flipping", () => {
  assert.ok(Math.abs(shortestAngleDifference(Math.PI - 0.04, -Math.PI + 0.04) - 0.08) < 1e-9);
  const start = { ...initialBody(), angle: Math.PI - 0.03 };
  const result = runPath({
    fps: 120,
    seconds: 3,
    body: start,
    targetAt: (time) => ({
      x: 170 - time * 120,
      y: 55 * Math.sin(time * 4),
      velocityX: -120,
      velocityY: 220 * Math.cos(time * 4),
      active: true,
    }),
  });
  assert.ok(result.maximumAngleStep < 0.035);
  assert.ok(Math.abs(normalizeAngle(result.body.angle)) <= Math.PI);
});

test("pointer release lets linear and angular momentum settle", () => {
  const pulled = runPath({
    fps: 60,
    seconds: 1.2,
    targetAt: () => ({ x: 150, y: 95, velocityX: 100, velocityY: 0, active: true }),
  }).body;
  const initialEnergy = Math.hypot(pulled.velocityX, pulled.velocityY)
    + Math.abs(pulled.angularVelocity) * 100;
  const released = runPath({
    fps: 60,
    seconds: 2.5,
    body: pulled,
    targetAt: () => ({ x: 150, y: 95, active: false }),
  }).body;
  const releasedEnergy = Math.hypot(released.velocityX, released.velocityY)
    + Math.abs(released.angularVelocity) * 100;
  assert.ok(releasedEnergy < initialEnergy * 0.02);
});

test("pointer exit uses the same free-body settling path", () => {
  const moving = { ...initialBody(), velocityX: 260, velocityY: -90, angularVelocity: 2.2 };
  const exited = runPath({
    fps: 60,
    seconds: 2.5,
    body: moving,
    targetAt: () => ({ x: 0, y: 0, active: false }),
  }).body;
  assert.ok(Math.hypot(exited.velocityX, exited.velocityY) < 0.3);
  assert.ok(Math.abs(exited.angularVelocity) < 0.0001);
});

test("the rigid tow solver remains consistent across frame rates", () => {
  const simulate = (fps) => runPath({
    fps,
    seconds: 4,
    targetAt: (time) => ({
      x: 120 + Math.sin(time * 1.3) * 85,
      y: 80 + Math.cos(time * 0.8) * 65,
      velocityX: Math.cos(time * 1.3) * 110.5,
      velocityY: -Math.sin(time * 0.8) * 52,
      active: true,
    }),
  }).body;
  const at30 = simulate(30);
  const at60 = simulate(60);
  const at120 = simulate(120);
  for (const body of [at30, at60]) {
    assert.ok(Math.hypot(body.x - at120.x, body.y - at120.y) < 8);
    assert.ok(Math.abs(shortestAngleDifference(body.angle, at120.angle)) < 0.08);
  }
});

test("smoke spawning is distance based and capped", () => {
  assert.equal(smokeSpawnCount(7), 0);
  assert.equal(smokeSpawnCount(8), 1);
  assert.equal(smokeSpawnCount(23), 2);
  assert.equal(smokeSpawnCount(100), 3);
});

test("mouse, pen, and touch input are supported", () => {
  assert.equal(supportsCursorPointer("mouse"), true);
  assert.equal(supportsCursorPointer("pen"), true);
  assert.equal(supportsCursorPointer("touch"), true);
  assert.equal(supportsCursorPointer(""), false);
});

test("rendering pauses after motion settles and smoke has cleared", () => {
  assert.equal(shouldPauseCursor({
    visible: false,
    particleCount: 0,
    idleMilliseconds: 0,
    lag: 10,
    headingError: 1,
  }), true);
  assert.equal(shouldPauseCursor({
    visible: true,
    particleCount: 1,
    idleMilliseconds: 500,
    lag: 0,
    headingError: 0,
  }), false);
  assert.equal(shouldPauseCursor({
    visible: true,
    particleCount: 0,
    idleMilliseconds: 400,
    lag: 0.1,
    speed: 0.1,
    headingError: 0.01,
  }), true);
});

test("the public kit preserves the fixed joint, fallbacks, cleanup, and attribution", async () => {
  const source = await readFile(
    new URL("../kits/rigid-tow-artifact-cursor/index.js", import.meta.url),
    "utf8",
  );
  const readme = await readFile(
    new URL("../kits/rigid-tow-artifact-cursor/README.md", import.meta.url),
    "utf8",
  );
  const assemblySource = await readFile(
    new URL("../kits/rigid-tow-artifact-cursor/assembly-story.js", import.meta.url),
    "utf8",
  );

  assert.match(source, /const MAX_PARTICLES = 36/);
  assert.match(source, /visibleScale:\s*0\.5/);
  assert.match(source, /BASE_MODEL_SPAN \* RIGID_TOW_CURSOR_CONFIG\.visibleScale/);
  assert.match(source, /loadedModel\.position\.copy\(center\)\.multiplyScalar\(-scale\)/);
  assert.match(source, /layer\.dataset\.physics = "rigid-front-tow-joint"/);
  assert.match(source, /layer\.dataset\.scope = "container"/);
  assert.match(source, /stepTowRigidBody/);
  assert.match(source, /towPointLocal/);
  assert.match(source, /frontAxis:\s*1/);
  assert.match(source, /towPointRatio:\s*0\.98/);
  assert.match(source, /centerForTowAttachment/);
  assert.match(source, /projectModelPoint/);
  assert.match(source, /motionRoot\.rotation\.set/);
  assert.match(source, /mass:\s*2\.4/);
  assert.match(source, /momentOfInertia:\s*3400/);
  assert.match(source, /springStiffness:\s*58/);
  assert.match(source, /springDamping:\s*14/);
  assert.match(source, /lateralVelocityDamping:\s*8\.5/);
  assert.match(source, /angularDamping:\s*5/);
  assert.match(source, /jointAlignmentTorque:\s*42000/);
  assert.match(source, /maxTowForce:\s*6500/);
  assert.match(source, /maxLateralForceRatio:\s*0\.12/);
  assert.match(source, /translationAlignmentPower:\s*2\.4/);
  assert.match(source, /maxAngularVelocity:\s*3\.4/);
  assert.match(source, /maxAngularAcceleration:\s*24/);
  assert.match(source, /rotationDirection:\s*-1/);
  assert.match(source, /new THREE\.ShadowMaterial/);
  assert.match(source, /reflectionRoot/);
  assert.match(source, /readMotionPolicy\(\{ renderOnCoarsePointer: true \}\)/);
  assert.match(source, /get\("motion"\) === "static"/);
  assert.match(source, /shouldPauseCursor/);
  assert.match(source, /resizeObserver\.disconnect\(\)/);
  assert.match(source, /intersectionObserver\.disconnect\(\)/);
  assert.doesNotMatch(source, /preventDefault\s*\(/);
  assert.doesNotMatch(source, /nearest|closest edge|side attachment|rear attachment/i);
  assert.match(readme, /## Standalone HTML/);
  assert.match(readme, /## React/);
  assert.match(readme, /Randomness/);
  assert.match(readme, /CC BY 4\.0/);
  assert.match(readme, /rigid-tow-artifact-cursor-replay\.mp4/);
  assert.match(readme, /deterministic Three\.js assembly story/);
  assert.match(assemblySource, /createRigidTowAssemblyStory/);
  assert.match(assemblySource, /rigidTowAssemblyAmount/);
  assert.match(assemblySource, /window\.addEventListener\("scroll", handleScroll, \{ passive: true \}\)/);
  assert.match(assemblySource, /layer\.dataset\.rendering = "false"/);
  assert.match(assemblySource, /readMotionPolicy\(\{ renderOnCoarsePointer: true \}\)/);
  assert.match(assemblySource, /get\("motion"\) === "static"/);
  assert.match(assemblySource, /intersectionObserver\.disconnect\(\)/);
  assert.match(assemblySource, /resizeObserver\.disconnect\(\)/);
  assert.doesNotMatch(assemblySource, /preventDefault\s*\(/);
});
