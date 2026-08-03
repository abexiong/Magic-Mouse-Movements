import { createCanvasMovement } from "../../src/core/canvas-movement.js";
import { clear, dot, label, line, mix, TAU } from "../../src/core/drawing.js";
import type { MovementInstance, Point } from "../../src/core/types.js";

export type SystemAssemblyOptions = {
  accent?: string;
  domains?: readonly string[];
  hideNativeCursor?: boolean;
};

const DEFAULT_DOMAINS = ["INPUT", "RENDER", "MOTION", "ACCESS", "OUTPUT"];

export function createSystemAssembly(
  container: HTMLElement,
  options: SystemAssemblyOptions = {},
): MovementInstance {
  const domains = options.domains ?? DEFAULT_DOMAINS;
  const accent = options.accent ?? "rgba(91, 153, 255, 0.96)";
  const center: Point = { x: 0, y: 0 };
  let initialized = false;

  return createCanvasMovement(
    container,
    {
      render(frame) {
        const { context, width, height, pointer, time } = frame;
        clear(context, width, height);
        if (!initialized) {
          center.x = pointer.x || width / 2;
          center.y = pointer.y || height / 2;
          initialized = true;
        }
        center.x = mix(center.x, pointer.x, frame.policy.staticFallback ? 1 : 0.11);
        center.y = mix(center.y, pointer.y, frame.policy.staticFallback ? 1 : 0.11);

        const activeIndex = Math.min(
          domains.length - 1,
          Math.max(0, Math.floor((pointer.x / Math.max(1, width)) * domains.length)),
        );
        const radius = 35;
        for (let index = 0; index < domains.length; index += 1) {
          const start = -Math.PI / 2 + index * (TAU / domains.length) + 0.08;
          const end = start + TAU / domains.length - 0.16;
          const active = index === activeIndex;
          context.beginPath();
          context.arc(center.x, center.y, radius + (active ? 4 : 0), start, end);
          context.strokeStyle = active ? accent : "rgba(173, 198, 244, 0.28)";
          context.lineWidth = active ? 2.2 : 1;
          context.stroke();
          const angle = (start + end) / 2;
          const inner = { x: center.x + Math.cos(angle) * 8, y: center.y + Math.sin(angle) * 8 };
          const outer = { x: center.x + Math.cos(angle) * (radius - 7), y: center.y + Math.sin(angle) * (radius - 7) };
          line(context, inner, outer, active ? "rgba(91, 153, 255, 0.65)" : "rgba(173, 198, 244, 0.2)", 0.8);
        }

        for (let node = 0; node < 3; node += 1) {
          const angle = time * 0.00035 + node * (TAU / 3);
          const point = {
            x: center.x + Math.cos(angle) * (76 + node * 19),
            y: center.y + Math.sin(angle) * (42 + node * 12),
          };
          line(context, center, point, "rgba(91, 153, 255, 0.18)", 0.8);
          dot(context, point, node === activeIndex % 3 ? 2.5 : 1.5, accent);
        }

        dot(context, pointer, 2.5, "rgba(244, 248, 255, 0.95)");
        if (pointer.active && !frame.policy.staticFallback) {
          label(context, pointer, `DOMAIN / ${domains[activeIndex] ?? "SYSTEM"}`);
        }
      },
    },
    { hideNativeCursor: options.hideNativeCursor ?? true },
  );
}
