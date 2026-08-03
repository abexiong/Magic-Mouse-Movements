import { createCanvasMovement } from "../../src/core/canvas-movement.js";
import { clear, clamp, seededRandom, TAU } from "../../src/core/drawing.js";
import type {
  CanvasFrame,
  MovementInstance,
  Point,
} from "../../src/core/types.js";

export type FusionFieldOptions = {
  accent?: string;
  digitCount?: number;
  haloRadius?: number;
  hideNativeCursor?: boolean;
  scatterSelector?: string;
  trailLife?: number;
};

type Digit = {
  angle: number;
  character: "0" | "1";
  offsetX: number;
  offsetY: number;
  phase: number;
  radius: number;
  side: 0 | 1;
  size: number;
  speed: number;
  velocityX: number;
  velocityY: number;
};

type TailPoint = Point & { age: number };

type CursorMotion = {
  directionX: number;
  directionY: number;
  seen: boolean;
  speed: number;
  x: number;
  y: number;
};

type ScatterBody = {
  element: HTMLElement;
  height: number;
  homeX: number;
  homeY: number;
  inverseMass: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  rotationVelocity: number;
  velocityX: number;
  velocityY: number;
  width: number;
};

type ScatterTargetState = {
  ariaLabel: string | null;
  element: HTMLElement;
  html: string;
};

const LANE_A = [234, 162, 33] as const;
const LANE_B = [0, 168, 168] as const;
const FUSED = [224, 80, 174] as const;
const MONO = '"SFMono-Regular", Consolas, ui-monospace, monospace';

function mixColor(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  amount: number,
) {
  return [
    Math.round(from[0] + (to[0] - from[0]) * amount),
    Math.round(from[1] + (to[1] - from[1]) * amount),
    Math.round(from[2] + (to[2] - from[2]) * amount),
  ] as const;
}

function prepareScatterTargets(container: HTMLElement, selector?: string) {
  const bodies: ScatterBody[] = [];
  const states: ScatterTargetState[] = [];
  if (!selector) return { bodies, states };

  for (const element of container.querySelectorAll<HTMLElement>(selector)) {
    const text = element.textContent ?? "";
    states.push({
      ariaLabel: element.getAttribute("aria-label"),
      element,
      html: element.innerHTML,
    });
    element.setAttribute("aria-label", text.trim());
    element.textContent = "";

    for (const character of text) {
      if (/\s/.test(character)) {
        element.append(document.createTextNode(character));
        continue;
      }
      const span = document.createElement("span");
      span.textContent = character;
      span.setAttribute("aria-hidden", "true");
      Object.assign(span.style, {
        display: "inline-block",
        pointerEvents: "none",
        transformOrigin: "50% 65%",
        willChange: "transform",
      });
      element.append(span);
      bodies.push({
        element: span,
        height: 0,
        homeX: 0,
        homeY: 0,
        inverseMass: 0.82 + (bodies.length % 5) * 0.055,
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
        rotationVelocity: 0,
        velocityX: 0,
        velocityY: 0,
        width: 0,
      });
    }
  }
  return { bodies, states };
}

function restoreScatterTargets(states: ScatterTargetState[]) {
  for (const state of states) {
    state.element.innerHTML = state.html;
    if (state.ariaLabel === null) state.element.removeAttribute("aria-label");
    else state.element.setAttribute("aria-label", state.ariaLabel);
  }
}

function measureScatterBodies(container: HTMLElement, bodies: ScatterBody[]) {
  const bounds = container.getBoundingClientRect();
  for (const body of bodies) {
    const rect = body.element.getBoundingClientRect();
    body.homeX = rect.left - bounds.left + rect.width / 2 - body.offsetX;
    body.homeY = rect.top - bounds.top + rect.height / 2 - body.offsetY;
    body.width = rect.width;
    body.height = rect.height;
  }
}

