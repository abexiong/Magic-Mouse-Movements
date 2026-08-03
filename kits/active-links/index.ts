import { createCanvasMovement } from "../../src/core/canvas-movement.js";
import { clear, clamp, distance, dot, label, line, mix } from "../../src/core/drawing.js";
import type { MovementInstance, Point } from "../../src/core/types.js";

export type ActiveLinkNode = Point & {
  id?: string;
};

export type ActiveLinksOptions = {
  accent?: string;
  hideNativeCursor?: boolean;
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
  const radius = options.radius ?? 300;
  const accent = options.accent ?? "rgba(91, 153, 255, 0.96)";
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
        slow.x = mix(slow.x, pointer.x, frame.policy.staticFallback ? 1 : 0.08);
        slow.y = mix(slow.y, pointer.y, frame.policy.staticFallback ? 1 : 0.08);

        const resolved = nodes.map((node, index) => ({
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
          const pulse = (time * 0.00028 + node.index * 0.21) % 1;
          dot(context, { x: mix(slow.x, node.point.x, pulse), y: mix(slow.y, node.point.y, pulse) }, 1.4 + strength, accent);
          dot(context, node.point, 2 + strength, accent);
        }

        context.beginPath();
        context.arc(slow.x, slow.y, 23, 0, Math.PI * 2);
        context.strokeStyle = "rgba(91, 153, 255, 0.38)";
        context.stroke();
        dot(context, pointer, 2.6, "rgba(244, 248, 255, 0.96)");
        if (pointer.active && !frame.policy.staticFallback) {
          label(context, pointer, `${active.length} ACTIVE ${active.length === 1 ? "LINK" : "LINKS"}`);
        }
      },
    },
    { hideNativeCursor: options.hideNativeCursor ?? true },
  );
}
