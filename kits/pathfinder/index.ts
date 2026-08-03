import { createCanvasMovement } from "../../src/core/canvas-movement.js";
import { clear, clamp, distance, dot, label, line, mix } from "../../src/core/drawing.js";
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
  const accent = options.accent ?? "rgba(151, 193, 255, 0.92)";
  const fast = { x: 0, y: 0 };
  const slow = { x: 0, y: 0 };
  let initialized = false;

  return createCanvasMovement(
    container,
    {
      render(frame) {
        const { context, width, height, pointer } = frame;
        clear(context, width, height);
        if (!initialized) {
          fast.x = slow.x = pointer.x || width / 2;
          fast.y = slow.y = pointer.y || height / 2;
          initialized = true;
        }
        const seconds = Math.max(0.001, frame.delta / 1000);
        const ease = (duration: number) => frame.policy.staticFallback ? 1 : 1 - Math.exp(-seconds / duration);
        fast.x = mix(fast.x, pointer.x, ease(0.045));
        fast.y = mix(fast.y, pointer.y, ease(0.045));
        slow.x = mix(slow.x, pointer.x, ease(0.3));
        slow.y = mix(slow.y, pointer.y, ease(0.3));

        const bounds = container.getBoundingClientRect();
        const domTargets = options.targetSelector
          ? Array.from(container.querySelectorAll<HTMLElement>(options.targetSelector)).map((element, index) => {
              const rect = element.getBoundingClientRect();
              return {
                x: rect.left - bounds.left + rect.width / 2,
                y: rect.top - bounds.top + rect.height / 2,
                label: element.dataset.pathfinderLabel ?? `TARGET / ${String(index + 1).padStart(2, "0")}`,
                rect: {
                  left: rect.left - bounds.left,
                  right: rect.right - bounds.left,
                  top: rect.top - bounds.top,
                  bottom: rect.bottom - bounds.top,
                },
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
          const targetRect = "rect" in target && target.rect
            ? target.rect
            : { left: target.x - 22, right: target.x + 22, top: target.y - 16, bottom: target.y + 16 };
          const left = clamp(targetRect.left - 5, 2, width - 2);
          const right = clamp(targetRect.right + 5, 2, width - 2);
          const top = clamp(targetRect.top - 5, 2, height - 2);
          const bottom = clamp(targetRect.bottom + 5, 2, height - 2);
          const size = Math.min(14, Math.max(6, (right - left) * 0.08));
          const corners = [
            [[left + size, top], [left, top], [left, top + size]],
            [[right - size, top], [right, top], [right, top + size]],
            [[right, bottom - size], [right, bottom], [right - size, bottom]],
            [[left + size, bottom], [left, bottom], [left, bottom - size]],
          ];
          for (const corner of corners) {
            const first = corner[0];
            const middle = corner[1];
            const last = corner[2];
            if (!first || !middle || !last) continue;
            context.beginPath();
            context.moveTo(first[0] ?? 0, first[1] ?? 0);
            context.lineTo(middle[0] ?? 0, middle[1] ?? 0);
            context.lineTo(last[0] ?? 0, last[1] ?? 0);
            context.strokeStyle = "rgba(104, 157, 255, 0.34)";
            context.lineWidth = 1;
            context.stroke();
          }
        }
        if (pointer.active && !frame.policy.staticFallback) {
          const size = 10;
          const cursorCorners = [
            [[fast.x - size, fast.y - 4], [fast.x - size, fast.y - size], [fast.x - 4, fast.y - size]],
            [[fast.x + 4, fast.y - size], [fast.x + size, fast.y - size], [fast.x + size, fast.y - 4]],
            [[fast.x + size, fast.y + 4], [fast.x + size, fast.y + size], [fast.x + 4, fast.y + size]],
            [[fast.x - 4, fast.y + size], [fast.x - size, fast.y + size], [fast.x - size, fast.y + 4]],
          ];
          for (const corner of cursorCorners) {
            const first = corner[0];
            const middle = corner[1];
            const last = corner[2];
            if (!first || !middle || !last) continue;
            context.beginPath();
            context.moveTo(first[0] ?? 0, first[1] ?? 0);
            context.lineTo(middle[0] ?? 0, middle[1] ?? 0);
            context.lineTo(last[0] ?? 0, last[1] ?? 0);
            context.strokeStyle = "rgba(247, 249, 253, 0.94)";
            context.stroke();
          }
          dot(context, fast, 1.7, accent);
          label(context, fast, target?.label ?? "ROUTE / READY");
        }
      },
    },
    { hideNativeCursor: options.hideNativeCursor ?? true },
  );
}
