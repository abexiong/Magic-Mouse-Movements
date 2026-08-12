const TAU = Math.PI * 2;

/** @param {number} value @param {number} min @param {number} max */
export function clampRange(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Separate solid body panels from genuinely translucent glass so Three.js does
 * not depth-sort the complete vehicle as one stack of blended surfaces.
 *
 * @param {number} opacity
 */
export function cursorMaterialPolicy(opacity) {
  const normalizedOpacity = clampRange(opacity, 0, 1);
  const solid = normalizedOpacity >= 0.9;
  return {
    transparent: !solid,
    depthWrite: solid,
    opacity: solid ? 1 : normalizedOpacity,
    alphaTest: solid ? 0.02 : 0,
    renderOrder: solid ? 0 : 3,
  };
}

/**
 * @param {{ finePointer: boolean, coarsePointer?: boolean, reducedMotion: boolean, saveData: boolean, forcedStatic: boolean, webgl: boolean }} policy
 */
export function rigidTowCursorEligibility(policy) {
  return (policy.finePointer || Boolean(policy.coarsePointer))
    && !policy.reducedMotion
    && !policy.saveData
    && !policy.forcedStatic
    && policy.webgl;
}

/** @param {number} current @param {number} target @param {number} response @param {number} deltaSeconds */
export function damp(current, target, response, deltaSeconds) {
  const ratio = 1 - Math.exp(-response * clampRange(deltaSeconds, 0, 0.05));
  return current + (target - current) * ratio;
}

/** @param {number} angle */
export function normalizeAngle(angle) {
  return ((angle + Math.PI) % TAU + TAU) % TAU - Math.PI;
}

/** @param {number} from @param {number} to */
export function shortestAngleDifference(from, to) {
  return normalizeAngle(to - from);
}

/**
 * @param {{ x: number, y: number }} attachment
 * @param {{ x: number, y: number }} projectedAttachment
 * @param {{ x: number, y: number }} projectedOrigin
 */
export function centerForTowAttachment(attachment, projectedAttachment, projectedOrigin) {
  return {
    x: attachment.x - (projectedAttachment.x - projectedOrigin.x),
    y: attachment.y - (projectedAttachment.y - projectedOrigin.y),
  };
}

/**
 * @param {{ x: number, y: number }} center
 * @param {{ x: number, y: number }} arm
 */
export function towAttachmentPosition(center, arm) {
  return { x: center.x + arm.x, y: center.y + arm.y };
}

/**
 * @param {number} angle
 * @param {number} distance
 */
export function circularTowArm(angle, distance) {
  return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
}

/**
 * @typedef {{
 *   x: number,
 *   y: number,
 *   velocityX: number,
 *   velocityY: number,
 *   angle: number,
 *   angularVelocity: number
 * }} RigidTowBody
 *
 * @typedef {{
 *   x: number,
 *   y: number,
 *   velocityX?: number,
 *   velocityY?: number,
 *   active: boolean
 * }} TowTarget
 *
 * @typedef {{
 *   mass: number,
 *   momentOfInertia: number,
 *   springStiffness: number,
 *   springDamping: number,
 *   linearDamping: number,
 *   lateralVelocityDamping: number,
 *   angularDamping: number,
 *   jointAlignmentTorque: number,
 *   alignmentDeadZone: number,
 *   velocityAlignmentTorque: number,
 *   alignmentSpeed: number,
 *   maxLateralForceRatio: number,
 *   reverseForceRatio: number,
 *   translationAlignmentPower: number,
 *   towRestLength: number,
 *   maxTowForce: number,
 *   maxTowTorque: number,
 *   maxLinearSpeed: number,
 *   maxAngularVelocity: number,
 *   maxAngularAcceleration: number,
 *   rotationDirection: 1 | -1,
 *   maxDelta: number,
 *   maxSubstep: number
 * }} RigidTowConfig
 */

/**
 * Advance a two-dimensional rigid body pulled only through its front attachment.
 * The tow-arm callback may project a three-dimensional model hook into screen space.
 *
 * @param {RigidTowBody} body
 * @param {TowTarget} target
 * @param {number} deltaSeconds
 * @param {RigidTowConfig} config
 * @param {(angle: number) => { x: number, y: number }} towArmAtAngle
 */
export function stepTowRigidBody(body, target, deltaSeconds, config, towArmAtAngle) {
  const delta = clampRange(deltaSeconds, 0, config.maxDelta);
  if (delta === 0) {
    const arm = towArmAtAngle(body.angle);
    const attachment = towAttachmentPosition(body, arm);
    return {
      ...body,
      towArmX: arm.x,
      towArmY: arm.y,
      attachmentX: attachment.x,
      attachmentY: attachment.y,
      forceX: 0,
      forceY: 0,
      longitudinalForce: 0,
      lateralForce: 0,
      rawLateralForce: 0,
      forwardX: arm.x / Math.max(Math.hypot(arm.x, arm.y), 1),
      forwardY: arm.y / Math.max(Math.hypot(arm.x, arm.y), 1),
      translationGate: 0,
      torque: 0,
      alignmentError: 0,
      towDistance: Math.hypot(target.x - attachment.x, target.y - attachment.y),
    };
  }

  const substeps = Math.max(1, Math.ceil(delta / config.maxSubstep));
  const step = delta / substeps;
  let x = body.x;
  let y = body.y;
  let velocityX = body.velocityX;
  let velocityY = body.velocityY;
  let angle = body.angle;
  let angularVelocity = body.angularVelocity;
  let forceX = 0;
  let forceY = 0;
  let longitudinalForce = 0;
  let lateralForce = 0;
  let rawLateralForce = 0;
  let forwardX = 1;
  let forwardY = 0;
  let translationGate = 0;
  let torque = 0;
  let towDistance;
  let alignmentError = 0;

  for (let index = 0; index < substeps; index += 1) {
    const arm = towArmAtAngle(angle);
    const attachmentX = x + arm.x;
    const attachmentY = y + arm.y;
    const deltaX = target.x - attachmentX;
    const deltaY = target.y - attachmentY;
    towDistance = Math.hypot(deltaX, deltaY);
    forceX = 0;
    forceY = 0;
    torque = 0;

    if (target.active && towDistance > 1e-6) {
      const armLength = Math.max(Math.hypot(arm.x, arm.y), 1e-6);
      forwardX = arm.x / armLength;
      forwardY = arm.y / armLength;
      const lateralX = -forwardY;
      const lateralY = forwardX;
      const directionX = deltaX / towDistance;
      const directionY = deltaY / towDistance;
      const attachmentVelocityX = velocityX - angularVelocity * arm.y;
      const attachmentVelocityY = velocityY + angularVelocity * arm.x;
      const relativeVelocityX = (target.velocityX ?? 0) - attachmentVelocityX;
      const relativeVelocityY = (target.velocityY ?? 0) - attachmentVelocityY;
      const relativeSpeed = relativeVelocityX * directionX + relativeVelocityY * directionY;
      const extension = towDistance - config.towRestLength;
      const forceMagnitude = clampRange(
        config.springStiffness * extension + config.springDamping * relativeSpeed,
        -config.maxTowForce,
        config.maxTowForce,
      );
      const rawForceX = directionX * forceMagnitude;
      const rawForceY = directionY * forceMagnitude;
      const rawLongitudinalForce = rawForceX * forwardX + rawForceY * forwardY;
      rawLateralForce = rawForceX * lateralX + rawForceY * lateralY;

      const forwardAlignment = clampRange(
        directionX * forwardX + directionY * forwardY,
        0,
        1,
      );
      translationGate = forwardAlignment ** config.translationAlignmentPower;
      longitudinalForce = rawLongitudinalForce >= 0
        ? rawLongitudinalForce * translationGate
        : rawLongitudinalForce * config.reverseForceRatio;
      const lateralForceLimit = config.maxTowForce * config.maxLateralForceRatio;
      lateralForce = clampRange(
        rawLateralForce,
        -lateralForceLimit,
        lateralForceLimit,
      );
      forceX = forwardX * longitudinalForce + lateralX * lateralForce;
      forceY = forwardY * longitudinalForce + lateralY * lateralForce;
      let screenTorque = arm.x * forceY - arm.y * forceX;

      const armHeading = Math.atan2(arm.y, arm.x);
      const targetHeading = Math.atan2(target.y - y, target.x - x);
      const rawAlignmentError = shortestAngleDifference(armHeading, targetHeading);
      alignmentError = Math.abs(rawAlignmentError) <= config.alignmentDeadZone
        ? 0
        : rawAlignmentError - Math.sign(rawAlignmentError) * config.alignmentDeadZone;
      screenTorque += alignmentError * config.jointAlignmentTorque;

      const speed = Math.hypot(velocityX, velocityY);
      if (speed > config.alignmentSpeed) {
        const velocityHeading = Math.atan2(velocityY, velocityX);
        const velocityAlignmentError = shortestAngleDifference(armHeading, velocityHeading);
        const alignmentScale = clampRange(
          (speed - config.alignmentSpeed) / Math.max(config.alignmentSpeed, 1),
          0,
          1,
        );
        screenTorque += velocityAlignmentError
          * config.velocityAlignmentTorque
          * alignmentScale;
      }
      torque = clampRange(
        screenTorque * config.rotationDirection,
        -config.maxTowTorque,
        config.maxTowTorque,
      );
    }

    const armForDamping = towArmAtAngle(angle);
    const dampingArmLength = Math.max(Math.hypot(armForDamping.x, armForDamping.y), 1e-6);
    const dampingForwardX = armForDamping.x / dampingArmLength;
    const dampingForwardY = armForDamping.y / dampingArmLength;
    const dampingLateralX = -dampingForwardY;
    const dampingLateralY = dampingForwardX;
    const lateralVelocity = velocityX * dampingLateralX + velocityY * dampingLateralY;
    const lateralDragX = -config.lateralVelocityDamping * lateralVelocity * dampingLateralX;
    const lateralDragY = -config.lateralVelocityDamping * lateralVelocity * dampingLateralY;
    const accelerationX = forceX / config.mass
      - config.linearDamping * velocityX
      + lateralDragX;
    const accelerationY = forceY / config.mass
      - config.linearDamping * velocityY
      + lateralDragY;
    velocityX += accelerationX * step;
    velocityY += accelerationY * step;
    const speed = Math.hypot(velocityX, velocityY);
    if (speed > config.maxLinearSpeed) {
      velocityX = velocityX / speed * config.maxLinearSpeed;
      velocityY = velocityY / speed * config.maxLinearSpeed;
    }
    x += velocityX * step;
    y += velocityY * step;

    const angularAcceleration = clampRange(
      torque / config.momentOfInertia - config.angularDamping * angularVelocity,
      -config.maxAngularAcceleration,
      config.maxAngularAcceleration,
    );
    angularVelocity = clampRange(
      angularVelocity + angularAcceleration * step,
      -config.maxAngularVelocity,
      config.maxAngularVelocity,
    );
    angle = normalizeAngle(angle + angularVelocity * step);
  }

  const arm = towArmAtAngle(angle);
  const attachment = towAttachmentPosition({ x, y }, arm);
  return {
    x,
    y,
    velocityX,
    velocityY,
    angle,
    angularVelocity,
    towArmX: arm.x,
    towArmY: arm.y,
    attachmentX: attachment.x,
    attachmentY: attachment.y,
    forceX,
    forceY,
    longitudinalForce,
    lateralForce,
    rawLateralForce,
    forwardX,
    forwardY,
    translationGate,
    torque,
    alignmentError,
    towDistance: Math.hypot(target.x - attachment.x, target.y - attachment.y),
  };
}

/** @param {number} distance @param {number} spacing @param {number} cap */
export function smokeSpawnCount(distance, spacing = 8, cap = 3) {
  if (distance < spacing) return 0;
  return Math.min(cap, Math.floor(distance / spacing));
}

/** @param {string} pointerType */
export function supportsCursorPointer(pointerType) {
  return pointerType === "mouse" || pointerType === "pen" || pointerType === "touch";
}

/**
 * @param {{ visible: boolean, particleCount: number, idleMilliseconds: number, lag: number, speed?: number, headingError: number }} state
 */
export function shouldPauseCursor(state) {
  if (state.particleCount > 0) return false;
  if (!state.visible) return true;
  return state.idleMilliseconds >= 320
    && state.lag < 0.75
    && (state.speed ?? 0) < 2
    && state.headingError < 0.02;
}
