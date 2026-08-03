import { createCanvasMovement } from "../../src/core/canvas-movement.js";
import { clear, distance } from "../../src/core/drawing.js";
import type { MovementInstance, Point } from "../../src/core/types.js";

export type LayeredRevealOptions = {
  accent?: string;
  brushRadius?: number;
  hideNativeCursor?: boolean;
  revealDuration?: number;
  renderBottom?: (
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) => void;
  renderTop?: (
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) => void;
  videoPoster?: string;
  videoSrc?: string;
};

type RevealPoint = Point & { life: number; radius: number };

function headlineSize(width: number, height: number) {
  return Math.max(42, Math.min(width * 0.14, height * 0.25, 116));
}

function defaultTop(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const paper = "#ffffff";
  const ink = "#3d4852";
  const blue = "#2d8cf0";
  const uiFont = 'Arial, Helvetica, sans-serif';
  const wordFont = '"Arial Black", Arial, Helvetica, sans-serif';

  context.fillStyle = paper;
  context.fillRect(0, 0, width, height);

  const padding = Math.max(24, width * 0.05);
  const navigationHeight = Math.min(74, height * 0.11);
  context.fillStyle = paper;
  context.fillRect(0, 0, width, navigationHeight);
  context.strokeStyle = "#e6eaed";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, navigationHeight + 0.5);
  context.lineTo(width, navigationHeight + 0.5);
  context.stroke();

  context.fillStyle = blue;
  context.beginPath();
  context.roundRect(padding, navigationHeight * 0.36, 18, 18, 4);
  context.fill();
  context.fillStyle = "#2f3d4a";
  context.font = `600 15px ${uiFont}`;
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillText("Your Website", padding + 28, navigationHeight * 0.36 + 15);

  if (width > 680) {
    const links = ["HOME", "ABOUT", "SERVICES", "TEAM", "BLOG", "CONTACT"];
    context.fillStyle = "#8a97a3";
    context.font = `600 10px ${uiFont}`;
    context.textAlign = "right";
    let x = width - padding;
    for (let index = links.length - 1; index >= 0; index -= 1) {
      const link = links[index];
      if (!link) continue;
      context.fillText(link, x, navigationHeight * 0.36 + 14);
      x -= context.measureText(link).width + 24;
    }
  }

  const displayScale = Math.max(width / 16, height / 9);
  const displayWidth = 16 * displayScale;
  const displayHeight = 9 * displayScale;
  const offsetX = (width - displayWidth) / 2;
  const offsetY = (height - displayHeight) / 2;

  const fitCap = (text: string, targetCap: number) => {
    const probe = 200;
    context.font = `900 ${probe}px ${wordFont}`;
    const cap = context.measureText(text).actualBoundingBoxAscent || probe * 0.72;
    let size = probe * (targetCap / cap);
    context.font = `900 ${size}px ${wordFont}`;
    const maxWidth = displayWidth * 0.9;
    const measuredWidth = context.measureText(text).width;
    if (measuredWidth > maxWidth) {
      size *= maxWidth / measuredWidth;
      context.font = `900 ${size}px ${wordFont}`;
    }
    return size;
  };

  context.save();
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.fillStyle = ink;
  fitCap("SOMETHING", displayHeight * 0.211);
  const naturalWidth = context.measureText("SOMETHING").width;
  const squeeze = (displayWidth * 0.759) / naturalWidth;
  context.translate(offsetX + displayWidth * 0.5, offsetY + displayHeight * 0.481);
  context.scale(squeeze, 1);
  context.fillText("SOMETHING", 0, 0);
  context.restore();

  const oldSize = fitCap("OLD", displayHeight * 0.25);
  context.textAlign = "center";
  context.fillText(
    "OLD",
    offsetX + displayWidth * 0.5,
    offsetY + displayHeight * 0.731,
  );

  const buttonWidth = Math.min(172, width * 0.2);
  const buttonHeight = 42;
  const buttonY = Math.min(
    height - 142,
    offsetY + displayHeight * 0.731 + oldSize * 0.48 + 26,
  );
  context.fillStyle = blue;
  context.beginPath();
  context.roundRect(
    width / 2 - buttonWidth / 2,
    buttonY,
    buttonWidth,
    buttonHeight,
    buttonHeight / 2,
  );
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = `600 11px ${uiFont}`;
  context.fillText("LEARN MORE", width / 2, buttonY + 26);

  if (height > 570) {
    const titles = ["RETINA READY", "CROSS-BROWSER", "24/7 SUPPORT"];
    const columnY = height - 74;
    const columnWidth = Math.min(260, (width - padding * 2) / 3);
    const startX = width / 2 - columnWidth;
    for (let index = 0; index < titles.length; index += 1) {
      const centerX = startX + columnWidth * index;
      context.beginPath();
      context.arc(centerX, columnY, 17, 0, Math.PI * 2);
      context.strokeStyle = "#dfe5ea";
      context.stroke();
      context.fillStyle = "#5a6672";
      context.font = `600 9px ${uiFont}`;
      context.fillText(titles[index] ?? "FEATURE", centerX, columnY + 36);
    }
  }
}

