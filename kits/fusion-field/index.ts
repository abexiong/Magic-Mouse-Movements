import { createCanvasMovement } from "../../src/core/canvas-movement.js";
import { clear, clamp, line, mix, seededRandom, TAU } from "../../src/core/drawing.js";
import type { MovementInstance, Point } from "../../src/core/types.js";

export type FusionFieldOptions = {
  accent?: string;
  digitCount?: number;
  hideNativeCursor?: boolean;
  scatterSelector?: string;
};

type Digit = {
  angle: number;
  character: "0" | "1";
  radius: number;
  stream: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

type TailPoint = Point & { life: number };

export function createFusionField(
  container: HTMLElement,
  options: FusionFieldOptions = {},
): MovementInstance {
  const random = seededRandom(98243);
  const digits: Digit[] = Array.from({ length: options.digitCount ?? 190 }, (_, index) => ({
    angle: random() * TAU,
    character: index % 2 === 0 ? "0" : "1",
    radius: 28 + Math.pow(random(), 0.58) * 330,
    stream: index % 2 === 0 ? 1 : -1,
    vx: 0,
    vy: 0,
    x: 0,
    y: 0,
  }));
  const tail: TailPoint[] = [];
  const scatterTargets = options.scatterSelector
    ? Array.from(container.querySelectorAll<HTMLElement>(options.scatterSelector))
    : [];

  const restoreTargets = () => {
    for (const target of scatterTargets) {
      target.style.translate = "";
      target.style.rotate = "";
    }
  };

  return createCanvasMovement(
    container,
    {
      render(frame) {
        const { context, width, height, pointer, delta, time } = frame;
        clear(context, width, height);
        const center = { x: width * 0.63, y: height * 0.52 };
        const seconds = Math.min(0.04, delta / 1000);
        const maxRadius = Math.hypot(width, height) * 0.48;

        for (const digit of digits) {
          if (!frame.policy.staticFallback) {
            digit.angle += digit.stream * seconds * (0.2 + 42 / Math.max(42, digit.radius));
            digit.radius -= seconds * (8 + digit.stream * 1.5);
            if (digit.radius < 18) {
              digit.radius = maxRadius * (0.72 + random() * 0.28);
              digit.angle = random() * TAU;
            }
          }
          const targetX = center.x + Math.cos(digit.angle) * digit.radius * 1.24;
          const targetY = center.y + Math.sin(digit.angle) * digit.radius * 0.68;
          const dx = targetX - pointer.x;
          const dy = targetY - pointer.y;
          const dist = Math.max(1, Math.hypot(dx, dy));
          const influence = pointer.active ? clamp(1 - dist / 125, 0, 1) : 0;
          if (!frame.policy.staticFallback && influence > 0) {
            const speedForce = Math.min(950, pointer.speed) * influence * 0.0026;
            digit.vx += (dx / dist) * speedForce;
            digit.vy += (dy / dist) * speedForce;
          }
          digit.vx *= Math.pow(0.91, delta / 16.67);
          digit.vy *= Math.pow(0.91, delta / 16.67);
          digit.x = targetX + digit.vx;
          digit.y = targetY + digit.vy;
          const depth = clamp(1 - digit.radius / Math.max(1, maxRadius), 0, 1);
          context.font = `${8 + depth * 5}px "SFMono-Regular", Consolas, monospace`;
          context.fillStyle = digit.stream > 0
            ? `rgba(91, 153, 255, ${0.18 + depth * 0.72})`
            : `rgba(184, 215, 255, ${0.14 + depth * 0.64})`;
          context.fillText(digit.character, digit.x, digit.y);
        }

        const last = tail[tail.length - 1];
        if (pointer.active && (!last || Math.hypot(last.x - pointer.x, last.y - pointer.y) > 5)) {
          tail.push({ x: pointer.x, y: pointer.y, life: 1 });
          if (tail.length > 64) tail.shift();
        }
        for (const point of tail) point.life = Math.max(0, point.life - delta / 650);
        while (tail[0] && tail[0].life <= 0) tail.shift();
        for (let index = 1; index < tail.length; index += 1) {
          const from = tail[index - 1];
          const to = tail[index];
          if (!from || !to) continue;
          line(context, from, to, `rgba(91, 153, 255, ${to.life * 0.5})`, Math.max(0.5, to.life * 3));
        }

        const glow = context.createRadialGradient(center.x, center.y, 0, center.x, center.y, 58);
        glow.addColorStop(0, "rgba(240, 247, 255, 0.98)");
        glow.addColorStop(0.18, "rgba(91, 153, 255, 0.8)");
        glow.addColorStop(1, "rgba(91, 153, 255, 0)");
        context.fillStyle = glow;
        context.beginPath();
        context.arc(center.x, center.y, 58, 0, TAU);
        context.fill();
        if (!frame.policy.staticFallback) {
          context.beginPath();
          context.arc(pointer.x, pointer.y, 3, 0, TAU);
          context.fillStyle = options.accent ?? "rgba(244, 248, 255, 0.98)";
          context.fill();
        }

        if (frame.policy.staticFallback) {
          restoreTargets();
        } else {
          const bounds = container.getBoundingClientRect();
          for (const target of scatterTargets) {
            const rect = target.getBoundingClientRect();
            const localCenter = {
              x: rect.left - bounds.left + rect.width / 2,
              y: rect.top - bounds.top + rect.height / 2,
            };
            const dx = localCenter.x - pointer.x;
            const dy = localCenter.y - pointer.y;
            const dist = Math.max(1, Math.hypot(dx, dy));
            const influence = clamp(1 - dist / 160, 0, 1);
            const travel = influence * Math.min(22, pointer.speed / 55);
            target.style.translate = `${(dx / dist) * travel}px ${(dy / dist) * travel}px`;
            target.style.rotate = `${influence * Math.sin(time * 0.004) * 2.2}deg`;
          }
        }
      },
      destroy: restoreTargets,
    },
    { hideNativeCursor: options.hideNativeCursor ?? true },
  );
}
