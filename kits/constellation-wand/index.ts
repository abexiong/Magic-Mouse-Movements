import { createCanvasMovement } from "../../src/core/canvas-movement.js";
import { clear, clamp, distance, dot, line, mix } from "../../src/core/drawing.js";
import type { MovementInstance, Point } from "../../src/core/types.js";

export type ConstellationNode = Point & {
  detail?: string;
  id: string;
  label: string;
};

export type ConstellationEdge = readonly [string, string];

export type ConstellationWandOptions = {
  accent?: string;
  edges?: readonly ConstellationEdge[];
  hideNativeCursor?: boolean;
  listContainer?: HTMLElement;
  nodes?: readonly ConstellationNode[];
  onSelect?: (node: ConstellationNode) => void;
};

const DEFAULT_NODES: readonly ConstellationNode[] = [
  { id: "origin", label: "Origin", detail: "Starting point", x: 0.14, y: 0.58 },
  { id: "explore", label: "Explore", detail: "Open a path", x: 0.31, y: 0.28 },
  { id: "build", label: "Build", detail: "Create the system", x: 0.52, y: 0.48 },
  { id: "test", label: "Test", detail: "Verify the result", x: 0.71, y: 0.22 },
  { id: "ship", label: "Ship", detail: "Release carefully", x: 0.84, y: 0.64 },
  { id: "learn", label: "Learn", detail: "Return with evidence", x: 0.43, y: 0.78 },
];

const DEFAULT_EDGES: readonly ConstellationEdge[] = [
  ["origin", "explore"],
  ["origin", "learn"],
  ["explore", "build"],
  ["build", "test"],
  ["build", "learn"],
  ["test", "ship"],
  ["learn", "ship"],
];

export function createConstellationWand(
  container: HTMLElement,
  options: ConstellationWandOptions = {},
): MovementInstance {
  const nodes = options.nodes ?? DEFAULT_NODES;
  const edges = options.edges ?? DEFAULT_EDGES;
  const accent = options.accent ?? "rgba(91, 153, 255, 0.96)";
  let currentPositions = new Map<string, Point>();
  let nearestId: string | null = null;

  const list = options.listContainer ? document.createElement("ul") : null;
  if (list && options.listContainer) {
    list.setAttribute("aria-label", "Constellation destinations");
    for (const node of nodes) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = node.detail ? `${node.label}: ${node.detail}` : node.label;
      button.addEventListener("click", () => options.onSelect?.(node));
      item.append(button);
      list.append(item);
    }
    options.listContainer.append(list);
  }

  const onClick = (event: PointerEvent) => {
    if (!nearestId) return;
    const rect = container.getBoundingClientRect();
    const pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const point = currentPositions.get(nearestId);
    if (!point || distance(pointer, point) > 42) return;
    const node = nodes.find((candidate) => candidate.id === nearestId);
    if (node) options.onSelect?.(node);
  };
  container.addEventListener("pointerup", onClick);

  const movement = createCanvasMovement(
    container,
    {
      render(frame) {
        const { context, width, height, pointer, time } = frame;
        clear(context, width, height);
        const positions = new Map<string, Point>();
        for (const node of nodes) {
          const home = { x: node.x <= 1 ? node.x * width : node.x, y: node.y <= 1 ? node.y * height : node.y };
          const deltaX = home.x - pointer.x;
          const deltaY = home.y - pointer.y;
          const dist = Math.max(1, Math.hypot(deltaX, deltaY));
          const bend = frame.policy.staticFallback ? 0 : clamp(1 - dist / 240, 0, 1) * 26;
          positions.set(node.id, {
            x: home.x + (deltaX / dist) * bend,
            y: home.y + (deltaY / dist) * bend,
          });
        }
        currentPositions = positions;
        nearestId = nodes
          .map((node) => ({ id: node.id, distance: distance(pointer, positions.get(node.id) ?? pointer) }))
          .sort((a, b) => a.distance - b.distance)[0]?.id ?? null;

        for (const [fromId, toId] of edges) {
          const from = positions.get(fromId);
          const to = positions.get(toId);
          if (!from || !to) continue;
          const highlighted = fromId === nearestId || toId === nearestId;
          line(context, from, to, highlighted ? "rgba(91, 153, 255, 0.62)" : "rgba(168, 196, 255, 0.18)", highlighted ? 1.2 : 0.8);
          if (highlighted) {
            const pulse = (time * 0.00034) % 1;
            dot(context, { x: mix(from.x, to.x, pulse), y: mix(from.y, to.y, pulse) }, 1.6, accent);
          }
        }
        for (const node of nodes) {
          const point = positions.get(node.id);
          if (!point) continue;
          const active = node.id === nearestId && pointer.active;
          if (active) {
            context.beginPath();
            context.arc(point.x, point.y, 13, 0, Math.PI * 2);
            context.strokeStyle = "rgba(91, 153, 255, 0.48)";
            context.stroke();
          }
          dot(context, point, active ? 3.6 : 2.2, active ? "rgba(244, 248, 255, 0.98)" : accent);
        }
        if (!frame.policy.staticFallback) {
          context.beginPath();
          context.arc(pointer.x, pointer.y, 10, 0, Math.PI * 2);
          context.strokeStyle = "rgba(220, 233, 255, 0.82)";
          context.stroke();
          dot(context, pointer, 1.8, "rgba(244, 248, 255, 0.98)");
        }
      },
    },
    {
      hideNativeCursor: options.hideNativeCursor ?? true,
      renderOnCoarsePointer: true,
    },
  );

  return {
    ...movement,
    destroy() {
      container.removeEventListener("pointerup", onClick);
      list?.remove();
      movement.destroy();
    },
  };
}