function resetScatterBodies(bodies: ScatterBody[]) {
  for (const body of bodies) {
    body.offsetX = 0;
    body.offsetY = 0;
    body.rotation = 0;
    body.rotationVelocity = 0;
    body.velocityX = 0;
    body.velocityY = 0;
    body.element.style.transform = "";
  }
}

function renderScatterBodies(
  frame: CanvasFrame,
  bodies: ScatterBody[],
  haloRadius: number,
  motion: CursorMotion,
) {
  const { delta, pointer } = frame;
  const seconds = Math.min(0.04, delta / 1000);
  const speed = motion.speed;
  const directionX = motion.directionX;
  const directionY = motion.directionY;

  for (const body of bodies) {
    const currentX = body.homeX + body.offsetX;
    const currentY = body.homeY + body.offsetY;
    const dx = currentX - pointer.x;
    const dy = currentY - pointer.y;
    const distance = Math.max(0.01, Math.hypot(dx, dy));
    const reach = haloRadius + Math.max(body.width, body.height) * 0.55;

    if (pointer.active && distance < reach) {
      const influence = 1 - distance / reach;
      const outwardX = dx / distance;
      const outwardY = dy / distance;
      let impulseX = outwardX * 0.72 + directionX * 0.54;
      let impulseY = outwardY * 0.72 + directionY * 0.54;
      const impulseLength = Math.hypot(impulseX, impulseY) || 1;
      impulseX /= impulseLength;
      impulseY /= impulseLength;
      const impulse =
        influence *
        (170 + speed * 1.2) *
        body.inverseMass *
        seconds *
        18;
      body.velocityX += impulseX * impulse;
      body.velocityY += impulseY * impulse;
      body.rotationVelocity +=
        (outwardX * directionY - outwardY * directionX) * impulse * 0.09;
    }

    body.offsetX += body.velocityX * seconds;
    body.offsetY += body.velocityY * seconds;
    const drag = Math.exp(-seconds * 3.5);
    body.velocityX *= drag;
    body.velocityY *= drag;
    const home = Math.exp(-seconds * 1.35);
    body.offsetX *= home;
    body.offsetY *= home;
    body.rotation += body.rotationVelocity * seconds;
    body.rotationVelocity *= Math.exp(-seconds * 3.1);
    body.rotation *= Math.exp(-seconds * 1.45);

    const displacement = Math.hypot(body.offsetX, body.offsetY);
    const maximumDisplacement = Math.min(
      170,
      Math.min(frame.width, frame.height) * 0.34,
    );
    if (displacement > maximumDisplacement) {
      const scale = maximumDisplacement / displacement;
      body.offsetX *= scale;
      body.offsetY *= scale;
    }

    const edgePadding = 8;
    const minimumX = edgePadding + body.width / 2 - body.homeX;
    const maximumX =
      frame.width - edgePadding - body.width / 2 - body.homeX;
    const minimumY = edgePadding + body.height / 2 - body.homeY;
    const maximumY =
      frame.height - edgePadding - body.height / 2 - body.homeY;
    const boundedX = clamp(body.offsetX, minimumX, maximumX);
    const boundedY = clamp(body.offsetY, minimumY, maximumY);
    if (boundedX !== body.offsetX) body.velocityX *= -0.16;
    if (boundedY !== body.offsetY) body.velocityY *= -0.16;
    body.offsetX = boundedX;
    body.offsetY = boundedY;

    const settled =
      Math.abs(body.offsetX) < 0.08 &&
      Math.abs(body.offsetY) < 0.08 &&
      Math.abs(body.rotation) < 0.05 &&
      Math.abs(body.velocityX) < 1 &&
      Math.abs(body.velocityY) < 1;
    if (settled) {
      body.offsetX = 0;
      body.offsetY = 0;
      body.rotation = 0;
      body.velocityX = 0;
      body.velocityY = 0;
      body.element.style.transform = "";
    } else {
      body.element.style.transform =
        `translate3d(${body.offsetX.toFixed(2)}px, ${body.offsetY.toFixed(2)}px, 0) ` +
        `rotate(${body.rotation.toFixed(2)}deg)`;
    }
  }
}

