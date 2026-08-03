import { readMotionPolicy } from "../../src/core/motion-policy.js";
import type { MovementInstance } from "../../src/core/types.js";

export type PassbandName = "optical" | "thermal" | "radar" | "semantic";

export type PassbandLensOptions = {
  autoCycleMs?: false | number;
  band?: PassbandName;
  hideNativeCursor?: boolean;
  lensRadius?: number;
  onBandChange?: (band: PassbandName) => void;
};

export type PassbandLensInstance = MovementInstance & {
  getBand: () => PassbandName;
  setBand: (band: PassbandName) => void;
};

const BANDS: readonly PassbandName[] = ["optical", "thermal", "radar", "semantic"];

const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
out vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uBand;
uniform float uTime;
uniform float uLensOn;
uniform float uLensRadius;

float terrain(vec2 uv) {
  float broad = sin(uv.x * 11.0 + uv.y * 3.0) * 0.18;
  float middle = sin(uv.x * 31.0 - uv.y * 17.0) * 0.08;
  float fine = sin((uv.x + uv.y) * 73.0) * 0.025;
  float ridge = exp(-pow((uv.x - 0.62) * 5.2, 2.0)) * 0.35;
  float basin = exp(-length((uv - vec2(0.28, 0.62)) * vec2(1.2, 1.8)) * 6.0) * 0.22;
  return clamp(0.48 + broad + middle + fine + ridge - basin, 0.0, 1.0);
}

vec3 thermal(float value) {
  vec3 cold = vec3(0.08, 0.02, 0.24);
  vec3 middle = vec3(0.72, 0.08, 0.42);
  vec3 hot = vec3(1.0, 0.78, 0.18);
  return value < 0.5 ? mix(cold, middle, value * 2.0) : mix(middle, hot, (value - 0.5) * 2.0);
}

vec3 bandColor(float band, vec2 uv) {
  float value = terrain(uv);
  float contours = 1.0 - smoothstep(0.0, 0.055, abs(fract(value * 14.0) - 0.5));
  vec2 texel = 1.0 / max(uResolution, vec2(1.0));
  float edge = abs(terrain(uv + vec2(texel.x * 4.0, 0.0)) - terrain(uv - vec2(texel.x * 4.0, 0.0)))
    + abs(terrain(uv + vec2(0.0, texel.y * 4.0)) - terrain(uv - vec2(0.0, texel.y * 4.0)));

  if (band < 0.5) {
    vec3 ground = mix(vec3(0.07, 0.10, 0.15), vec3(0.62, 0.70, 0.78), value);
    return ground + contours * vec3(0.12, 0.18, 0.25);
  }
  if (band < 1.5) return thermal(value + sin(uTime * 0.35 + uv.x * 5.0) * 0.025);
  if (band < 2.5) {
    float sweep = smoothstep(0.035, 0.0, abs(fract(atan(uv.y - 0.5, uv.x - 0.5) / 6.28318 - uTime * 0.035) - 0.5));
    return vec3(0.02, 0.09, 0.12) + vec3(0.18, 0.92, 0.78) * clamp(edge * 9.0 + contours * 0.22 + sweep * 0.16, 0.0, 1.0);
  }
  float zone = floor(value * 5.0) / 4.0;
  vec3 semantic = mix(vec3(0.10, 0.20, 0.48), vec3(0.70, 0.52, 0.96), zone);
  return semantic + vec3(contours * 0.34);
}

