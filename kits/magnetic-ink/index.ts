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
  spin: number;
  length: number;
  thickness: number;
  energy: number;
  captured: boolean;
  orbitAngle: number;
  orbitRadius: number;
  orbitSpeed: number;
};

type StrokePoint = Point & { life: number; width: number };

export function createMagneticInk(
  container: HTMLElement,
  options: MagneticInkOptions = {},
): MovementInstance {
  const random = seededRandom(52619);
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const normalized = Array.from(
    { length: options.particleCount ?? (coarsePointer ? 170 : 300) },
    () => ({ x: random(), y: random() }),
  );
  const particles: Particle[] = [];
  const strokes: StrokePoint[] = [];
  const attractionRadius = options.attractionRadius ?? 275;
  const accent = options.accent ?? "91, 153, 255";
  let lastWidth = 0;
  let lastHeight = 0;
  let directionX = 0;
  let directionY = 0;
  let reversals: number[] = [];
  let scatterCooldown = 0;
  let scatter = 0;

  const resetParticles = (width: number, height: number) => {
    particles.length = 0;
    for (const seed of normalized) {
      const x = seed.x * width;
      const y = seed.y * height;
      particles.push({
        x,
        y,
        homeX: clamp(x + (random() - 0.5) * 90, 10, width - 10),
        homeY: clamp(y + (random() - 0.5) * 110, 10, height - 10),
        vx: 0,
        vy: 0,
        angle: random() * Math.PI,
        spin: (random() - 0.5) * 0.055,
        length: 5 + random() * 17,
        thickness: 0.65 + random() * 1.15,
        energy: 0,
        captured: false,
        orbitAngle: random() * TAU,
        orbitRadius: 20 + random() * 42,
        orbitSpeed: (0.005 + random() * 0.012) * (random() > 0.5 ? 1 : -1),
      });
    }
    lastWidth = width;
    lastHeight = height;
  };

  return createCanvasMovement(
    container,
    {
      render(frame) {
        const { context, width, height, pointer, delta, time } = frame;
        clear(context, width, height);
        if (!particles.length || width !== lastWidth || height !== lastHeight) resetParticles(width, height);
        const speedPerMillisecond = pointer.speed / 1_000;
        const velocityLength = Math.max(1, Math.hypot(pointer.velocityX, pointer.velocityY));
        const nextDirectionX = pointer.velocityX / velocityLength;
        const nextDirectionY = pointer.velocityY / velocityLength;
        const directionDot = nextDirectionX * directionX + nextDirectionY * directionY;
        if (
          pointer.active &&
          pointer.speed > 720 &&
          directionDot < -0.28 &&
          time > scatterCooldown
        ) {
          reversals.push(time);
          reversals = reversals.filter((reversalTime) => time - reversalTime < 430);
        }
        const reversal = reversals.length >= 3 && time > scatterCooldown;
        if (reversal && scatter <= 0) {
          scatterCooldown = time + 720;
          reversals = [];
          scatter = 1;
          for (const particle of particles) {
            if (!particle.captured) continue;
            const angle = random() * TAU;
            const travel = 3.8 + random() * 7.4;
            particle.vx = pointer.velocityX / 1_000 * 0.09 + Math.cos(angle) * travel;
            particle.vy = pointer.velocityY / 1_000 * 0.09 + Math.sin(angle) * travel;
            particle.captured = false;
          }
          const stride = Math.max(2, Math.ceil(strokes.length / 72));
          for (let index = strokes.length - 1; index >= 0 && particles.length < 390; index -= stride) {
            const point = strokes[index];
            if (!point) continue;
            const angle = random() * TAU;
            particles.push({
              x: point.x,
              y: point.y,
              homeX: clamp(point.x + (random() - 0.5) * 240, 10, width - 10),
              homeY: clamp(point.y + (random() - 0.5) * 260, 10, height - 10),
              vx: pointer.velocityX / 1_000 * 0.075 + Math.cos(angle) * (2.4 + random() * 5.8),
              vy: pointer.velocityY / 1_000 * 0.075 + Math.sin(angle) * (2.4 + random() * 5.8),
              angle,
              spin: (random() - 0.5) * 0.24,
              length: 5 + random() * 17,
              thickness: 0.65 + random() * 1.15,
              energy: 1,
              captured: false,
              orbitAngle: random() * TAU,
              orbitRadius: 20 + random() * 42,
              orbitSpeed: (0.005 + random() * 0.012) * (random() > 0.5 ? 1 : -1),
            });
          }
          strokes.length = 0;
        }
        if (pointer.speed > 5) {
          directionX = nextDirectionX;
          directionY = nextDirectionY;
        }

        if (pointer.pressed && pointer.active && !frame.policy.staticFallback) {
          const last = strokes[strokes.length - 1];
          if (!last || distance(last, pointer) > 2.2) {
            strokes.push({
              x: pointer.x,
              y: pointer.y,
              life: 1,
              width: 1.45 + clamp(speedPerMillisecond, 0, 1.6) * 0.95,
            });
          }
          if (strokes.length > 950) strokes.splice(0, strokes.length - 950);
        }

        for (const point of strokes) point.life = Math.max(0, point.life - delta / 18_000);
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
          context.lineWidth = strokes[strokes.length - 1]?.width ?? 1.45;
          context.stroke();
        }

        const frameScale = clamp(delta / 16.67, 0.25, 3);
        let captured = particles.reduce((count, particle) => count + (particle.captured ? 1 : 0), 0);
        for (const particle of particles) {
          if (particle.captured && !pointer.active) {
            particle.captured = false;
            captured -= 1;
          }
          if (particle.captured && pointer.active) {
            particle.orbitAngle += particle.orbitSpeed * (pointer.pressed ? 1.6 : 1) * frameScale;
            const orbitRadius = particle.orbitRadius * (pointer.pressed ? 0.7 : 1);
            const orbitX = pointer.x + Math.cos(particle.orbitAngle) * orbitRadius;
            const orbitY = pointer.y + Math.sin(particle.orbitAngle) * orbitRadius * 0.68;
            const positionMix = 1 - Math.pow(1 - 0.24, frameScale);
            particle.x = mix(particle.x, orbitX, positionMix);
            particle.y = mix(particle.y, orbitY, positionMix);
            particle.vx *= Math.pow(0.7, frameScale);
            particle.vy *= Math.pow(0.7, frameScale);
            particle.angle = mix(
              particle.angle,
              particle.orbitAngle + Math.PI * 0.5,
              1 - Math.pow(1 - 0.18, frameScale),
            );
            particle.energy = mix(
              particle.energy,
              1,
              1 - Math.pow(1 - 0.18, frameScale),
            );
          } else if (!frame.policy.staticFallback) {
            const dx = pointer.x - particle.x;
            const dy = pointer.y - particle.y;
            const dist = Math.max(1, Math.hypot(dx, dy));
            const influence = pointer.active ? clamp(1 - dist / attractionRadius, 0, 1) : 0;
            particle.vx += (particle.homeX - particle.x) * 0.00085 * frameScale;
            particle.vy += (particle.homeY - particle.y) * 0.00085 * frameScale;
            particle.vx += Math.sin(time * 0.00032 + particle.homeY) * 0.0022 * frameScale;
            particle.vy += Math.cos(time * 0.00028 + particle.homeX) * 0.0022 * frameScale;
            if (influence > 0) {
              const force = influence * influence * 0.48 * frameScale;
              particle.vx += (dx / dist) * force;
              particle.vy += (dy / dist) * force;
              particle.angle = mix(
                particle.angle,
                Math.atan2(dy, dx),
                1 - Math.pow(1 - influence * 0.16, frameScale),
              );
              if (!particle.captured && dist < 28 && captured < 42) {
                particle.captured = true;
                particle.orbitAngle = Math.atan2(particle.y - pointer.y, particle.x - pointer.x);
                particle.orbitRadius = 20 + random() * 42;
                captured += 1;
              }
            }
            particle.vx *= Math.pow(0.938, frameScale);
            particle.vy *= Math.pow(0.938, frameScale);
            particle.x += particle.vx * frameScale;
            particle.y += particle.vy * frameScale;
            particle.angle += particle.spin * (0.25 + influence) * frameScale;
            particle.energy = mix(
              particle.energy,
              influence,
              1 - Math.pow(1 - 0.14, frameScale),
            );
          }
          context.beginPath();
          context.moveTo(particle.x - Math.cos(particle.angle) * particle.length * 0.5, particle.y - Math.sin(particle.angle) * particle.length * 0.5);
          context.lineTo(particle.x + Math.cos(particle.angle) * particle.length * 0.5, particle.y + Math.sin(particle.angle) * particle.length * 0.5);
          context.strokeStyle = `rgba(${accent}, ${0.26 + particle.energy * 0.62})`;
          context.lineWidth = particle.thickness + particle.energy * 0.8;
          context.stroke();
        }

        if (!frame.policy.staticFallback) {
          const load = clamp(captured / 32, 0.12, 1);
          for (let index = 0; index < 3; index += 1) {
            context.beginPath();
            context.arc(pointer.x, pointer.y, 42 + index * 22 + load * 8, 0, TAU);
            context.setLineDash([4 + index * 2, 8 + index * 3]);
            context.lineDashOffset = time * 0.012 * (index % 2 === 0 ? 1 : -1);
            context.strokeStyle = `rgba(${accent}, ${0.42 - index * 0.1})`;
            context.stroke();
          }
          context.setLineDash([]);
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