function updateCursorMotion(frame: CanvasFrame, motion: CursorMotion) {
  const seconds = Math.max(0.008, Math.min(0.04, frame.delta / 1000));
  if (!motion.seen || !frame.pointer.active) {
    motion.seen = frame.pointer.active;
    motion.x = frame.pointer.x;
    motion.y = frame.pointer.y;
    motion.speed = 0;
    return;
  }

  const velocityX = (frame.pointer.x - motion.x) / seconds;
  const velocityY = (frame.pointer.y - motion.y) / seconds;
  const rawSpeed = Math.min(3_600, Math.hypot(velocityX, velocityY));
  if (rawSpeed > 1) {
    motion.directionX = velocityX / rawSpeed;
    motion.directionY = velocityY / rawSpeed;
  }
  motion.speed +=
    (rawSpeed - motion.speed) * Math.min(1, seconds * 14);
  if (motion.speed < 0.5) motion.speed = 0;
  motion.x = frame.pointer.x;
  motion.y = frame.pointer.y;
}

function drawTrail(
  frame: CanvasFrame,
  trail: TailPoint[],
  trailLife: number,
) {
  const { context, delta, pointer } = frame;
  const last = trail[trail.length - 1];
  if (
    pointer.active &&
    (!last || Math.hypot(last.x - pointer.x, last.y - pointer.y) > 2.2)
  ) {
    trail.push({ x: pointer.x, y: pointer.y, age: 0 });
    if (trail.length > 150) trail.splice(0, trail.length - 150);
  }

  for (const point of trail) point.age += delta / 1000;
  while (trail[0] && trail[0].age >= trailLife) trail.shift();

  context.save();
  context.globalCompositeOperation = "lighter";
  context.lineCap = "round";
  context.lineJoin = "round";
  for (let index = 1; index < trail.length; index += 1) {
    const from = trail[index - 1];
    const to = trail[index];
    if (!from || !to) continue;
    const life = clamp(1 - to.age / trailLife, 0, 1);
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.strokeStyle = `rgba(224, 80, 174, ${(life * 0.48).toFixed(3)})`;
    context.lineWidth = Math.max(0.5, 3.4 * life);
    context.stroke();

    const ringRadius = 18 * Math.pow(life, 1.2);
    if (ringRadius > 0.8 && index % 2 === 0) {
      context.beginPath();
      context.arc(to.x, to.y, ringRadius, 0, TAU);
      context.strokeStyle = `rgba(234, 100, 190, ${(life * 0.38).toFixed(3)})`;
      context.lineWidth = 0.6 + life * 0.8;
      context.stroke();
    }
  }
  context.restore();
}

function drawPointerHalo(
  frame: CanvasFrame,
  haloRadius: number,
  accent: string,
) {
  const { context, pointer, time } = frame;
  if (!pointer.active || frame.policy.staticFallback) return;

  const pulse = 1 + Math.sin(time * 0.006) * 0.045;
  const glow = context.createRadialGradient(
    pointer.x,
    pointer.y,
    0,
    pointer.x,
    pointer.y,
    haloRadius,
  );
  glow.addColorStop(0, "rgba(255, 235, 250, 0.42)");
  glow.addColorStop(0.15, "rgba(224, 80, 174, 0.28)");
  glow.addColorStop(0.54, "rgba(202, 44, 146, 0.12)");
  glow.addColorStop(1, "rgba(202, 44, 146, 0)");
  context.save();
  context.globalCompositeOperation = "lighter";
  context.fillStyle = glow;
  context.beginPath();
  context.arc(pointer.x, pointer.y, haloRadius, 0, TAU);
  context.fill();

  context.strokeStyle = "rgba(224, 80, 174, 0.52)";
  context.lineWidth = 1.4;
  context.beginPath();
  context.arc(pointer.x, pointer.y, 18 * pulse, 0, TAU);
  context.stroke();

  context.strokeStyle = "rgba(224, 80, 174, 0.2)";
  context.lineWidth = 0.8;
  context.beginPath();
  context.arc(pointer.x, pointer.y, haloRadius * 0.48 * pulse, 0, TAU);
  context.stroke();

  context.fillStyle = accent;
  context.beginPath();
  context.arc(pointer.x, pointer.y, 3.2, 0, TAU);
  context.fill();
  context.restore();
}

