import { createCanvasMovement } from "../../src/core/canvas-movement.js";
import { clear, distance, dot, label, line, mix } from "../../src/core/drawing.js";
import type { MovementInstance, Point } from "../../src/core/types.js";

export type PathfinderTarget = Point & {
  id?: string;
  label?: string;
};

export type PathfinderOptions = {
  accent?: string;
  hideNativeCursor?: boolean;
  targetSelector?: string;
  targets?: readonly PathfinderTarget[];
};

const DEFAULT_TARGETS: readonly PathfinderTarget[] = [
  { x: 0.16, y: 0.26, label: "EVIDENCE / 01" },
  { x: 0.78, y: 0.22, label: "ACTION / 02" },
  { x: 0.72, y: 0.72, label: "PATH / 03" },
  { x: 0.24, y: 0.76, label: "PROOF / 04" },
];

export function createPathfinder(
  container: HTMLElement,
  options: PathfinderOptions = {},
): MovementInstance {
  const accent = options.accent ?? "rgba(91, 153, 255, 0.96)";
  const slow = { x: 0, y: 0 };
  let initialized = false;

  return createCanvasMovement(
    container,
    {
      render(frame) {
        const { context, width, height, pointer } = frame;
        clear(context, width, height);
        if (!initialized) {
          slow.x = pointer.x || width / 2;
          slow.y = pointer.y || height / 2;
          initialized = true;
        }
        slow.x = mix(slow.x, pointer.x, frame.policy.staticFallback ? 1 : 0.12);
        slow.y = mix(slow.y, pointer.y, frame.policy.staticFallback ? 1 : 0.12);

        const bounds = container.getBoundingClientRect();
        const domTargets = options.targetSelector
          ? Array.from(container.querySelectorAll<HTMLElement>(options.targetSelector)).map((element, index) => {
              const rect = element.getBoundingClientRect();
              return {
                x: rect.left - bounds.left + rect.width / 2,
                y: rect.top - bounds.top + rect.height / 2,
                label: element.dataset.pathfinderLabel ?? `TARGET / ${String(index + 1).padStart(2, "0")}`,
              };
            })
          : [];
        const sourceTargets = domTargets.length ? domTargets : (options.targets ?? DEFAULT_TARGETS).map((target) => ({
          ...target,
          x: target.x <= 1 ? target.x * width : target.x,
          y: target.y <= 1 ? target.y * height : target.y,
        }));
        const target = sourceTargets
          .map((candidate) => ({ candidate, distance: distance(slow, candidate) }))
          .sort((a, b) => a.distance - b.distance)[0]?.candidate;

        for (const candidate of sourceTargets) {
          dot(context, candidate, candidate === target ? 2.6 : 1.6, candidate === target ? accent : "rgba(194, 214, 255, 0.36)");
        }
        if (target) {
          const horizontalFirst = Math.abs(target.x - slow.x) > Math.abs(target.y - slow.y);
          const elbow = horizontalFirst ? { x: target.x, y: slow.y } : { x: slow.x, y: target.y };
          line(context, slow, elbow, "rgba(194, 214, 255, 0.3)", 1);
          line(context, elbow, target, "rgba(91, 153, 255, 0.72)", 1.2);
          dot(context, elbow, 1.8, accent);
        }
        dot(context, pointer, 2.6, "rgba(244, 248, 255, 0.96)");
        if (pointer.active && !frame.policy.staticFallback) {
          label(context, pointer, target?.label ?? "ROUTE / READY");
        }
      },
    },
    { hideNativeCursor: options.hideNativeCursor ?? true },
  );
}