void main() {
  float current = floor(uBand + 0.5);
  float next = mod(current + 1.0, 4.0);
  vec3 base = bandColor(current, vUv);
  vec3 preview = bandColor(next, vUv);
  float distanceToPointer = distance(gl_FragCoord.xy, uPointer);
  float lens = (1.0 - smoothstep(uLensRadius - 2.0, uLensRadius + 2.0, distanceToPointer)) * uLensOn;
  float rim = 1.0 - smoothstep(1.5, 4.5, abs(distanceToPointer - uLensRadius));
  vec3 color = mix(base, preview, lens);
  color += rim * vec3(0.58, 0.72, 1.0) * uLensOn;
  float vignette = smoothstep(0.92, 0.24, distance(vUv, vec2(0.5)));
  outColor = vec4(color * (0.72 + vignette * 0.34), 1.0);
}`;

function bandIndex(band: PassbandName) {
  return Math.max(0, BANDS.indexOf(band));
}

function createContactSheet(
  container: HTMLElement,
  options: PassbandLensOptions,
): PassbandLensInstance {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("A rendering context is unavailable.");
  const originalPosition = container.style.position;
  if (window.getComputedStyle(container).position === "static") container.style.position = "relative";
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none" });
  container.prepend(canvas);
  let currentBand = options.band ?? "optical";

  const draw = () => {
    const rect = container.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    const colors = ["#647487", "#ad1769", "#0f8c7c", "#7458bd"];
    for (let index = 0; index < BANDS.length; index += 1) {
      const left = (index % 2) * width * 0.5;
      const top = Math.floor(index / 2) * height * 0.5;
      context.save();
      context.beginPath();
      context.rect(left, top, width * 0.5, height * 0.5);
      context.clip();
      context.fillStyle = colors[index] ?? "#111722";
      context.fillRect(left, top, width * 0.5, height * 0.5);
      context.strokeStyle = "rgba(235, 242, 255, 0.46)";
      for (let lineIndex = 0; lineIndex < 12; lineIndex += 1) {
        context.beginPath();
        for (let x = left; x <= left + width * 0.5; x += 10) {
          const y = top + height * (0.08 + lineIndex * 0.035) + Math.sin(x * 0.028 + lineIndex * 0.6) * 10;
          if (x === left) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.stroke();
      }
      context.fillStyle = "rgba(255, 255, 255, 0.9)";
      context.font = '600 10px "SFMono-Regular", Consolas, monospace';
      context.fillText((BANDS[index] ?? "optical").toUpperCase(), left + 14, top + 22);
      context.restore();
    }
  };
  const observer = new ResizeObserver(draw);
  observer.observe(container);
  draw();

  return {
    start: draw,
    pause() {},
    resize: draw,
    getBand: () => currentBand,
    setBand(band) {
      currentBand = band;
      options.onBandChange?.(band);
      draw();
    },
    destroy() {
      observer.disconnect();
      canvas.remove();
      container.style.cursor = "";
      container.style.position = originalPosition;
    },
  };
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function createPassbandLens(
  container: HTMLElement,
  options: PassbandLensOptions = {},
): PassbandLensInstance {
  const policy = readMotionPolicy();
  if (policy.staticFallback) return createContactSheet(container, options);

  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: true });
  if (!gl) return createContactSheet(container, options);

  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vertex || !fragment) return createContactSheet(container, options);
  const program = gl.createProgram();
  if (!program) return createContactSheet(container, options);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return createContactSheet(container, options);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.useProgram(program);

  const uniforms = {
    resolution: gl.getUniformLocation(program, "uResolution"),
    pointer: gl.getUniformLocation(program, "uPointer"),
    band: gl.getUniformLocation(program, "uBand"),
    time: gl.getUniformLocation(program, "uTime"),
    lensOn: gl.getUniformLocation(program, "uLensOn"),
    lensRadius: gl.getUniformLocation(program, "uLensRadius"),
  };

  const originalPosition = container.style.position;
  const computedPosition = window.getComputedStyle(container).position;
  if (computedPosition === "static") container.style.position = "relative";
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none" });
  container.prepend(canvas);

  let width = 1;
  let height = 1;
  let ratio = 1;
  let requested = false;
  let visible = true;
  let destroyed = false;
  let frameId = 0;
  let cycleTimer = 0;
  let currentBand = options.band ?? "optical";
  let pointerX = 0;
  let pointerY = 0;
  let lensOn = 0;
  const startTime = performance.now();

  const resize = () => {
    const rect = container.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    ratio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(3_200_000 / (width * height)));
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (!pointerX && !pointerY) {
      pointerX = width * 0.62;
      pointerY = height * 0.52;
    }
  };

  const render = (now: number) => {
    frameId = 0;
    if (!requested || !visible || document.hidden || destroyed) return;
    gl.useProgram(program);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform2f(uniforms.pointer, pointerX * ratio, (height - pointerY) * ratio);
    gl.uniform1f(uniforms.band, bandIndex(currentBand));
    gl.uniform1f(uniforms.time, (now - startTime) / 1000);
    gl.uniform1f(uniforms.lensOn, lensOn);
    gl.uniform1f(uniforms.lensRadius, (options.lensRadius ?? 112) * ratio);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    frameId = requestAnimationFrame(render);
  };

  const schedule = () => {
    if (!frameId && requested && visible && !document.hidden && !destroyed) frameId = requestAnimationFrame(render);
  };
  const onPointerMove = (event: PointerEvent) => {
    const rect = container.getBoundingClientRect();
    pointerX = event.clientX - rect.left;
    pointerY = event.clientY - rect.top;
    lensOn = 1;
  };
  const onPointerEnter = (event: PointerEvent) => {
    onPointerMove(event);
    if (options.hideNativeCursor ?? true) container.style.cursor = "none";
  };
  const onPointerLeave = () => {
    lensOn = 0;
    container.style.cursor = "";
  };
  const onPointerUp = (event: PointerEvent) => {
    if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return;
    const nextIndex = (bandIndex(currentBand) + 1) % BANDS.length;
    currentBand = BANDS[nextIndex] ?? "optical";
    options.onBandChange?.(currentBand);
  };
  const advanceBand = () => {
    const nextIndex = (bandIndex(currentBand) + 1) % BANDS.length;
    currentBand = BANDS[nextIndex] ?? "optical";
    options.onBandChange?.(currentBand);
    schedule();
  };
  const stopAutoCycle = () => {
    if (cycleTimer) window.clearInterval(cycleTimer);
    cycleTimer = 0;
  };
  const startAutoCycle = () => {
    stopAutoCycle();
    if (options.autoCycleMs === false || options.autoCycleMs === undefined) return;
    cycleTimer = window.setInterval(
      advanceBand,
      Math.max(1_000, options.autoCycleMs),
    );
  };
  const onVisibility = () => {
    if (document.hidden && frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    } else schedule();
  };

  container.addEventListener("pointermove", onPointerMove, { passive: true });
  container.addEventListener("pointerenter", onPointerEnter, { passive: true });
  container.addEventListener("pointerleave", onPointerLeave, { passive: true });
  container.addEventListener("pointerup", onPointerUp, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    if (!visible && frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    } else schedule();
  }, { rootMargin: "180px 0px" });
  intersectionObserver.observe(container);
  resize();

  return {
    start() {
      requested = true;
      startAutoCycle();
      schedule();
    },
    pause() {
      requested = false;
      stopAutoCycle();
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
      container.style.cursor = "";
    },
    resize,
    getBand: () => currentBand,
    setBand(band) {
      currentBand = band;
      options.onBandChange?.(band);
      schedule();
    },
    destroy() {
      destroyed = true;
      requested = false;
      stopAutoCycle();
      if (frameId) cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerenter", onPointerEnter);
      container.removeEventListener("pointerleave", onPointerLeave);
      container.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("visibilitychange", onVisibility);
      container.style.cursor = "";
      if (computedPosition === "static") container.style.position = originalPosition;
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      canvas.remove();
    },
  };
}
