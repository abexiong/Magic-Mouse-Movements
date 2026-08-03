import { createCanvasMovement } from "../../src/core/canvas-movement.js";
import { clear, clamp, distance, dot, label, line, mix, TAU } from "../../src/core/drawing.js";
import type { MovementInstance, Point } from "../../src/core/types.js";

export type OrbitTrailOptions = {
  accent?: string;
  chapters?: readonly string[];
  hideNativeCursor?: boolean;
};

type TrailPoint = Point & { born: number };

export function createOrbitTrail(
  container: HTMLElement,
  options: OrbitTrailOptions = {},
): MovementInstance {
  const chapters = options.chapters ?? ["STRUCTURE", "TEAM", "SIGNAL", "FLIGHT", "ORBIT"];
  const accent = options.accent ?? "rgba(91, 153, 255, 0.96)";
  const trail: TrailPoint[] = [];
  const slow = { x: 0, y: 0 };
  let initialized = false;

  return createCanvasMovement(
    container,
    {
      render(frame) {
        const { context, width, height, pointer, time } = frame;
        clear(context, width, height);
        if (!initialized) {
          slow.x = pointer.x || width / 2;
          slow.y = pointer.y || height / 2;
          initialized = true;
        }

        slow.x = mix(slow.x, pointer.x, frame.policy.staticFallback ? 1 : 0.09);
        slow.y = mix(slow.y, pointer.y, frame.policy.staticFallback ? 1 : 0.09);

        const last = trail[trail.length - 1];
        if (pointer.active && (!last || distance(last, pointer) > 7)) {
          trail.push({ x: pointer.x, y: pointer.y, born: time });
          if (trail.length > 72) trail.shift();
        }

        for (let index = 1; index < trail.length; index += 1) {
          const from = trail[index - 1];
          const to = trail[index];
          if (!from || !to) continue;
          const life = clamp(1 - (time - to.born) / 1100, 0, 1);
          if (life <= 0) continue;
          line(context, from, to, `rgba(91, 153, 255, ${0.42 * life})`, 0.8 + life);
        }
        while (trail[0] && time - trail[0].born > 1100) trail.shift();

        const stage = clamp(Math.floor((pointer.x / Math.max(1, width)) * chapters.length), 0, chapters.length - 1);
        const progress = chapters.length > 1 ? stage / (chapters.length - 1) : 0;
        context.save();
        context.translate(slow.x, slow.y);
        context.rotate(-0.35 + progress * 0.7);
        context.scale(1, 0.58 + progress * 0.2);
        for (let ring = 0; ring < 3; ring += 1) {
          context.beginPath();
          context.arc(0, 0, 17 + ring * 12 + progress * 8, 0.15 * Math.PI, 1.85 * Math.PI);
          context.strokeStyle = `rgba(91, 153, 255, ${0.42 - ring * 0.1})`;
          context.lineWidth = ring === 0 ? 1.2 : 0.8;
          context.stroke();
        }
        context.restore();

        const angle = time * 0.0008;
        dot(context, { x: slow.x + Math.cos(angle) * 28, y: slow.y + Math.sin(angle) * 17 }, 2.2, accent);
        if (pointer.active && !frame.policy.staticFallback) {
          dot(context, pointer, 2.6, "rgba(244, 248, 255, 0.96)");
          label(context, pointer, `CHAPTER / ${chapters[stage] ?? "ORBIT"}`);
        } else {
          context.beginPath();
          context.arc(slow.x, slow.y, 5, 0, TAU);
          context.strokeStyle = accent;
          context.stroke();
        }
      },
    },
    { hideNativeCursor: options.hideNativeCursor ?? true },
  );
}
