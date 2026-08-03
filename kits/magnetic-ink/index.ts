import { createCanvasMovement } from "../../src/core/canvas-movement.js";
import { clear, clamp, distance, mix, seededRandom, TAU } from "../../src/core/drawing.js";
import type { MovementInstance, Point } from "../../src/core/types.js";

export type MagneticInkOptions = {
  accent?: string;
  attractionRadius?: number;
  hideNativeCursor?: boolean;
  particleCount?: number;
};

type Particle = Point & {
  homeX: number;
  homeY: number;
  vx: number;
  vy: number;
  angle: number;
  captured: boolean;
};

type StrokePoint = Point & { life: number };

export function createMagneticInk(
  container: HTMLElement,
  options: MagneticInkOptions = {},
): MovementInstance {
  const random = seededRandom(52619);
  const normalized = Array.from({ length: options.particleCount ?? 180 }, () => ({ x: random(), y: random() }));
  const particles: Particle[] = [];
  const strokes: StrokePoint[] = [];
  const attractionRadius = options.attractionRadius ?? 165;
  const accent = options.accent ?? "91, 153, 255";
  let lastWidth = 0;
  let lastHeight = 0;
  let lastVelocityX = 0;
  let lastVelocityY = 0;
  let scatter = 0;

  const resetParticles = (width: number, height: number) => {
    particles.length = 0;
    for (const seed of normalized) {
      const x = seed.x * width;
      const y = seed.y * height;
      particles.push({ x, y, homeX: x, homeY: y, vx: 0, vy: 0, angle: random() * TAU, captured: false });
    }
    lastWidth = width;
    lastHeight = height;
  };

  return createCanvasMovement(
    container,
    {
      render(frame) {
        const { context, width, height, pointer, delta } = frame;
        clear(context, width, height);
        if (!particles.length || width !== lastWidth || height !== lastHeight) resetParticles(width, height);
        const seconds = Math.min(0.04, delta / 1000);

        const reversal =
          pointer.speed > 850 &&
          lastVelocityX * pointer.velocityX + lastVelocityY * pointer.velocityY < -120_000;
        if (reversal && scatter <= 0) {
          scatter = 1;
          for (const particle of particles) {
            if (!particle.captured) continue;
            const angle = random() * TAU;
            const force = 220 + random() * 460;
            particle.vx += Math.cos(angle) * force;
            particle.vy += Math.sin(angle) * force;
            particle.captured = false;
          }
        }
        lastVelocityX = pointer.velocityX;
        lastVelocityY = pointer.velocityY;

        if (pointer.pressed && pointer.active && !frame.policy.staticFallback) {
          const last = strokes[strokes.length - 1];
          if (!last || distance(last, pointer) > 4) strokes.push({ x: pointer.x, y: pointer.y, life: 1 });
          if (strokes.length > 520) strokes.shift();
        }

        for (const point of strokes) point.life = Math.max(0, point.life - delta / 4200);
        while (strokes[0] && strokes[0].life <= 0) strokes.shift();
        if (strokes.length > 1) {
          context.beginPath();
          const first = strokes[0];
          if (first) context.moveTo(first.x, first.y);
          for (let index = 1; index < strokes.length; index += 1) {
            const point = strokes[index];
            if (point) context.lineTo(point.x, point.y);
          }
          context.strokeStyle = `rgba(${accent}, 0.78)`;
          context.lineWidth = 2.2;
          context.stroke();
        }

        let captured = 0;
        for (const particle of particles) {
          const dx = pointer.x - particle.x;
          const dy = pointer.y - particle.y;
          const dist = Math.max(1, Math.hypot(dx, dy));
          const influence = pointer.active ? clamp(1 - dist / attractionRadius, 0, 1) : 0;
          if (!frame.policy.staticFallback) {
            particle.vx += (particle.homeX - particle.x) * 0.85 * seconds;
            particle.vy += (particle.homeY - particle.y) * 0.85 * seconds;
            if (influence > 0) {
              const force = (90 + influence * 520) * seconds;
              particle.vx += (dx / dist) * force;
              particle.vy += (dy / dist) * force;
              particle.captured = dist < 62;
            } else {
              particle.captured = false;
            }
            particle.vx *= Math.pow(0.9, delta / 16.67);
            particle.vy *= Math.pow(0.9, delta / 16.67);
            particle.x += particle.vx * seconds;
            particle.y += particle.vy * seconds;
          }
          if (particle.captured) captured += 1;
          particle.angle = mix(particle.angle, Math.atan2(particle.vy, particle.vx), 0.08);
          const energy = Math.min(1, Math.hypot(particle.vx, particle.vy) / 220 + influence);
          const length = 2 + energy * 5;
          context.beginPath();
          context.moveTo(particle.x - Math.cos(particle.angle) * length, particle.y - Math.sin(particle.angle) * length);
          context.lineTo(particle.x + Math.cos(particle.angle) * length, particle.y + Math.sin(particle.angle) * length);
          context.strokeStyle = `rgba(${accent}, ${0.26 + energy * 0.62})`;
          context.lineWidth = 0.7 + energy * 0.8;
          context.stroke();
        }

        if (!frame.policy.staticFallback) {
          context.beginPath();
          context.arc(pointer.x, pointer.y, 18 + captured * 0.45, 0, TAU);
          context.strokeStyle = `rgba(${accent}, 0.58)`;
          context.stroke();
          context.beginPath();
          context.arc(pointer.x, pointer.y, 2.6, 0, TAU);
          context.fillStyle = "rgba(244, 248, 255, 0.96)";
          context.fill();
        }

        if (scatter > 0) {
          const radius = 36 + (1 - scatter) * 170;
          context.beginPath();
          context.arc(pointer.x, pointer.y, radius, 0, TAU);
          context.strokeStyle = `rgba(${accent}, ${scatter * 0.7})`;
          context.stroke();
          scatter = Math.max(0, scatter - delta / 420);
        }
      },
    },
    {
      hideNativeCursor: options.hideNativeCursor ?? true,
      renderOnCoarsePointer: true,
    },
  );
}
