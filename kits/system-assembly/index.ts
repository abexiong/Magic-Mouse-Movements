import { createCanvasMovement } from "../../src/core/canvas-movement.js";
import { clear, distance, dot, label, line, mix, TAU } from "../../src/core/drawing.js";
import type { MovementInstance, Point } from "../../src/core/types.js";

export type SystemAssemblyOptions = {
  activeIndex?: number | (() => number);
  accent?: string;
  domains?: readonly string[];
  hideNativeCursor?: boolean;
  nodes?: readonly Point[];
  targetSelector?: string;
};

const DEFAULT_DOMAINS = ["INPUT", "RENDER", "MOTION", "ACCESS", "OUTPUT"];
const DEFAULT_NODES: readonly Point[] = [
  { x: 0.12, y: 0.28 },
  { x: 0.24, y: 0.74 },
  { x: 0.46, y: 0.2 },
  { x: 0.63, y: 0.72 },
  { x: 0.84, y: 0.32 },
  { x: 0.9, y: 0.74 },
];

export function createSystemAssembly(
  container: HTMLElement,
  options: SystemAssemblyOptions = {},
): MovementInstance {
  const domains = options.domains ?? DEFAULT_DOMAINS;
  const nodes = options.nodes ?? DEFAULT_NODES;
  const accent = options.accent ?? "rgba(151, 193, 255, 0.92)";
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
        const { context, width, height, pointer, delta, time } = frame;
        clear(context, width, height);
        if (!initialized) {
          fast.x = medium.x = slow.x = pointer.x || width / 2;
          fast.y = medium.y = slow.y = pointer.y || height / 2;
          initialized = true;
        }
        const seconds = Math.max(0.001, delta / 1000);
        const ease = (duration: number) => frame.policy.staticFallback ? 1 : 1 - Math.exp(-seconds / duration);
        fast.x = mix(fast.x, pointer.x, ease(0.045));
        fast.y = mix(fast.y, pointer.y, ease(0.045));
        medium.x = mix(medium.x, pointer.x, ease(0.14));
        medium.y = mix(medium.y, pointer.y, ease(0.14));
        slow.x = mix(slow.x, pointer.x, ease(0.3));
        slow.y = mix(slow.y, pointer.y, ease(0.3));

        const registeredIndex = typeof options.activeIndex === "function"
          ? options.activeIndex()
          : options.activeIndex;
        const activeIndex = Math.min(
          domains.length - 1,
          Math.max(
            0,
            Number.isFinite(registeredIndex)
              ? Math.round(registeredIndex ?? 0)
              : Math.floor((pointer.x / Math.max(1, width)) * domains.length),
          ),
        );
        const radius = 27;
        for (let index = 0; index < domains.length; index += 1) {
          const start = -Math.PI / 2 + index * (TAU / domains.length) + 0.09;
          const end = start + TAU / domains.length - 0.18;
          const selected = index === activeIndex;
          context.beginPath();
          context.arc(slow.x, slow.y, radius + (selected ? 3 : 0), start, end);
          context.strokeStyle = selected ? accent : "rgba(219, 226, 240, 0.24)";
          context.lineWidth = selected ? 2 : 1;
          context.stroke();
          const angle = (start + end) / 2;
          line(
            context,
            { x: medium.x + Math.cos(angle) * 8, y: medium.y + Math.sin(angle) * 8 },
            { x: slow.x + Math.cos(angle) * (radius - 6), y: slow.y + Math.sin(angle) * (radius - 6) },
            selected ? "rgba(104, 157, 255, 0.34)" : "rgba(219, 226, 240, 0.24)",
            0.8,
          );
        }

        if (options.targetSelector && (time - lastMeasure > 90 || registeredNodes.length === 0)) {
          const bounds = container.getBoundingClientRect();
          registeredNodes = Array.from(container.querySelectorAll<HTMLElement>(options.targetSelector)).map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              x: Math.min(rect.right - bounds.left, Math.max(rect.left - bounds.left, slow.x)),
              y: Math.min(rect.bottom - bounds.top, Math.max(rect.top - bounds.top, slow.y)),
            };
          });
          lastMeasure = time;
        }
        const resolved = registeredNodes.length > 0
          ? registeredNodes
          : nodes.map((node) => ({
              x: node.x <= 1 ? node.x * width : node.x,
              y: node.y <= 1 ? node.y * height : node.y,
            }));
        const connected = resolved
          .map((node) => ({ node, nodeDistance: distance(node, slow) }))
          .filter(({ nodeDistance }) => nodeDistance < 420)
          .sort((a, b) => a.nodeDistance - b.nodeDistance)
          .slice(0, 3);
        for (const { node, nodeDistance } of connected) {
          const strength = 1 - nodeDistance / 420;
          context.beginPath();
          context.moveTo(slow.x, slow.y);
          context.bezierCurveTo(
            mix(slow.x, node.x, 0.34),
            slow.y,
            mix(slow.x, node.x, 0.66),
            node.y,
            node.x,
            node.y,
          );
          context.strokeStyle = `rgba(104, 157, 255, ${0.16 + strength * 0.3})`;
          context.lineWidth = 0.8;
          context.stroke();
          dot(context, node, 1.8 + strength, accent);
        }

        if (pointer.active && !frame.policy.staticFallback) {
          dot(context, fast, 2.4, "rgba(247, 249, 253, 0.94)");
          label(context, fast, `DOMAIN / 0${activeIndex + 1}`);
        }
      },
    },
    { hideNativeCursor: options.hideNativeCursor ?? true },
  );
}
