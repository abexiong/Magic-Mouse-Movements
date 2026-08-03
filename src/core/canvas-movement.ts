import { readMotionPolicy } from "./motion-policy.js";
import type {
  CanvasFrame,
  CanvasMovementOptions,
  CanvasMovementRenderer,
  MovementInstance,
  PointerSnapshot,
} from "./types.js";

const DEFAULT_POINTER: PointerSnapshot = {
  x: 0,
  y: 0,
  active: false,
  pressed: false,
  pointerType: "mouse",
  speed: 0,
  velocityX: 0,
  velocityY: 0,
};

function interactiveTarget(target: EventTarget | null) {
  return target instanceof Element
    ? Boolean(target.closest("a, button, input, textarea, select, label, [role='button'], [contenteditable='true']"))
    : false;
}

export function createCanvasMovement(
  container: HTMLElement,
  renderer: CanvasMovementRenderer,
  options: CanvasMovementOptions = {},
): MovementInstance {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("Canvas 2D is unavailable.");

  const originalPosition = container.style.position;
  const computedPosition = window.getComputedStyle(container).position;
  if (computedPosition === "static") container.style.position = "relative";

  canvas.className = options.className ?? "magic-mouse-movement-canvas";
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
  });
  container.prepend(canvas);

  const policy = readMotionPolicy(options);
  const pointer: PointerSnapshot = { ...DEFAULT_POINTER };
  let width = 1;
  let height = 1;
  let pixelRatio = 1;
  let requested = false;
  let visible = true;
  let destroyed = false;
  let frameId = 0;
  let lastFrameTime = 0;
  let lastPointerTime = performance.now();
  let lastPointerX = 0;
  let lastPointerY = 0;

  const makeFrame = (time: number, delta: number): CanvasFrame => ({
    context,
    canvas,
    width,
    height,
    pixelRatio,
    time,
    delta,
    pointer,
    policy,
  });

  const draw = (time: number) => {
    frameId = 0;
    if (destroyed || !requested || !visible || document.hidden) return;
    const delta = Math.min(50, time - lastFrameTime || 16.67);
    lastFrameTime = time;
    renderer.render(makeFrame(time, delta));
    if (!policy.staticFallback) frameId = requestAnimationFrame(draw);
  };

  const schedule = () => {
    if (frameId || destroyed || !requested || !visible || document.hidden) return;
    frameId = requestAnimationFrame(draw);
  };

  const resize = () => {
    const bounds = container.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    const desiredRatio = Math.min(window.devicePixelRatio || 1, options.maxPixelRatio ?? 2);
    const pixelBudget = options.pixelBudget ?? 3_200_000;
    pixelRatio = Math.max(0.5, Math.min(desiredRatio, Math.sqrt(pixelBudget / (width * height))));
    canvas.width = Math.max(1, Math.round(width * pixelRatio));
    canvas.height = Math.max(1, Math.round(height * pixelRatio));
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.lineCap = "round";
    context.lineJoin = "round";
    if (!pointer.active) {
      pointer.x = width / 2;
      pointer.y = height / 2;
    }
    const frame = makeFrame(performance.now(), 0);
    renderer.resize?.(frame);
    renderer.render(frame);
  };

  const updatePointer = (event: PointerEvent) => {
    const bounds = container.getBoundingClientRect();
    const now = performance.now();
    const nextX = event.clientX - bounds.left;
    const nextY = event.clientY - bounds.top;
    const seconds = Math.max(0.008, (now - lastPointerTime) / 1000);
    pointer.velocityX = (nextX - lastPointerX) / seconds;
    pointer.velocityY = (nextY - lastPointerY) / seconds;
    pointer.speed = Math.hypot(pointer.velocityX, pointer.velocityY);
    pointer.x = nextX;
    pointer.y = nextY;
    pointer.pointerType = event.pointerType || "mouse";
    pointer.active = !interactiveTarget(event.target);
    lastPointerTime = now;
    lastPointerX = nextX;
    lastPointerY = nextY;
    schedule();
  };

  const onPointerMove = (event: PointerEvent) => updatePointer(event);
  const onPointerEnter = (event: PointerEvent) => {
    updatePointer(event);
    pointer.active = !interactiveTarget(event.target);
    if (options.hideNativeCursor && !policy.staticFallback && pointer.pointerType === "mouse") {
      container.style.cursor = "none";
    }
  };
  const onPointerLeave = () => {
    pointer.active = false;
    pointer.pressed = false;
    pointer.speed = 0;
    container.style.cursor = "";
  };
  const onPointerDown = (event: PointerEvent) => {
    if (interactiveTarget(event.target)) return;
    updatePointer(event);
    pointer.pressed = true;
  };
  const onPointerUp = () => {
    pointer.pressed = false;
  };
  const onVisibilityChange = () => {
    if (document.hidden && frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    } else {
      schedule();
    }
  };

  container.addEventListener("pointermove", onPointerMove, { passive: true });
  container.addEventListener("pointerenter", onPointerEnter, { passive: true });
  container.addEventListener("pointerleave", onPointerLeave, { passive: true });
  container.addEventListener("pointerdown", onPointerDown, { passive: true });
  window.addEventListener("pointerup", onPointerUp, { passive: true });
  document.addEventListener("visibilitychange", onVisibilityChange);

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  const intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (!visible && frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      } else {
        schedule();
      }
    },
    { rootMargin: "180px 0px" },
  );
  intersectionObserver.observe(container);
  resize();

  return {
    start() {
      requested = true;
      schedule();
    },
    pause() {
      requested = false;
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
      container.style.cursor = "";
    },
    resize,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      requested = false;
      if (frameId) cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerenter", onPointerEnter);
      container.removeEventListener("pointerleave", onPointerLeave);
      container.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      container.style.cursor = "";
      if (computedPosition === "static") container.style.position = originalPosition;
      renderer.destroy?.();
      canvas.remove();
    },
  };
}