export function createFusionField(
  container: HTMLElement,
  options: FusionFieldOptions = {},
): MovementInstance {
  const random = seededRandom(98243);
  const haloRadius = options.haloRadius ?? 118;
  const trailLife = options.trailLife ?? 0.62;
  const digits: Digit[] = Array.from(
    { length: options.digitCount ?? 230 },
    (_, index) => ({
      angle: random() * TAU,
      character: index % 2 === 0 ? "0" : "1",
      offsetX: 0,
      offsetY: 0,
      phase: random() * TAU,
      radius: 28 + Math.pow(random(), 0.58) * 360,
      side: index % 2 === 0 ? 0 : 1,
      size: 0.72 + random() * 0.62,
      speed: 0.72 + random() * 0.66,
      velocityX: 0,
      velocityY: 0,
    }),
  );
  const trail: TailPoint[] = [];
  let scatter = {
    bodies: [] as ScatterBody[],
    states: [] as ScatterTargetState[],
  };
  let scatterPrepared = false;
  const motion: CursorMotion = {
    directionX: 0,
    directionY: 0,
    seen: false,
    speed: 0,
    x: 0,
    y: 0,
  };

  const renderer = {
    render(frame: CanvasFrame) {
      const { context, width, height, pointer, delta, time } = frame;
      if (!frame.policy.staticFallback && !scatterPrepared) {
        scatter = prepareScatterTargets(container, options.scatterSelector);
        scatterPrepared = true;
        measureScatterBodies(container, scatter.bodies);
      }
      clear(context, width, height);
      const center = { x: width * 0.64, y: height * 0.53 };
      const seconds = Math.min(0.04, delta / 1000);
      const maxRadius = Math.hypot(width, height) * 0.49;
      updateCursorMotion(frame, motion);
      const speed = motion.speed;
      const directionX = motion.directionX;
      const directionY = motion.directionY;

      context.save();
      context.strokeStyle = "rgba(111, 150, 222, 0.08)";
      context.lineWidth = 1;
      for (let orbit = 0; orbit < 5; orbit += 1) {
        context.beginPath();
        context.ellipse(
          center.x,
          center.y,
          88 + orbit * 58,
          54 + orbit * 34,
          0,
          0,
          TAU,
        );
        context.stroke();
      }
      context.restore();

      context.save();
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.globalCompositeOperation = "lighter";
      for (const digit of digits) {
        if (!frame.policy.staticFallback) {
          digit.radius -= seconds * (8.5 + digit.radius * 0.032) * digit.speed;
          digit.angle +=
            (digit.side === 0 ? 1 : -1) *
            seconds *
            (0.24 + 52 / Math.max(54, digit.radius)) *
            digit.speed;
          if (digit.radius < 15) {
            digit.radius = maxRadius * (0.74 + random() * 0.26);
            digit.angle = random() * TAU;
            digit.offsetX = 0;
            digit.offsetY = 0;
            digit.velocityX = 0;
            digit.velocityY = 0;
          }
        }

        const orbitX = center.x + Math.cos(digit.angle) * digit.radius * 1.2;
        const orbitY = center.y + Math.sin(digit.angle) * digit.radius * 0.72;
        const currentX = orbitX + digit.offsetX;
        const currentY = orbitY + digit.offsetY;
        const dx = currentX - pointer.x;
        const dy = currentY - pointer.y;
        const distance = Math.max(0.01, Math.hypot(dx, dy));

        if (
          !frame.policy.staticFallback &&
          pointer.active &&
          distance < haloRadius
        ) {
          const influence = 1 - distance / haloRadius;
          const outwardX = dx / distance;
          const outwardY = dy / distance;
          const impulse = influence * (155 + speed * 1.15) * seconds * 15;
          digit.velocityX +=
            (outwardX * 0.82 + directionX * 0.46 - outwardY * 0.12) *
            impulse;
          digit.velocityY +=
            (outwardY * 0.82 + directionY * 0.46 + outwardX * 0.12) *
            impulse;
        }

        if (!frame.policy.staticFallback) {
          digit.offsetX += digit.velocityX * seconds;
          digit.offsetY += digit.velocityY * seconds;
          const friction = Math.exp(-seconds * 2.25);
          digit.velocityX *= friction;
          digit.velocityY *= friction;
          const home = Math.exp(-seconds * 0.95);
          digit.offsetX *= home;
          digit.offsetY *= home;
          const displacement = Math.hypot(digit.offsetX, digit.offsetY);
          if (displacement > 260) {
            const scale = 260 / displacement;
            digit.offsetX *= scale;
            digit.offsetY *= scale;
          }
        }

        const depth = clamp(1 - digit.radius / Math.max(1, maxRadius), 0, 1);
        const fuse = Math.pow(clamp(1 - digit.radius / (maxRadius * 0.54), 0, 1), 1.45);
        const base = digit.side === 0 ? LANE_A : LANE_B;
        const color = mixColor(base, FUSED, fuse);
        const twinkle = Math.sin(time * 0.0021 + digit.phase) * 0.1;
        const alpha = clamp(0.14 + depth * 0.66 + twinkle, 0.08, 0.9);
        const fontSize = Math.round((7 + depth * 7) * digit.size);
        context.font = `${Math.max(5, fontSize)}px ${MONO}`;
        context.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha.toFixed(3)})`;
        context.fillText(
          digit.character,
          orbitX + digit.offsetX,
          orbitY + digit.offsetY,
        );
      }
      context.restore();

      const corePulse = 1 + Math.sin(time * 0.0016) * 0.06;
      const coreGlow = context.createRadialGradient(
        center.x,
        center.y,
        0,
        center.x,
        center.y,
        76 * corePulse,
      );
      coreGlow.addColorStop(0, "rgba(255, 238, 250, 0.96)");
      coreGlow.addColorStop(0.1, "rgba(224, 80, 174, 0.82)");
      coreGlow.addColorStop(0.48, "rgba(202, 44, 146, 0.2)");
      coreGlow.addColorStop(1, "rgba(202, 44, 146, 0)");
      context.fillStyle = coreGlow;
      context.beginPath();
      context.arc(center.x, center.y, 76 * corePulse, 0, TAU);
      context.fill();
      context.fillStyle = "rgba(255, 242, 251, 0.94)";
      context.beginPath();
      context.arc(center.x, center.y, 3.1 * corePulse, 0, TAU);
      context.fill();

      if (!frame.policy.staticFallback) {
        drawTrail(frame, trail, trailLife);
        drawPointerHalo(
          frame,
          haloRadius,
          options.accent ?? "rgba(255, 242, 251, 0.98)",
        );
        renderScatterBodies(frame, scatter.bodies, haloRadius + 34, motion);
      } else {
        resetScatterBodies(scatter.bodies);
      }
    },
    resize() {
      measureScatterBodies(container, scatter.bodies);
    },
    destroy() {
      if (scatterPrepared) restoreScatterTargets(scatter.states);
    },
  };

  return createCanvasMovement(container, renderer, {
    hideNativeCursor: options.hideNativeCursor ?? true,
  });
}
