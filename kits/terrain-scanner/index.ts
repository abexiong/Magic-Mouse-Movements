import { createCanvasMovement } from "../../src/core/canvas-movement.js";
import { clear, seededRandom } from "../../src/core/drawing.js";
import type { MovementInstance, Point } from "../../src/core/types.js";

export type TerrainScannerOptions = {
  accent?: string;
  contourCount?: number;
  hideNativeCursor?: boolean;
  pointCount?: number;
};

export function createTerrainScanner(
  container: HTMLElement,
  options: TerrainScannerOptions = {},
): MovementInstance {
  const accent = options.accent ?? "91, 153, 255";
  const contourCount = options.contourCount ?? 26;
  const random = seededRandom(81427);
  const points: Point[] = Array.from({ length: options.pointCount ?? 180 }, () => ({
    x: random(),
    y: random(),
  }));

  const drawTerrain = (
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    alpha: number,
  ) => {
    for (let band = 0; band < contourCount; band += 1) {
      const baseline = ((band + 0.7) / contourCount) * height;
      const phase = band * 0.48;
      context.beginPath();
      for (let x = -20; x <= width + 20; x += 12) {
        const broad = Math.sin(x * 0.007 + phase) * 24;
        const middle = Math.sin(x * 0.019 + phase * 1.4) * 9;
        const ridge = Math.exp(-Math.pow((x - width * (0.2 + (band % 5) * 0.14)) / (width * 0.18), 2)) * 22;
        const y = baseline + broad + middle - ridge;
        if (x === -20) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.strokeStyle = `rgba(${accent}, ${alpha * (band % 4 === 0 ? 1 : 0.64)})`;
      context.lineWidth = band % 4 === 0 ? 1 : 0.65;
      context.setLineDash(band % 6 === 0 ? [3, 5] : []);
      context.stroke();
    }
    context.setLineDash([]);
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      if (!point) continue;
      context.beginPath();
      context.arc(point.x * width, point.y * height, index % 11 === 0 ? 1.25 : 0.7, 0, Math.PI * 2);
      context.fillStyle = `rgba(${accent}, ${alpha * (index % 3 === 0 ? 0.92 : 0.54)})`;
      context.fill();
    }
  };

  return createCanvasMovement(
    container,
    {
      render(frame) {
        const { context, width, height, pointer } = frame;
        clear(context, width, height);
        drawTerrain(context, width, height, 0.13);

        const radius = frame.policy.staticFallback ? Math.min(width, height) * 0.32 : 128 + Math.min(pointer.speed / 20, 68);
        const gradient = context.createRadialGradient(pointer.x, pointer.y, 6, pointer.x, pointer.y, radius);
        gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
        gradient.addColorStop(0.66, "rgba(255, 255, 255, 0.8)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        context.save();
        context.beginPath();
        context.arc(pointer.x, pointer.y, radius, 0, Math.PI * 2);
        context.clip();
        drawTerrain(context, width, height, 0.92);
        context.globalCompositeOperation = "destination-in";
        context.fillStyle = gradient;
        context.fillRect(pointer.x - radius, pointer.y - radius, radius * 2, radius * 2);
        context.restore();

        const angle = Math.atan2(pointer.velocityY, pointer.velocityX || 1);
        context.save();
        context.translate(pointer.x, pointer.y);
        context.rotate(angle);
        const sweep = context.createLinearGradient(0, -radius * 0.55, 0, radius * 0.55);
        sweep.addColorStop(0, "rgba(91, 153, 255, 0)");
        sweep.addColorStop(0.5, "rgba(212, 228, 255, 0.94)");
        sweep.addColorStop(1, "rgba(91, 153, 255, 0)");
        context.strokeStyle = sweep;
        context.lineWidth = 1.2;
        context.beginPath();
        context.moveTo(0, -radius * 0.55);
        context.lineTo(0, radius * 0.55);
        context.stroke();
        context.restore();

        context.beginPath();
        context.arc(pointer.x, pointer.y, 5, 0, Math.PI * 2);
        context.strokeStyle = "rgba(226, 236, 255, 0.92)";
        context.stroke();
      },
    },
    {
      hideNativeCursor: options.hideNativeCursor ?? true,
      renderOnCoarsePointer: true,
    },
  );
}
