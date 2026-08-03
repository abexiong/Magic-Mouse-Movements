import { createCanvasMovement } from "../../src/core/canvas-movement.js";
import { clear, distance, seededRandom } from "../../src/core/drawing.js";
import type { MovementInstance, Point } from "../../src/core/types.js";

export type TerrainScannerOptions = {
  accent?: string;
  contourCount?: number;
  hideNativeCursor?: boolean;
  pointCount?: number;
  renderSurface?: (
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) => void;
  revealDuration?: number;
  revealRadius?: number;
  surfaceColor?: string;
  terrainColor?: string;
};

type ScanPoint = Point & { distance: number; life: number; radius: number };

function drawWebsiteSurface(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  surfaceColor: string,
) {
  const padding = Math.max(22, width * 0.035);
  const headerHeight = Math.min(68, height * 0.1);
  const contentWidth = width - padding * 2;
  const heroTop = headerHeight + Math.max(24, height * 0.04);
  const heroHeight = Math.min(height * 0.46, 340);
  const copyWidth = contentWidth * 0.48;

  context.fillStyle = surfaceColor;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#fbfcfa";
  context.fillRect(0, 0, width, headerHeight);
  context.strokeStyle = "rgba(19, 39, 66, 0.12)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, headerHeight + 0.5);
  context.lineTo(width, headerHeight + 0.5);
  context.stroke();

  context.fillStyle = "#1f5fc4";
  context.beginPath();
  context.roundRect(padding, headerHeight * 0.32, 22, 22, 5);
  context.fill();
  context.fillStyle = "#17304f";
  context.font = "700 13px Arial, Helvetica, sans-serif";
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText("FIELD NOTES", padding + 32, headerHeight * 0.32 + 11);

  const navigation = ["OVERVIEW", "METHOD", "EVIDENCE"];
  context.fillStyle = "#718096";
  context.font = "600 9px Arial, Helvetica, sans-serif";
  context.textAlign = "right";
  let navigationX = width - padding;
  for (let index = navigation.length - 1; index >= 0; index -= 1) {
    const label = navigation[index];
    if (!label) continue;
    context.fillText(label, navigationX, headerHeight * 0.49);
    navigationX -= context.measureText(label).width + 22;
  }

  context.textAlign = "left";
  context.fillStyle = "#2a67d2";
  context.font = "700 10px Arial, Helvetica, sans-serif";
  context.fillText("SITE INTELLIGENCE", padding, heroTop + 12);

  const titleSize = Math.max(30, Math.min(width * 0.052, height * 0.075, 54));
  context.fillStyle = "#172c46";
  context.font = `750 ${titleSize}px Arial, Helvetica, sans-serif`;
  context.textBaseline = "alphabetic";
  context.fillText("Read beyond", padding, heroTop + titleSize + 30);
  context.fillText("the surface.", padding, heroTop + titleSize * 2 + 34);

  context.fillStyle = "#65758a";
  context.font = "400 13px Arial, Helvetica, sans-serif";
  context.fillText(
    "Move through the page to expose the deeper signal.",
    padding,
    heroTop + titleSize * 2 + 68,
  );

  context.fillStyle = "#e6ebf1";
  context.beginPath();
  context.roundRect(
    padding + copyWidth + contentWidth * 0.06,
    heroTop,
    contentWidth - copyWidth - contentWidth * 0.06,
    heroHeight,
    8,
  );
  context.fill();

  const imageLeft = padding + copyWidth + contentWidth * 0.06;
  const imageWidth = contentWidth - copyWidth - contentWidth * 0.06;
  const imageGradient = context.createLinearGradient(
    imageLeft,
    heroTop,
    imageLeft + imageWidth,
    heroTop + heroHeight,
  );
  imageGradient.addColorStop(0, "#d7e2ec");
  imageGradient.addColorStop(0.52, "#aabccf");
  imageGradient.addColorStop(1, "#6f88a5");
  context.fillStyle = imageGradient;
  context.beginPath();
  context.roundRect(imageLeft, heroTop, imageWidth, heroHeight, 8);
  context.fill();

  context.strokeStyle = "rgba(248, 251, 255, 0.46)";
  context.lineWidth = 1;
  for (let lineIndex = 0; lineIndex < 9; lineIndex += 1) {
    context.beginPath();
    for (let x = imageLeft; x <= imageLeft + imageWidth; x += 12) {
      const y =
        heroTop + heroHeight * (0.12 + lineIndex * 0.095) +
        Math.sin(x * 0.026 + lineIndex * 0.72) * 8;
      if (x === imageLeft) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }

  const cardsTop = Math.min(height - 112, heroTop + heroHeight + 26);
  const cardGap = Math.max(10, width * 0.012);
  const cardWidth = (contentWidth - cardGap * 2) / 3;
  const cardTitles = ["CONTEXT", "EVIDENCE", "SYSTEMS"];
  const cardCopy = [
    "What the surface says",
    "What the signal proves",
    "How the layers connect",
  ];
  for (let index = 0; index < 3; index += 1) {
    const left = padding + index * (cardWidth + cardGap);
    context.fillStyle = "rgba(248, 251, 255, 0.78)";
    context.beginPath();
    context.roundRect(left, cardsTop, cardWidth, 86, 6);
    context.fill();
    context.strokeStyle = "rgba(19, 39, 66, 0.1)";
    context.stroke();
    context.fillStyle = "#2a67d2";
    context.font = "700 9px Arial, Helvetica, sans-serif";
    context.fillText(cardTitles[index] ?? "FIELD", left + 14, cardsTop + 23);
    context.fillStyle = "#52657a";
    context.font = "500 11px Arial, Helvetica, sans-serif";
    context.fillText(
      cardCopy[index] ?? "Inspect the layer",
      left + 14,
      cardsTop + 51,
    );
  }
}

export function createTerrainScanner(
  container: HTMLElement,
  options: TerrainScannerOptions = {},
): MovementInstance {
  const accent = options.accent ?? "42, 103, 210";
  const contourCount = options.contourCount ?? 28;
  const revealDuration = Math.max(900, options.revealDuration ?? 3_000);
  const revealRadius = options.revealRadius ?? 96;
  const surfaceColor = options.surfaceColor ?? "#f5f6f2";
  const terrainColor = options.terrainColor ?? "#0a1930";
  const random = seededRandom(81427);
  const samples: Point[] = Array.from(
    { length: options.pointCount ?? 210 },
    () => ({ x: random(), y: random() }),
  );
  const revealed: ScanPoint[] = [];
  const terrainCanvas = document.createElement("canvas");
  const terrainContext = terrainCanvas.getContext("2d");
  let terrainCacheKey = "";
  let trailDistance = 0;
  let lastInputPosition: Point | null = null;

  const addTrailPoint = (
    x: number,
    y: number,
    radius: number,
    width: number,
    height: number,
    pathDistance: number,
    life = revealDuration,
  ) => {
    revealed.push({
      x: x / width,
      y: y / height,
      distance: pathDistance,
      life,
      radius: radius / Math.min(width, height),
    });
  };

  const drawTerrain = (
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) => {
    context.fillStyle = terrainColor;
    context.fillRect(0, 0, width, height);

    const glow = context.createRadialGradient(
      width * 0.63,
      height * 0.42,
      0,
      width * 0.63,
      height * 0.42,
      Math.max(width, height) * 0.72,
    );
    glow.addColorStop(0, `rgba(${accent}, 0.34)`);
    glow.addColorStop(0.48, `rgba(${accent}, 0.11)`);
    glow.addColorStop(1, "rgba(4, 12, 25, 0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    for (let band = 0; band < contourCount; band += 1) {
      const baseline = ((band + 0.7) / contourCount) * height;
      const phase = band * 0.48;
      context.beginPath();
      for (let x = -20; x <= width + 20; x += 10) {
        const broad = Math.sin(x * 0.007 + phase) * 25;
        const middle = Math.sin(x * 0.019 + phase * 1.4) * 10;
        const ridge =
          Math.exp(
            -Math.pow(
              (x - width * (0.2 + (band % 5) * 0.14)) / (width * 0.18),
              2,
            ),
          ) * 24;
        const y = baseline + broad + middle - ridge;
        if (x === -20) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.strokeStyle = `rgba(171, 207, 255, ${band % 4 === 0 ? 0.86 : 0.48})`;
      context.lineWidth = band % 4 === 0 ? 1.15 : 0.7;
      context.setLineDash(band % 6 === 0 ? [3, 5] : []);
      context.stroke();
    }
    context.setLineDash([]);

    for (let index = 0; index < samples.length; index += 1) {
      const sample = samples[index];
      if (!sample) continue;
      context.beginPath();
      context.arc(
        sample.x * width,
        sample.y * height,
        index % 11 === 0 ? 1.5 : 0.75,
        0,
        Math.PI * 2,
      );
      context.fillStyle = `rgba(${accent}, ${index % 3 === 0 ? 0.92 : 0.58})`;
      context.fill();
    }
  };

  const drawCachedTerrain = (
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    pixelRatio: number,
  ) => {
    if (!terrainContext) {
      drawTerrain(context, width, height);
      return;
    }

    const cacheKey = `${Math.round(width)}:${Math.round(height)}:${pixelRatio.toFixed(3)}`;
    if (cacheKey !== terrainCacheKey) {
      terrainCacheKey = cacheKey;
      terrainCanvas.width = Math.max(1, Math.round(width * pixelRatio));
      terrainCanvas.height = Math.max(1, Math.round(height * pixelRatio));
      terrainContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      drawTerrain(terrainContext, width, height);
    }

    context.drawImage(
      terrainCanvas,
      0,
      0,
      terrainCanvas.width,
      terrainCanvas.height,
      0,
      0,
      width,
      height,
    );
  };

  return createCanvasMovement(
    container,
    {
      render(frame) {
        const { context, width, height, pointer } = frame;
        if (!frame.policy.staticFallback && frame.delta > 0) {
          for (const point of revealed) point.life -= frame.delta;
          while (revealed.length > 0 && revealed[0]!.life <= 0) revealed.shift();
        }
        clear(context, width, height);
        if (options.renderSurface) {
          options.renderSurface(context, width, height);
        } else {
          drawWebsiteSurface(context, width, height, surfaceColor);
        }

        const radius =
          revealRadius +
          (frame.policy.staticFallback ? 0 : Math.min(pointer.speed / 26, 42));
        const inputTravel = lastInputPosition
          ? distance(lastInputPosition, pointer)
          : pointer.active
            ? 1
            : 0;
        const pointerMoved = inputTravel > 0.4;
        if (pointer.active && pointerMoved) {
          lastInputPosition = { x: pointer.x, y: pointer.y };
        }
        const last = revealed[revealed.length - 1];
        const lastPosition = last
          ? { x: last.x * width, y: last.y * height }
          : null;
        const travel = lastPosition ? distance(lastPosition, pointer) : 0;
        const spacing = Math.max(5, radius * 0.075);
        if (pointer.active && pointerMoved && !last) {
          addTrailPoint(
            pointer.x,
            pointer.y,
            radius,
            width,
            height,
            trailDistance,
          );
        } else if (pointer.active && last && travel >= spacing) {
          const steps = Math.min(42, Math.ceil(travel / spacing));
          for (let step = 1; step <= steps; step += 1) {
            const progress = step / steps;
            trailDistance += travel / steps;
            addTrailPoint(
              lastPosition!.x + (pointer.x - lastPosition!.x) * progress,
              lastPosition!.y + (pointer.y - lastPosition!.y) * progress,
              radius,
              width,
              height,
              trailDistance,
              revealDuration - (steps - step) * 5,
            );
          }
          if (revealed.length > 900) {
            revealed.splice(0, revealed.length - 900);
          }
        } else if (pointer.active && pointerMoved && last) {
          last.life = revealDuration;
          last.x = pointer.x / width;
          last.y = pointer.y / height;
          last.radius = radius / Math.min(width, height);
        }

        const drawReveal = (radiusMultiplier: number, alpha: number) => {
          context.save();
          context.beginPath();
          if (frame.policy.staticFallback) {
            context.moveTo(width * 0.38, 0);
            context.lineTo(width, 0);
            context.lineTo(width, height);
            context.lineTo(width * 0.58, height);
            context.closePath();
          } else {
            const scale = Math.min(width, height);
            const latestDistance = revealed[revealed.length - 1]?.distance ?? 0;
            const taperDistance = Math.max(radius * 5.2, 1);
            for (const point of revealed) {
              const remaining = Math.max(0, point.life / revealDuration);
              const timeTaper = Math.pow(remaining, 0.72);
              const distanceBehind = Math.max(
                0,
                latestDistance - point.distance,
              );
              const spatialProgress = Math.max(
                0,
                1 - distanceBehind / taperDistance,
              );
              const spatialTaper =
                0.025 + 0.975 * Math.pow(spatialProgress, 1.18);
              const cometTaper = timeTaper * spatialTaper;
              const pointRadius =
                point.radius * scale * cometTaper * radiusMultiplier;
              if (pointRadius < 0.8) continue;
              context.moveTo(point.x * width + pointRadius, point.y * height);
              context.arc(
                point.x * width,
                point.y * height,
                pointRadius,
                0,
                Math.PI * 2,
              );
            }
          }
          context.clip();
          context.globalAlpha = alpha;
          drawCachedTerrain(context, width, height, frame.pixelRatio);
          context.restore();
        };

        const head = revealed[revealed.length - 1];
        const headStrength = head
          ? Math.pow(Math.max(0, head.life / revealDuration), 0.72)
          : 0;
        const headX = head ? head.x * width : pointer.x;
        const headY = head ? head.y * height : pointer.y;
        const headRadius = head
          ? head.radius * Math.min(width, height)
          : radius;

        if (frame.policy.staticFallback) {
          drawReveal(1, 1);
        } else {
          drawReveal(1.18, 0.07);
          drawReveal(1.06, 0.11);
          drawReveal(0.94, 0.22);
          drawReveal(0.82, 0.58);

          context.save();
          context.beginPath();
          context.arc(
            headX,
            headY,
            headRadius * 0.64 * headStrength,
            0,
            Math.PI * 2,
          );
          context.clip();
          context.globalAlpha = 0.88 * headStrength;
          drawCachedTerrain(context, width, height, frame.pixelRatio);
          context.restore();
        }

        if (!frame.policy.staticFallback && headStrength > 0) {
          const angle = Math.atan2(pointer.velocityY, pointer.velocityX || 1);
          context.save();
          context.globalAlpha = headStrength;
          context.translate(headX, headY);
          context.rotate(angle);
          const frontLength = headRadius * 0.62;
          const field = context.createLinearGradient(-frontLength, 0, 8, 0);
          field.addColorStop(0, `rgba(${accent}, 0)`);
          field.addColorStop(0.72, `rgba(${accent}, 0.13)`);
          field.addColorStop(1, `rgba(${accent}, 0)`);
          context.fillStyle = field;
          context.beginPath();
          context.moveTo(-frontLength, -headRadius * 0.68);
          context.lineTo(4, -headRadius * 0.46);
          context.lineTo(4, headRadius * 0.46);
          context.lineTo(-frontLength, headRadius * 0.68);
          context.closePath();
          context.fill();

          const sweep = context.createLinearGradient(
            0,
            -headRadius * 0.72,
            0,
            headRadius * 0.72,
          );
          sweep.addColorStop(0, `rgba(${accent}, 0)`);
          sweep.addColorStop(0.5, `rgba(${accent}, 0.94)`);
          sweep.addColorStop(1, `rgba(${accent}, 0)`);
          context.strokeStyle = sweep;
          context.lineWidth = 1.35;
          context.beginPath();
          context.moveTo(0, -headRadius * 0.72);
          context.lineTo(0, headRadius * 0.72);
          context.stroke();
          context.restore();

          const halo = context.createRadialGradient(
            headX,
            headY,
            headRadius * 0.7,
            headX,
            headY,
            headRadius * 1.06,
          );
          halo.addColorStop(0, `rgba(${accent}, 0)`);
          halo.addColorStop(0.8, `rgba(${accent}, 0.1)`);
          halo.addColorStop(1, `rgba(${accent}, 0)`);
          context.fillStyle = halo;
          context.beginPath();
          context.arc(headX, headY, headRadius * 1.06, 0, Math.PI * 2);
          context.fill();

          context.beginPath();
          context.arc(headX, headY, headRadius, 0, Math.PI * 2);
          context.strokeStyle = `rgba(${accent}, 0.7)`;
          context.lineWidth = 1.1;
          context.stroke();
          context.beginPath();
          context.arc(headX, headY, 4.5, 0, Math.PI * 2);
          context.fillStyle = `rgb(${accent})`;
          context.fill();
        }
      },
    },
    {
      hideNativeCursor: options.hideNativeCursor ?? true,
      renderOnCoarsePointer: true,
    },
  );
}