function defaultBottom(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  context.fillStyle = "#07100d";
  context.fillRect(0, 0, width, height);

  const atmosphere = context.createRadialGradient(
    width * 0.62,
    height * 0.42,
    0,
    width * 0.62,
    height * 0.42,
    Math.max(width, height) * 0.72,
  );
  atmosphere.addColorStop(0, "rgba(137, 255, 94, 0.34)");
  atmosphere.addColorStop(0.34, "rgba(67, 120, 255, 0.18)");
  atmosphere.addColorStop(0.72, "rgba(18, 45, 36, 0.16)");
  atmosphere.addColorStop(1, "rgba(7, 16, 13, 0)");
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalCompositeOperation = "screen";
  for (let lineIndex = 0; lineIndex < 22; lineIndex += 1) {
    context.beginPath();
    for (let x = -12; x <= width + 12; x += 9) {
      const y =
        height * (0.08 + lineIndex * 0.043) +
        Math.sin(x * 0.021 + lineIndex * 0.72) * (10 + lineIndex * 0.5) +
        Math.sin(x * 0.007 - lineIndex * 0.3) * 18;
      if (x === -12) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = `rgba(${lineIndex % 3 === 0 ? "145, 255, 109" : "123, 170, 255"}, ${lineIndex % 4 === 0 ? 0.34 : 0.16})`;
    context.lineWidth = lineIndex % 4 === 0 ? 1.05 : 0.65;
    context.stroke();
  }
  context.restore();

  const size = headlineSize(width, height);
  const chrome = context.createLinearGradient(
    0,
    height * 0.5 - size,
    0,
    height * 0.5 + size,
  );
  chrome.addColorStop(0, "#f4fff2");
  chrome.addColorStop(0.22, "#8dff69");
  chrome.addColorStop(0.48, "#335dff");
  chrome.addColorStop(0.7, "#f1efff");
  chrome.addColorStop(1, "#5dde91");

  context.save();
  context.translate(width * 0.5, height * 0.5);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `800 ${size}px Arial, Helvetica, sans-serif`;
  context.lineJoin = "round";
  context.shadowColor = "rgba(124, 255, 89, 0.44)";
  context.shadowBlur = 26;
  context.strokeStyle = "rgba(236, 255, 240, 0.72)";
  context.lineWidth = Math.max(2, size * 0.045);
  context.strokeText("SOMETHING", 0, -size * 0.48);
  context.strokeText("NEW", 0, size * 0.5);
  context.shadowBlur = 0;
  context.fillStyle = chrome;
  context.fillText("SOMETHING", 0, -size * 0.48);
  context.fillText("NEW", 0, size * 0.5);
  context.restore();
}

export function createLayeredReveal(
  container: HTMLElement,
  options: LayeredRevealOptions = {},
): MovementInstance {
  const revealed: RevealPoint[] = [];
  let lastPointerSample: Point | null = null;
  const revealDuration = Math.max(600, options.revealDuration ?? 2_600);

  const movement = createCanvasMovement(
    container,
    {
      render(frame) {
        const { context, width, height, pointer } = frame;
        if (!frame.policy.staticFallback && frame.delta > 0) {
          for (const point of revealed) point.life -= frame.delta;
          while (revealed.length > 0 && revealed[0]!.life <= 0) revealed.shift();
        }
        frame.canvas.dataset.revealPoints = String(revealed.length);
        frame.canvas.dataset.oldestRevealLife = String(
          Math.max(0, Math.round(revealed[0]?.life ?? 0)),
        );
        clear(context, width, height);
        (options.renderTop ?? defaultTop)(context, width, height);

        const radius =
          options.brushRadius ?? Math.min(width, height) * 0.13;
        if (!pointer.active) lastPointerSample = null;
        const previous = lastPointerSample;
        const travel = previous ? distance(previous, pointer) : 0;
        if (pointer.active && (!previous || travel > 9)) {
          const steps = previous ? Math.min(20, Math.max(1, Math.ceil(travel / 9))) : 1;
          for (let step = 1; step <= steps; step += 1) {
            const progress = step / steps;
            revealed.push({
              x: (previous ? previous.x + (pointer.x - previous.x) * progress : pointer.x) / width,
              y: (previous ? previous.y + (pointer.y - previous.y) * progress : pointer.y) / height,
              life: revealDuration,
              radius: radius / Math.min(width, height),
            });
          }
          while (revealed.length > 420) revealed.shift();
          lastPointerSample = { x: pointer.x, y: pointer.y };
        }

        context.save();
        context.beginPath();
        if (frame.policy.staticFallback) {
          context.moveTo(width * 0.46, 0);
          context.lineTo(width, 0);
          context.lineTo(width, height);
          context.lineTo(width * 0.6, height);
          context.closePath();
        } else {
          const scale = Math.min(width, height);
          const fadeWindow = Math.min(1_200, revealDuration * 0.4);
          for (const point of revealed) {
            const fadeProgress = Math.min(1, point.life / fadeWindow);
            const easedFade = fadeProgress * fadeProgress * (3 - 2 * fadeProgress);
            const pointRadius = point.radius * scale * easedFade;
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
        if (options.videoSrc) {
          context.globalCompositeOperation = "destination-out";
          context.fillStyle = "#000000";
          context.fill();
        } else {
          context.clip();
          (options.renderBottom ?? defaultBottom)(context, width, height);
        }
        context.restore();

        if (!frame.policy.staticFallback && pointer.active) {
          const halo = context.createRadialGradient(
            pointer.x,
            pointer.y,
            radius * 0.62,
            pointer.x,
            pointer.y,
            radius * 1.08,
          );
          halo.addColorStop(0, "rgba(124, 255, 89, 0)");
          halo.addColorStop(0.74, "rgba(124, 255, 89, 0.08)");
          halo.addColorStop(1, "rgba(124, 255, 89, 0)");
          context.fillStyle = halo;
          context.beginPath();
          context.arc(pointer.x, pointer.y, radius * 1.08, 0, Math.PI * 2);
          context.fill();

          context.beginPath();
          context.arc(pointer.x, pointer.y, radius, 0, Math.PI * 2);
          context.strokeStyle =
            options.accent ?? "rgba(124, 255, 89, 0.68)";
          context.lineWidth = 1.15;
          context.stroke();
        }
      },
    },
    {
      hideNativeCursor: options.hideNativeCursor ?? true,
      renderOnCoarsePointer: true,
    },
  );

  if (!options.videoSrc) return movement;

  const prefersStaticMedia =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    Boolean(
      (navigator as Navigator & { connection?: { saveData?: boolean } })
        .connection?.saveData,
    );
  const video = document.createElement("video");
  video.src = options.videoSrc;
  if (options.videoPoster) video.poster = options.videoPoster;
  video.autoplay = !prefersStaticMedia;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.setAttribute("aria-hidden", "true");
  Object.assign(video.style, {
    height: "100%",
    inset: "0",
    objectFit: "cover",
    pointerEvents: "none",
    position: "absolute",
    width: "100%",
  });
  container.prepend(video);

  return {
    ...movement,
    start() {
      movement.start();
      if (!prefersStaticMedia) void video.play().catch(() => undefined);
    },
    pause() {
      movement.pause();
      video.pause();
    },
    destroy() {
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.remove();
      movement.destroy();
    },
  };
}
