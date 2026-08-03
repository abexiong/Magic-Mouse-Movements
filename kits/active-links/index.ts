import { createCanvasMovement } from "../../src/core/canvas-movement.js";
import { clear, clamp, distance, dot, label, line, mix } from "../../src/core/drawing.js";
import type { MovementInstance, Point } from "../../src/core/types.js";

export type ActiveLinkNode = Point & {
  id?: string;
};

export type ActiveLinksOptions = {
  accent?: string;
  hideNativeCursor?: boolean;
  nodeSelector?: string;
  nodes?: readonly ActiveLinkNode[];
  radius?: number;
};

const DEFAULT_NODES: readonly ActiveLinkNode[] = [
  { x: 0.14, y: 0.28 },
  { x: 0.31, y: 0.7 },
  { x: 0.51, y: 0.35 },
  { x: 0.68, y: 0.68 },
  { x: 0.85, y: 0.27 },
];

export function createActiveLinks(
  container: HTMLElement,
  options: ActiveLinksOptions = {},
): MovementInstance {
  const nodes = options.nodes ?? DEFAULT_NODES;
  const radius = options.radius ?? 540;
  const accent = options.accent ?? "rgba(151, 193, 255, 0.92)";
  const fast = { x: 0, y: 0 };
  const medium = { x: 0, y: 0 };
  const slow = { x: 0, y: 0 };
  let registeredNodes: ActiveLinkNode[] = [];
  let lastMeasure = 0;
  let initialized = false;

  return createCanvasMovement(
    container,
    {
      render(frame) {
        const { context, width, height, pointer, time } = frame;
        clear(context, width, height);
        if (!initialized) {
          fast.x = medium.x = slow.x = pointer.x || width / 2;
          fast.y = medium.y = slow.y = pointer.y || height / 2;
          initialized = true;
        }
        const seconds = Math.max(0.001, frame.delta / 1000);
        const ease = (duration: number) => frame.policy.staticFallback ? 1 : 1 - Math.exp(-seconds / duration);
        fast.x = mix(fast.x, pointer.x, ease(0.045));
        fast.y = mix(fast.y, pointer.y, ease(0.045));
        medium.x = mix(medium.x, pointer.x, ease(0.14));
        medium.y = mix(medium.y, pointer.y, ease(0.14));
        slow.x = mix(slow.x, pointer.x, ease(0.3));
        slow.y = mix(slow.y, pointer.y, ease(0.3));

        if (options.nodeSelector && (time - lastMeasure > 90 || registeredNodes.length === 0)) {
          const bounds = container.getBoundingClientRect();
          registeredNodes = Array.from(container.querySelectorAll<HTMLElement>(options.nodeSelector)).map((element, index) => {
            const rect = element.getBoundingClientRect();
            return {
              id: element.dataset.activeLinkId ?? `node-${index + 1}`,
              x: Math.min(rect.right - bounds.left, Math.max(rect.left - bounds.left, slow.x)),
              y: Math.min(rect.bottom - bounds.top, Math.max(rect.top - bounds.top, slow.y)),
            };
          });
          lastMeasure = time;
        }
        const sourceNodes = registeredNodes.length > 0 ? registeredNodes : nodes;
        const resolved = sourceNodes.map((node, index) => ({
          index,
          point: { x: node.x <= 1 ? node.x * width : node.x, y: node.y <= 1 ? node.y * height : node.y },
        }));
        const active = resolved
          .map((node) => ({ ...node, distance: distance(slow, node.point) }))
          .filter((node) => node.distance < radius)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 4);

        for (const node of resolved) dot(context, node.point, 1.7, "rgba(194, 214, 255, 0.42)");
        for (const node of active) {
          const strength = clamp(1 - node.distance / radius, 0, 1);
          line(context, slow, node.point, `rgba(91, 153, 255, ${0.16 + strength * 0.42})`, 0.8 + strength * 0.5);
          const pulse = (time * 0.00042 + node.index * 0.19) % 1;
          dot(context, { x: mix(slow.x, node.point.x, pulse), y: mix(slow.y, node.point.y, pulse) }, 1.4 + strength, accent);
          dot(context, node.point, 2 + strength, accent);
        }

        context.beginPath();
        context.arc(slow.x, slow.y, 24, 0, Math.PI * 2);
        context.strokeStyle = "rgba(104, 157, 255, 0.34)";
        context.stroke();
        context.beginPath();
        context.arc(medium.x, medium.y, 12, 0, Math.PI * 2);
        context.strokeStyle = "rgba(219, 226, 240, 0.24)";
        context.stroke();
        dot(context, fast, 3, "rgba(247, 249, 253, 0.94)");
        if (pointer.active && !frame.policy.staticFallback) {
          label(context, fast, `${active.length} ACTIVE ${active.length === 1 ? "LINK" : "LINKS"}`);
        }
      },
    },
    { hideNativeCursor: options.hideNativeCursor ?? true },
  );
}
