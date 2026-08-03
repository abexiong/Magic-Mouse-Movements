import { createCanvasMovement } from "../../src/core/canvas-movement.js";
import { clear, seededRandom } from "../../src/core/drawing.js";
import type {
  CanvasFrame,
  MovementInstance,
  Point,
} from "../../src/core/types.js";

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

type RadarSample = Point & {
  angle: number;
  breakBefore: boolean;
  intensity: number;
  speed: number;
  time: number;
};

type RadarPalette = {
  contours: [string, string, string];
  fill: [string, string, string];
  grid: string;
  points: [string, string, string];
  scan: [string, string, string];
};

const REFERENCE_TRAIL_LIFETIME = 1_400;
const MAX_SAMPLES = 78;
const REFERENCE_HALO_RADIUS = 70.8;

const fieldPoints = [
  [0.46, 0.14],
  [0.67, 0.22],
  [0.24, 0.31],
  [0.81, 0.36],
  [0.53, 0.44],
  [0.14, 0.51],
  [0.72, 0.57],
  [0.38, 0.63],
  [0.86, 0.69],
  [0.21, 0.76],
  [0.57, 0.82],
  [0.16, 0.18],
  [0.91, 0.48],
  [0.76, 0.88],
] as const;

function createPalette(accent: string): RadarPalette {
  return {
    contours: [
      `rgba(${accent}, 0.98)`,
      "rgba(0, 0, 82, 0.94)",
      "rgba(74, 104, 207, 0.86)",
    ],
    fill: [
      `rgba(${accent}, 0.1)`,
      "rgba(0, 0, 82, 0.075)",
      "rgba(74, 104, 207, 0.065)",
    ],
    grid: `rgba(${accent}, 0.27)`,
    points: [
      `rgba(${accent}, 1)`,
      "rgba(0, 0, 82, 1)",
      "rgba(74, 104, 207, 0.94)",
    ],
    scan: [
      "rgba(0, 0, 82, 1)",
      `rgba(${accent}, 1)`,
      "rgba(74, 104, 207, 0.94)",
    ],
  };
}

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
        heroTop +
        heroHeight * (0.12 + lineIndex * 0.095) +
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

function configureCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  pixelRatio: number,
) {
  canvas.width = Math.max(1, Math.round(width * pixelRatio));
  canvas.height = Math.max(1, Math.round(height * pixelRatio));
}

function drawTerrainTexture(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  pixelRatio: number,
  palette: RadarPalette,
  contourCount: number,
  pointCount: number,
) {
  const random = seededRandom(20260802);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);

  for (let ridge = 0; ridge < 5; ridge += 1) {
    const baseline = height * (0.24 + ridge * 0.16);
    const phase = ridge * 1.37;
    context.beginPath();
    context.moveTo(-80, height + 40);
    for (let x = -80; x <= width + 80; x += 18) {
      const broadWave = Math.sin(x * 0.0047 + phase) * (58 + ridge * 9);
      const middleWave = Math.sin(x * 0.0105 + phase * 1.8) * (22 + ridge * 3);
      const fineWave = Math.sin(x * 0.026 + phase * 0.7) * 6;
      const ridgeLift =
        Math.exp(
          -Math.pow(
            (x - width * (0.18 + ridge * 0.17)) / (width * 0.18),
            2,
          ),
        ) *
        (48 + ridge * 11);
      context.lineTo(
        x,
        baseline + broadWave + middleWave + fineWave - ridgeLift,
      );
    }
    context.lineTo(width + 80, height + 40);
    context.closePath();
    context.fillStyle = palette.fill[ridge % palette.fill.length] ?? palette.fill[0];
    context.fill();
  }

  context.lineWidth = 0.8;
  for (let band = 0; band < contourCount; band += 1) {
    const baseline = (height * (band + 0.8)) / contourCount;
    const phase = band * 0.46;
    context.beginPath();
    for (let x = -30; x <= width + 30; x += 14) {
      const broadWave = Math.sin(x * 0.0052 + phase) * 28;
      const middleWave = Math.sin(x * 0.013 + phase * 1.6) * 11;
      const ridge =
        Math.exp(
          -Math.pow(
            (x - width * (0.24 + (band % 5) * 0.13)) / (width * 0.17),
            2,
          ),
        ) *
        (18 + (band % 4) * 6);
      const y = baseline + broadWave + middleWave - ridge;
      if (x === -30) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle =
      palette.contours[band % palette.contours.length] ?? palette.contours[0];
    context.globalAlpha = band % 4 === 0 ? 0.92 : 0.62;
    context.setLineDash(band % 5 === 0 ? [3, 5] : []);
    context.stroke();
  }

  context.setLineDash([]);
  context.globalAlpha = 1;
  context.lineWidth = 0.55;
  context.strokeStyle = palette.grid;
  for (let x = 70; x < width; x += 132) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 90; y < height; y += 126) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  for (let point = 0; point < pointCount; point += 1) {
    const x = random() * width;
    const y = random() * height;
    const pointRadius = point % 9 === 0 ? 1.2 : 0.72;
    context.beginPath();
    context.arc(x, y, pointRadius, 0, Math.PI * 2);
    context.fillStyle =
      palette.points[point % palette.points.length] ?? palette.points[0];
    context.globalAlpha = 0.46 + random() * 0.48;
    context.fill();
  }
  context.globalAlpha = 1;
}

