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
  { id: "origin", label: "Origin", detail: "Starting point", x: 0.08, y: 0.54 },
  { id: "signal", label: "Signal", detail: "Notice the opportunity", x: 0.16, y: 0.2 },
  { id: "explore", label: "Explore", detail: "Open a path", x: 0.28, y: 0.35 },
  { id: "evidence", label: "Evidence", detail: "Ground the direction", x: 0.34, y: 0.67 },
  { id: "build", label: "Build", detail: "Create the system", x: 0.47, y: 0.46 },
  { id: "systems", label: "Systems", detail: "Connect the parts", x: 0.54, y: 0.16 },
  { id: "test", label: "Test", detail: "Verify the result", x: 0.65, y: 0.32 },
  { id: "observe", label: "Observe", detail: "Watch the signal", x: 0.77, y: 0.17 },
  { id: "launch", label: "Launch", detail: "Enter the field", x: 0.83, y: 0.43 },
  { id: "ship", label: "Ship", detail: "Release carefully", x: 0.92, y: 0.66 },
  { id: "learn", label: "Learn", detail: "Return with evidence", x: 0.43, y: 0.82 },
  { id: "connect", label: "Connect", detail: "Link the network", x: 0.62, y: 0.74 },
  { id: "adapt", label: "Adapt", detail: "Respond to evidence", x: 0.78, y: 0.84 },
  { id: "archive", label: "Archive", detail: "Preserve the learning", x: 0.18, y: 0.84 },
  { id: "map", label: "Map", detail: "See the whole field", x: 0.41, y: 0.18 },
  { id: "release", label: "Release", detail: "Share the result", x: 0.91, y: 0.23 },
];

const DEFAULT_EDGES: readonly ConstellationEdge[] = [
  ["origin", "explore"],
  ["origin", "signal"],
  ["origin", "learn"],
  ["origin", "archive"],
  ["signal", "explore"],
  ["signal", "systems"],
  ["explore", "build"],
  ["explore", "evidence"],
  ["explore", "systems"],
  ["evidence", "build"],
  ["evidence", "learn"],
  ["evidence", "archive"],
  ["build", "test"],
  ["build", "learn"],
  ["build", "connect"],
  ["systems", "test"],
  ["systems", "observe"],
  ["test", "observe"],
  ["test", "launch"],
  ["test", "ship"],
  ["observe", "launch"],
  ["launch", "ship"],
  ["launch", "connect"],
  ["learn", "ship"],
  ["learn", "connect"],
  ["learn", "archive"],
  ["connect", "ship"],
  ["connect", "adapt"],
  ["adapt", "ship"],
  ["map", "systems"],
  ["map", "explore"],
  ["observe", "release"],
  ["release", "launch"],
];

const hash = (seed: number) => {
  const value = Math.sin(seed * 92.173 + 14.71) * 43758.5453;
  return value - Math.floor(value);
};

