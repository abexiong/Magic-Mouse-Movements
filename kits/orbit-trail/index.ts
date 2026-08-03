import { createCanvasMovement } from "../../src/core/canvas-movement.js";
import { clear, clamp, distance, dot, label, line, mix } from "../../src/core/drawing.js";
import type { MovementInstance, Point } from "../../src/core/types.js";

export type OrbitTrailOptions = {
  accent?: string;
  chapters?: readonly string[];
  hideNativeCursor?: boolean;
  nodeSelector?: string;
  nodes?: readonly Point[];
  stageIndex?: number | (() => number);
};

type TrailPoint = Point & { born: number };

const DEFAULT_NODES: readonly Point[] = [
  { x: 0.14, y: 0.3 },
  { x: 0.29, y: 0.72 },
  { x: 0.48, y: 0.23 },
  { x: 0.66, y: 0.7 },
  { x: 0.84, y: 0.34 },
];

export function createOrbitTrail(
  container: HTMLElement,
  options: OrbitTrailOptions = {},
): MovementInstance {
  const chapters = options.chapters ?? [
    "2 M / STRUCTURE",
    "12 M / TEAM",
    "4 KM / SIGNAL",
    "10 KM / FLIGHT",
    "400 KM / ORBIT",
  ];
  const nodes = options.nodes ?? DEFAULT_NODES;
  const accent = options.accent ?? "rgba(151, 193, 255, 0.92)";
  const trail: TrailPoint[] = [];
  const fast = { x: 0, y: 0 };
  const medium = { x: 0, y: 0 };
  const slow = { x: 0, y: 0 };
  let registeredNodes: Point[] = [];
  let lastMeasure = 0;
  let initialized = false;

  return createCanvasMovement(
    container,
    {
      render(frame) {
        const { context, width, height, pointer, time, delta } = frame;
        clear(context, width, height);
        if (!initialized) {
          fast.x = medium.x = slow.x = pointer.x || width / 2;
          fast.y = medium.y = slow.y = pointer.y || height / 2;
          initialized = true;
        }
        const seconds = Math.max(0.001, delta / 1000);
        const ease = (duration: number) => frame.policy.staticFallback
          ? 1
          : 1 - Math.exp(-seconds / duration);
        fast.x = mix(fast.x, pointer.x, ease(0.045));
        fast.y = mix(fast.y, pointer.y, ease(0.045));
        medium.x = mix(medium.x, pointer.x, ease(0.14));
        medium.y = mix(medium.y, pointer.y, ease(0.14));
        slow.x = mix(slow.x, pointer.x, ease(0.3));
        slow.y = mix(slow.y, pointer.y, ease(0.3));

        const last = trail[trail.length - 1];
        if (pointer.active && (!last || distance(last, pointer) > 3)) {
          trail.push({ x: pointer.x, y: pointer.y, born: time });
          if (trail.length > 28) trail.shift();
        }
        while (trail[0] && time - trail[0].born > 900) trail.shift();
        for (let index = 1; index < trail.length; index += 1) {
          const previous = trail[index - 1];
          const current = trail[index];
          if (!previous || !current) continue;
          const life = clamp(1 - (time - current.born) / 900, 0, 1);
          context.beginPath();
          context.moveTo(previous.x, previous.y);
          context.quadraticCurveTo(mix(previous.x, current.x, 0.5), previous.y, current.x, current.y);
          context.strokeStyle = `rgba(104, 157, 255, ${0.32 * life})`;
          context.lineWidth = 0.7 + life * 0.7;
          context.stroke();
        }

        if (options.nodeSelector && (time - lastMeasure > 90 || registeredNodes.length === 0)) {
          const bounds = container.getBoundingClientRect();
          registeredNodes = Array.from(container.querySelectorAll<HTMLElement>(options.nodeSelector)).map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              x: clamp(slow.x, rect.left - bounds.left, rect.right - bounds.left),
              y: clamp(slow.y, rect.top - bounds.top, rect.bottom - bounds.top),
            };
          });
          lastMeasure = time;
        }
        const resolvedNodes = registeredNodes.length > 0
          ? registeredNodes
          : nodes.map((node) => ({
              x: node.x <= 1 ? node.x * width : node.x,
              y: node.y <= 1 ? node.y * height : node.y,
            }));
        const nearby = resolvedNodes
          .map((node) => ({ node, nodeDistance: distance(node, slow) }))
          .filter(({ nodeDistance }) => nodeDistance < 330)
          .sort((a, b) => a.nodeDistance - b.nodeDistance)[0];
        if (nearby) {
          context.beginPath();
          context.moveTo(slow.x, slow.y);
          context.quadraticCurveTo(
            mix(slow.x, nearby.node.x, 0.5),
            Math.min(slow.y, nearby.node.y) - 28,
            nearby.node.x,
            nearby.node.y,
          );
          context.strokeStyle = "rgba(104, 157, 255, 0.34)";
          context.lineWidth = 1;
          context.stroke();
          dot(context, nearby.node, 2.2, accent);
        }

        const registeredStage = typeof options.stageIndex === "function"
          ? options.stageIndex()
          : options.stageIndex;
        const stage = clamp(
          Number.isFinite(registeredStage)
            ? Math.round(registeredStage ?? 0)
            : Math.floor((pointer.x / Math.max(1, width)) * chapters.length),
          0,
          chapters.length - 1,
        );
        const expansion = chapters.length > 1 ? stage / (chapters.length - 1) : 0;
        context.save();
        context.translate(slow.x, slow.y);
        context.rotate(-0.22 + expansion * 0.42);
        context.scale(1, 0.62 + expansion * 0.2);
        context.beginPath();
        context.arc(0, 0, 13 + expansion * 15, 0.18 * Math.PI, 1.82 * Math.PI);
        context.strokeStyle = "rgba(104, 157, 255, 0.34)";
        context.lineWidth = 1;
        context.stroke();
        context.restore();

        if (!pointer.active || frame.policy.staticFallback) return;
        context.beginPath();
        context.arc(medium.x, medium.y, 8 + expansion * 4, 0, Math.PI * 2);
        context.strokeStyle = "rgba(219, 226, 240, 0.24)";
        context.stroke();
        const velocity = { x: pointer.velocityX / 1000, y: pointer.velocityY / 1000 };
        const speed = Math.hypot(velocity.x, velocity.y);
        const direction = speed > 0.01
          ? { x: velocity.x / speed, y: velocity.y / speed }
          : { x: 1, y: 0 };
        line(context, fast, {
          x: fast.x + direction.x * (18 + Math.min(20, speed * 3)),
          y: fast.y + direction.y * (18 + Math.min(20, speed * 3)),
        }, accent, 1.2);
        dot(context, fast, 2.5, "rgba(247, 249, 253, 0.94)");
        label(context, fast, chapters[stage] ?? "400 KM / ORBIT");
      },
    },
    { hideNativeCursor: options.hideNativeCursor ?? true },
  );
}