function drawMask(
  context: CanvasRenderingContext2D,
  samples: RadarSample[],
  now: number,
  width: number,
  height: number,
  pixelRatio: number,
  lifetime: number,
  radiusScale: number,
) {
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.lineCap = "round";
  context.lineJoin = "round";

  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];
    if (!sample) continue;
    const previousSample = samples[index - 1];
    const age = now - sample.time;
    const life = Math.max(0, 1 - age / lifetime);
    const easedLife = life * life;
    const scanWidth =
      (114 + Math.min(sample.speed, 2.4) * 78) *
      (0.76 + life * 0.24) *
      radiusScale;
    const alpha = easedLife * sample.intensity;
    const isSegment =
      previousSample &&
      !sample.breakBefore &&
      now - previousSample.time < lifetime;

    const drawStroke = (lineWidth: number, strokeAlpha: number) => {
      context.beginPath();
      if (isSegment) {
        context.moveTo(previousSample.x, previousSample.y);
        context.lineTo(sample.x, sample.y);
      } else {
        context.moveTo(sample.x - 0.01, sample.y);
        context.lineTo(sample.x + 0.01, sample.y);
      }
      context.lineWidth = lineWidth;
      context.strokeStyle = `rgba(255, 255, 255, ${strokeAlpha})`;
      context.stroke();
    };

    drawStroke(scanWidth * 1.85, alpha * 0.24);
    drawStroke(scanWidth, alpha);
    drawStroke(Math.max(18, scanWidth * 0.3), alpha * 0.552);
  }

  const latest = samples[samples.length - 1];
  if (!latest) return;
  const latestLife = Math.max(0, 1 - (now - latest.time) / lifetime);
  const radius =
    (138 + Math.min(latest.speed, 2.4) * 54) * radiusScale;
  const gradient = context.createRadialGradient(
    latest.x,
    latest.y,
    3,
    latest.x,
    latest.y,
    radius,
  );
  gradient.addColorStop(
    0,
    `rgba(255, 255, 255, ${latestLife * latest.intensity})`,
  );
  gradient.addColorStop(
    0.5,
    `rgba(255, 255, 255, ${latestLife * latest.intensity * 0.432})`,
  );
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function drawScanFront(
  context: CanvasRenderingContext2D,
  sample: RadarSample,
  now: number,
  palette: RadarPalette,
  radiusScale: number,
) {
  const age = now - sample.time;
  if (age > 170 || sample.intensity < 0.3) return;
  const life = 1 - age / 170;
  const scanWidth =
    (144 + Math.min(sample.speed, 2.4) * 84) * radiusScale;
  const scanLength =
    (62 + Math.min(sample.speed, 2.4) * 42) * radiusScale;
  const scanAlpha = life * sample.intensity;

  context.save();
  context.translate(sample.x, sample.y);
  context.rotate(sample.angle);

  const fieldGradient = context.createLinearGradient(-scanLength, 0, 10, 0);
  fieldGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  fieldGradient.addColorStop(0.5, palette.scan[0]);
  fieldGradient.addColorStop(0.82, palette.scan[2]);
  fieldGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.globalAlpha = scanAlpha * 0.13;
  context.fillStyle = fieldGradient;
  context.beginPath();
  context.moveTo(-scanLength, -scanWidth * 0.68);
  context.lineTo(8, -scanWidth * 0.42);
  context.lineTo(8, scanWidth * 0.42);
  context.lineTo(-scanLength, scanWidth * 0.68);
  context.closePath();
  context.fill();

  const edgeGradient = context.createLinearGradient(
    0,
    -scanWidth / 2,
    0,
    scanWidth / 2,
  );
  edgeGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  edgeGradient.addColorStop(0.22, palette.scan[0]);
  edgeGradient.addColorStop(0.5, palette.scan[1]);
  edgeGradient.addColorStop(0.78, palette.scan[2]);
  edgeGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.globalAlpha = scanAlpha;
  context.strokeStyle = edgeGradient;
  context.lineWidth = 1.15;
  context.beginPath();
  context.moveTo(0, -scanWidth / 2);
  context.lineTo(0, scanWidth / 2);
  context.stroke();

  for (let point = 0; point < 7; point += 1) {
    const pointOffset = point - 3;
    const pointX = -12 - ((point * 17) % Math.max(20, scanLength - 8));
    const pointY = pointOffset * (scanWidth / 7.5);
    context.beginPath();
    context.arc(pointX, pointY, point % 3 === 0 ? 1.15 : 0.75, 0, Math.PI * 2);
    context.fillStyle = palette.points[point % palette.points.length] ?? palette.points[0];
    context.globalAlpha = scanAlpha * (0.4 + (point % 2) * 0.22);
    context.fill();
  }
  context.restore();
  context.globalAlpha = 1;
}

