import { createCanvasMovement } from "../../src/core/canvas-movement.js";
import { clear, distance } from "../../src/core/drawing.js";
import type { MovementInstance, Point } from "../../src/core/types.js";

export type LayeredRevealOptions = {
  accent?: string;
  brushRadius?: number;
  hideNativeCursor?: boolean;
  renderBottom?: (context: CanvasRenderingContext2D, width: number, height: number) => void;
  renderTop?: (context: CanvasRenderingContext2D, width: number, height: number) => void;
};

type RevealPoint = Point & { life: number };

function defaultTop(context: CanvasRenderingContext2D, width: number, height: number) {
  context.fillStyle = "#151a23";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "rgba(224, 230, 240, 0.12)";
  context.lineWidth = 1;
  for (let x = 32; x < width; x += 64) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 32; y < height; y += 64) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
}

function defaultBottom(context: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = context.createRadialGradient(width * 0.65, height * 0.42, 20, width * 0.65, height * 0.42, width * 0.62);
  gradient.addColorStop(0, "#5793ff");
  gradient.addColorStop(0.42, "#173d87");
  gradient.addColorStop(1, "#07111f");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "rgba(220, 235, 255, 0.48)";
  for (let lineIndex = 0; lineIndex < 14; lineIndex += 1) {
    context.beginPath();
    for (let x = 0; x <= width; x += 12) {
      const y = height * (0.18 + lineIndex * 0.048) + Math.sin(x * 0.018 + lineIndex * 0.6) * 18;
      if (x === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }
}

export function createLayeredReveal(
  container: HTMLElement,
  options: LayeredRevealOptions = {},
): MovementInstance {
  const trail: RevealPoint[] = [];
  const brushRadius = options.brushRadius ?? 78;

  return createCanvasMovement(
    container,
    {
      render(frame) {
        const { context, width, height, pointer, delta } = frame;
        clear(context, width, height);
        (options.renderTop ?? defaultTop)(context, width, height);

        const last = trail[trail.length - 1];
        if (!last || distance(last, pointer) > 12) trail.push({ x: pointer.x, y: pointer.y, life: 1 });
        if (trail.length > 38) trail.shift();
        for (const point of trail) point.life = Math.max(0, point.life - delta / 2100);
        while (trail[0] && trail[0].life <= 0) trail.shift();

        context.save();
        context.beginPath();
        if (frame.policy.staticFallback) {
          context.rect(width * 0.5, 0, width * 0.5, height);
        } else {
          for (const point of trail) {
            context.moveTo(point.x + brushRadius * point.life, point.y);
            context.arc(point.x, point.y, brushRadius * (0.65 + point.life * 0.35), 0, Math.PI * 2);
          }
        }
        context.clip();
        (options.renderBottom ?? defaultBottom)(context, width, height);
        context.restore();

        if (!frame.policy.staticFallback) {
          context.beginPath();
          context.arc(pointer.x, pointer.y, brushRadius, 0, Math.PI * 2);
          context.strokeStyle = options.accent ?? "rgba(168, 196, 255, 0.62)";
          context.lineWidth = 1;
          context.stroke();
        }
      },
    },
    {
      hideNativeCursor: options.hideNativeCursor ?? true,
      renderOnCoarsePointer: true,
    },
  );
}