export function createConstellationWand(
  container: HTMLElement,
  options: ConstellationWandOptions = {},
): MovementInstance {
  const nodes = options.nodes ?? DEFAULT_NODES;
  const edges = options.edges ?? DEFAULT_EDGES;
  const accent = options.accent ?? "rgba(91, 153, 255, 0.96)";
  let currentPositions = new Map<string, Point>();
  let nearestId: string | null = null;
  let selectedId: string | null = null;
  const smoothedPointer = { x: 0, y: 0 };
  let pointerActivity = 0;
  let initialized = false;

  const list = options.listContainer ? document.createElement("ul") : null;
  if (list && options.listContainer) {
    list.setAttribute("aria-label", "Constellation destinations");
    for (const node of nodes) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = node.label;
      if (node.detail) button.setAttribute("aria-label", `${node.label}: ${node.detail}`);
      button.addEventListener("click", () => {
        selectedId = node.id;
        options.onSelect?.(node);
      });
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
    if (node) {
      selectedId = node.id;
      options.onSelect?.(node);
    }
  };
  container.addEventListener("pointerup", onClick);

  const movement = createCanvasMovement(
    container,
    {
      render(frame) {
        const { context, width, height, pointer, time } = frame;
        clear(context, width, height);
        if (!initialized) {
          smoothedPointer.x = pointer.x || width * 0.49;
          smoothedPointer.y = pointer.y || height * 0.47;
          initialized = true;
        }
        smoothedPointer.x = mix(smoothedPointer.x, pointer.x, 0.095);
        smoothedPointer.y = mix(smoothedPointer.y, pointer.y, 0.095);
        pointerActivity = mix(
          pointerActivity,
          pointer.active && !frame.policy.staticFallback ? 1 : 0,
          0.06,
        );

        const pointerGlow = context.createRadialGradient(
          smoothedPointer.x,
          smoothedPointer.y,
          0,
          smoothedPointer.x,
          smoothedPointer.y,
          300,
        );
        pointerGlow.addColorStop(0, `rgba(53, 108, 225, ${0.39 * pointerActivity})`);
        pointerGlow.addColorStop(0.45, `rgba(32, 73, 164, ${0.165 * pointerActivity})`);
        pointerGlow.addColorStop(1, "rgba(22, 51, 116, 0)");
        context.fillStyle = pointerGlow;
        context.fillRect(smoothedPointer.x - 300, smoothedPointer.y - 300, 600, 600);

        const dustCount = width < 680 ? 150 : 280;
        for (let index = 0; index < dustCount; index += 1) {
          const homeX = hash(index * 4.71) * width;
          const homeY = hash(index * 8.37 + 9) * height;
          const deltaX = smoothedPointer.x - homeX;
          const deltaY = smoothedPointer.y - homeY;
          const pointerDistance = Math.max(1, Math.hypot(deltaX, deltaY));
          const energy = clamp(1 - pointerDistance / 250, 0, 1) * pointerActivity;
          const drift = energy * (11 + hash(index * 3.2) * 18);
          const x = homeX - (deltaX / pointerDistance) * drift + Math.sin(time * 0.00018 + index) * 1.4;
          const y = homeY - (deltaY / pointerDistance) * drift + Math.cos(time * 0.00015 + index * 1.7) * 1.4;
          const twinkle = 0.62 + Math.sin(time * 0.0012 + index * 2.3) * 0.38;
          const alpha = 0.08 + hash(index * 6.9) * 0.28 + energy * 0.56;
          const radius = 0.35 + hash(index * 11.2) * 1.05 + energy * 1.45;
          dot(context, { x, y }, radius, `rgba(166, 190, 235, ${alpha * twinkle})`);
        }

        const positions = new Map<string, Point>();
        for (const node of nodes) {
          const home = { x: node.x <= 1 ? node.x * width : node.x, y: node.y <= 1 ? node.y * height : node.y };
          positions.set(node.id, home);
        }
        currentPositions = positions;
        nearestId = nodes
          .map((node) => ({ id: node.id, distance: distance(smoothedPointer, positions.get(node.id) ?? smoothedPointer) }))
          .sort((a, b) => a.distance - b.distance)[0]?.id ?? null;

        for (const [fromId, toId] of edges) {
          const from = positions.get(fromId);
          const to = positions.get(toId);
          if (!from || !to) continue;
          const middleX = (from.x + to.x) * 0.5;
          const middleY = (from.y + to.y) * 0.5;
          const pointerDistance = Math.hypot(smoothedPointer.x - middleX, smoothedPointer.y - middleY);
          const warp = clamp(1 - pointerDistance / 330, 0, 1) * pointerActivity;
          const highlighted = fromId === nearestId || toId === nearestId || fromId === selectedId || toId === selectedId;
          context.beginPath();
          context.moveTo(from.x, from.y);
          context.quadraticCurveTo(
            middleX + (smoothedPointer.x - middleX) * warp * 0.28,
            middleY + (smoothedPointer.y - middleY) * warp * 0.28,
            to.x,
            to.y,
          );
          context.strokeStyle = highlighted
            ? "rgba(112, 160, 248, 0.5)"
            : `rgba(112, 160, 248, ${0.075 + warp * 0.14})`;
          context.lineWidth = 1;
          context.stroke();
        }

        if (pointerActivity > 0.04) {
          const nearest = nodes
            .map((node) => ({ node, point: positions.get(node.id)! }))
            .sort((a, b) => distance(smoothedPointer, a.point) - distance(smoothedPointer, b.point))
            .slice(0, 3);
          for (const { point } of nearest) {
            const nodeDistance = distance(smoothedPointer, point);
            const alpha = clamp(1 - nodeDistance / 420, 0, 1) * 0.2 * pointerActivity;
            line(context, smoothedPointer, point, `rgba(135, 177, 255, ${alpha})`, 1);
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
        if (selectedId) {
          const selectedPoint = positions.get(selectedId);
          if (selectedPoint) {
            const pulse = (time * 0.055) % 54;
            context.beginPath();
            context.arc(selectedPoint.x, selectedPoint.y, 18 + pulse, 0, Math.PI * 2);
            context.strokeStyle = `rgba(127, 173, 255, ${0.34 * (1 - pulse / 54)})`;
            context.stroke();
          }
        }
        if (!frame.policy.staticFallback) {
          context.beginPath();
          context.arc(pointer.x, pointer.y, 10, 0, Math.PI * 2);
          context.strokeStyle = "rgba(220, 233, 255, 0.82)";
          context.stroke();
          context.beginPath();
          context.arc(pointer.x, pointer.y, 5.5, time * 0.004, time * 0.004 + Math.PI * 1.42);
          context.strokeStyle = "rgba(91, 153, 255, 0.72)";
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