function drawCursor(
  frame: CanvasFrame,
  halo: Point,
  palette: RadarPalette,
  accent: string,
) {
  const { context, pointer, time } = frame;
  if (!pointer.active) return;
  const radius = REFERENCE_HALO_RADIUS * 1.16;

  context.save();
  context.translate(halo.x, halo.y);
  context.strokeStyle = `rgba(${accent}, 0.92)`;
  context.lineWidth = 1;
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = "rgba(0, 0, 82, 0.18)";
  context.beginPath();
  context.arc(0, 0, radius + 1, 0, Math.PI * 2);
  context.stroke();

  context.strokeStyle = `rgba(${accent}, 0.74)`;
  context.beginPath();
  context.moveTo(-radius - 10, 0);
  context.lineTo(-radius - 3, 0);
  context.moveTo(radius + 3, 0);
  context.lineTo(radius + 10, 0);
  context.moveTo(0, -radius - 8);
  context.lineTo(0, -radius - 2);
  context.stroke();

  context.save();
  context.beginPath();
  context.arc(0, 0, radius - 4, 0, Math.PI * 2);
  context.clip();
  context.globalAlpha = 0.82;
  context.strokeStyle = `rgba(${accent}, 0.68)`;
  context.lineWidth = 0.7;
  context.setLineDash([2, 2.75]);
  for (let line = 0; line < 3; line += 1) {
    context.beginPath();
    for (let x = -radius; x <= radius; x += 6) {
      const y = radius * (0.18 + line * 0.22) + Math.sin(x * 0.055 + line) * 10;
      if (x === -radius) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }
  context.setLineDash([]);
  context.fillStyle = palette.points[0];
  for (const [pointX, pointY] of fieldPoints) {
    context.beginPath();
    context.arc(
      (pointX - 0.5) * radius * 2,
      (pointY - 0.5) * radius * 2,
      1,
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  const sweepProgress = (time % 700) / 700;
  const sweepAngle = (-40 + sweepProgress * 340) * (Math.PI / 180);
  const sweepAlpha = Math.sin(sweepProgress * Math.PI) * 0.84;
  context.globalAlpha = Math.max(0, sweepAlpha);
  context.rotate(sweepAngle);
  context.strokeStyle = palette.scan[1];
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(radius, 0);
  context.stroke();
  context.restore();
  context.restore();

  context.save();
  context.beginPath();
  context.arc(pointer.x, pointer.y, 3.36, 0, Math.PI * 2);
  context.fillStyle = `rgba(${accent}, 1)`;
  context.fill();
  context.strokeStyle = "rgba(0, 0, 82, 0.72)";
  context.lineWidth = 1;
  context.stroke();
  context.restore();
}

export function createTerrainScanner(
  container: HTMLElement,
  options: TerrainScannerOptions = {},
): MovementInstance {
  const accent = options.accent ?? "23, 61, 184";
  const palette = createPalette(accent);
  const contourCount = options.contourCount ?? 32;
  const pointCount = options.pointCount ?? 260;
  const revealDuration = Math.max(
    400,
    options.revealDuration ?? REFERENCE_TRAIL_LIFETIME,
  );
  const radiusScale = Math.max(0.5, (options.revealRadius ?? 138) / 138);
  const surfaceColor = options.surfaceColor ?? "#f5f6f2";
  const samples: RadarSample[] = [];
  const maskCanvas = document.createElement("canvas");
  const textureCanvas = document.createElement("canvas");
  const overlayCanvas = document.createElement("canvas");
  const maskContext = maskCanvas.getContext("2d");
  const textureContext = textureCanvas.getContext("2d");
  const overlayContext = overlayCanvas.getContext("2d");
  let cacheKey = "";
  let lastPointerPosition: Point | null = null;
  let lastAngle = 0;
  const halo: Point = { x: 0, y: 0 };
  let haloReady = false;

  const ensureBuffers = (frame: CanvasFrame) => {
    const { width, height, pixelRatio } = frame;
    const nextKey = `${Math.round(width)}:${Math.round(height)}:${pixelRatio.toFixed(3)}:${contourCount}:${pointCount}`;
    if (nextKey === cacheKey) return;
    cacheKey = nextKey;
    configureCanvas(maskCanvas, width, height, pixelRatio);
    configureCanvas(textureCanvas, width, height, pixelRatio);
    configureCanvas(overlayCanvas, width, height, pixelRatio);
    if (textureContext) {
      drawTerrainTexture(
        textureContext,
        width,
        height,
        pixelRatio,
        palette,
        contourCount,
        pointCount,
      );
    }
  };

  const addPointerSample = (frame: CanvasFrame) => {
    const { pointer, time } = frame;
    if (!pointer.active) return;
    const previousPosition = lastPointerPosition;
    const travel = previousPosition
      ? Math.hypot(pointer.x - previousPosition.x, pointer.y - previousPosition.y)
      : Number.POSITIVE_INFINITY;
    if (previousPosition && travel <= 0.5) return;
    if (previousPosition && travel > 0.5) {
      lastAngle = Math.atan2(
        pointer.y - previousPosition.y,
        pointer.x - previousPosition.x,
      );
    }
    const previousSample = samples[samples.length - 1];
    if (previousSample && travel < 2.5 && time - previousSample.time < 28) {
      return;
    }
    samples.push({
      x: pointer.x,
      y: pointer.y,
      time,
      speed: previousPosition ? Math.min(pointer.speed / 1_000, 2.4) : 0,
      angle: lastAngle,
      intensity: 1,
      breakBefore:
        !previousSample ||
        time - previousSample.time > 155 ||
        travel > 260,
    });
    if (samples.length > MAX_SAMPLES) {
      samples.splice(0, samples.length - MAX_SAMPLES);
    }
    lastPointerPosition = { x: pointer.x, y: pointer.y };
  };

  return createCanvasMovement(
    container,
    {
      render(frame) {
        const { context, width, height, pixelRatio, pointer, time, delta } = frame;
        clear(context, width, height);
        if (options.renderSurface) {
          options.renderSurface(context, width, height);
        } else {
          drawWebsiteSurface(context, width, height, surfaceColor);
        }

        if (frame.policy.staticFallback) return;
        ensureBuffers(frame);
        addPointerSample(frame);
        while (
          samples[0] &&
          time - samples[0].time >= revealDuration
        ) {
          samples.shift();
        }

        if (samples.length && maskContext && textureContext && overlayContext) {
          drawMask(
            maskContext,
            samples,
            time,
            width,
            height,
            pixelRatio,
            revealDuration,
            radiusScale,
          );
          overlayContext.setTransform(1, 0, 0, 1, 0, 0);
          overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
          overlayContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
          overlayContext.globalCompositeOperation = "source-over";
          overlayContext.drawImage(
            textureCanvas,
            0,
            0,
            textureCanvas.width,
            textureCanvas.height,
            0,
            0,
            width,
            height,
          );
          overlayContext.globalCompositeOperation = "destination-in";
          overlayContext.drawImage(
            maskCanvas,
            0,
            0,
            maskCanvas.width,
            maskCanvas.height,
            0,
            0,
            width,
            height,
          );
          overlayContext.globalCompositeOperation = "source-over";
          const latest = samples[samples.length - 1];
          if (latest) {
            drawScanFront(overlayContext, latest, time, palette, radiusScale);
          }
          context.drawImage(
            overlayCanvas,
            0,
            0,
            overlayCanvas.width,
            overlayCanvas.height,
            0,
            0,
            width,
            height,
          );
        }

        if (pointer.active) {
          if (!haloReady) {
            halo.x = pointer.x;
            halo.y = pointer.y;
            haloReady = true;
          } else {
            const smoothing = 1 - Math.exp(-Math.max(delta, 1) / 70);
            halo.x += (pointer.x - halo.x) * smoothing;
            halo.y += (pointer.y - halo.y) * smoothing;
          }
          drawCursor(frame, halo, palette, accent);
        }
      },
    },
    {
      hideNativeCursor: options.hideNativeCursor ?? true,
      maxPixelRatio: 1.5,
      pixelBudget: 2_400_000,
      renderOnCoarsePointer: false,
      renderOnReducedMotion: false,
    },
  );
}
