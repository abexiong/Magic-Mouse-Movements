import { readMotionPolicy } from "../../src/core/motion-policy.js";
import type { MovementInstance } from "../../src/core/types.js";

export type PassbandName = "optical" | "thermal" | "radar" | "semantic";

export type PassbandLensOptions = {
  autoCycleMs?: false | number;
  band?: PassbandName;
  hideNativeCursor?: boolean;
  imageSrc?: string;
  opticalZoom?: number;
  onBandChange?: (band: PassbandName) => void;
};

export type PassbandLensInstance = MovementInstance & {
  getBand: () => PassbandName;
  isAutoCycleEnabled: () => boolean;
  setAutoCycle: (enabled: boolean) => void;
  setBand: (band: PassbandName) => void;
};

export const PASSBAND_DEMO_IMAGE = new URL(
  "../../../kits/passband-lens/demo/passband-terrain-v2.jpg",
  import.meta.url,
).href;

const BANDS: readonly PassbandName[] = ["optical", "thermal", "radar", "semantic"];

export type PassbandModeController = {
  advanceBand: () => PassbandName;
  getBand: () => PassbandName;
  isAutoCycleEnabled: () => boolean;
  selectBand: (band: PassbandName) => PassbandName;
  setAutoCycle: (enabled: boolean) => void;
};

export function createPassbandModeController(
  initialBand: PassbandName = "optical",
  autoCycleEnabled = true,
): PassbandModeController {
  let currentBand = initialBand;
  let automatic = autoCycleEnabled;

  return {
    advanceBand() {
      if (!automatic) return currentBand;
      const nextIndex = (bandIndex(currentBand) + 1) % BANDS.length;
      currentBand = BANDS[nextIndex] ?? "optical";
      return currentBand;
    },
    getBand: () => currentBand,
    isAutoCycleEnabled: () => automatic,
    selectBand(band) {
      automatic = false;
      currentBand = band;
      return currentBand;
    },
    setAutoCycle(enabled) {
      automatic = enabled;
    },
  };
}

const VERTEX_SHADER = `#version 300 es
layout(location=0) in vec2 aPosition;
void main(){ gl_Position = vec4(aPosition, 0.0, 1.0); }`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uResolution;
uniform vec2 uTextureResolution;
uniform float uBand;
uniform float uTime;
uniform vec3 uLens;
uniform float uLensOn;
uniform float uOpticalZoom;
out vec4 outColor;

const vec3 ACC_OPTICAL = vec3(0.85, 0.92, 0.95);
const vec3 ACC_THERMAL = vec3(1.00, 0.72, 0.28);
const vec3 ACC_RADAR = vec3(0.50, 1.00, 0.65);
const vec3 ACC_SEMANTIC = vec3(0.74, 0.63, 0.98);

vec2 coverUv(vec2 fragmentPixel) {
  float scale = max(
    uResolution.x / uTextureResolution.x,
    uResolution.y / uTextureResolution.y
  );
  vec2 displaySize = uTextureResolution * scale;
  vec2 offset = (uResolution - displaySize) * 0.5;
  return (fragmentPixel - offset) / displaySize;
}

float luminance(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

float hash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 ironbow(float value) {
  value = clamp(value, 0.0, 1.0);
  vec3 color = mix(
    vec3(0.01, 0.00, 0.09),
    vec3(0.33, 0.05, 0.45),
    smoothstep(0.00, 0.30, value)
  );
  color = mix(color, vec3(0.80, 0.23, 0.10), smoothstep(0.30, 0.55, value));
  color = mix(color, vec3(0.98, 0.65, 0.13), smoothstep(0.55, 0.80, value));
  color = mix(color, vec3(1.00, 0.97, 0.80), smoothstep(0.80, 1.00, value));
  return color;
}

float sobel(vec2 uv) {
  vec2 texel = 1.5 / uTextureResolution;
  float topLeft = luminance(texture(uTex, uv + vec2(-texel.x, -texel.y)).rgb);
  float topCenter = luminance(texture(uTex, uv + vec2(0.0, -texel.y)).rgb);
  float topRight = luminance(texture(uTex, uv + vec2(texel.x, -texel.y)).rgb);
  float middleLeft = luminance(texture(uTex, uv + vec2(-texel.x, 0.0)).rgb);
  float middleRight = luminance(texture(uTex, uv + vec2(texel.x, 0.0)).rgb);
  float bottomLeft = luminance(texture(uTex, uv + vec2(-texel.x, texel.y)).rgb);
  float bottomCenter = luminance(texture(uTex, uv + vec2(0.0, texel.y)).rgb);
  float bottomRight = luminance(texture(uTex, uv + vec2(texel.x, texel.y)).rgb);
  float gradientX = (topRight + 2.0 * middleRight + bottomRight)
    - (topLeft + 2.0 * middleLeft + bottomLeft);
  float gradientY = (bottomLeft + 2.0 * bottomCenter + bottomRight)
    - (topLeft + 2.0 * topCenter + topRight);
  return clamp(length(vec2(gradientX, gradientY)) * 1.6, 0.0, 1.0);
}

vec3 opticalLook(vec2 uv, vec2 fragmentPixel, vec3 base) {
  vec3 color = mix(vec3(luminance(base)), base, 1.34);
  color = (color - 0.5) * 1.24 + 0.5;
  color = mix(color, vec3(0.64, 0.86, 1.00), 0.16);
  float edge = sobel(uv);
  float scanline = 0.5 + 0.5 * sin(fragmentPixel.y * 0.34 + uTime * 4.0);
  return color + ACC_OPTICAL * (edge * 0.16 + scanline * 0.022);
}

vec3 thermalLook(vec2 uv, vec3 base) {
  float heat = pow(luminance(base), 1.15);
  heat += (hash(uv * uTextureResolution * 0.5 + floor(uTime * 8.0) * 7.0) - 0.5) * 0.02;
  return ironbow(heat);
}

vec3 radarLook(vec2 uv, vec2 fragmentPixel) {
  float edge = sobel(uv);
  float speckle = hash(floor(fragmentPixel * 0.5) + floor(uTime * 3.0));
  vec3 color = vec3(0.012, 0.03, 0.02);
  color += ACC_RADAR * edge * 1.45;
  color += ACC_RADAR * speckle * 0.05;
  float sweepX = fract(uTime * 0.10) * uResolution.x;
  float distanceFromSweep = fragmentPixel.x - sweepX;
  float front = exp(-abs(distanceFromSweep) / 26.0) * 0.45;
  float trail = distanceFromSweep < 0.0 ? exp(distanceFromSweep / 260.0) * 0.14 : 0.0;
  color += ACC_RADAR * (front + trail) * (0.3 + edge);
  return color;
}

vec3 semanticLook(vec2 uv, vec2 fragmentPixel, vec3 base) {
  vec2 texel = 3.0 / uTextureResolution;
  float light = luminance(base);
  light += luminance(texture(uTex, uv + vec2(texel.x, 0.0)).rgb);
  light += luminance(texture(uTex, uv + vec2(0.0, texel.y)).rgb);
  light /= 3.0;
  float steps = 5.0;
  float zoneValue = floor(light * steps) / steps;
  float zoneX = floor(luminance(texture(uTex, uv + vec2(texel.x * 1.4, 0.0)).rgb) * steps) / steps;
  float zoneY = floor(luminance(texture(uTex, uv + vec2(0.0, texel.y * 1.4)).rgb) * steps) / steps;
  float boundary = step(0.001, abs(zoneValue - zoneX) + abs(zoneValue - zoneY));
  vec3 zone = mix(vec3(0.07, 0.06, 0.11), vec3(0.36, 0.31, 0.55), zoneValue);
  float hatch = step(0.75, fract((fragmentPixel.x + fragmentPixel.y) / 9.0))
    * step(abs(zoneValue - 0.6), 0.11);
  return mix(zone + hatch * 0.05, ACC_SEMANTIC, boundary * 0.85);
}

vec3 bandLook(float band, vec2 uv, vec2 fragmentPixel, vec3 base) {
  if (band < 0.5) return opticalLook(uv, fragmentPixel, base);
  if (band < 1.5) return thermalLook(uv, base);
  if (band < 2.5) return radarLook(uv, fragmentPixel);
  return semanticLook(uv, fragmentPixel, base);
}

void main() {
  vec2 fragmentPixel = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec2 uv = clamp(coverUv(fragmentPixel), 0.001, 0.999);
  vec3 base = texture(uTex, uv).rgb;
  float scopeIndex = mod(floor(uBand + 0.5), 4.0);
  vec2 scopeUv = uv;
  vec3 scopeBase = base;
  if (scopeIndex < 0.5) {
    vec2 magnifiedPixel = uLens.xy
      + (fragmentPixel - uLens.xy) / max(1.0, uOpticalZoom);
    scopeUv = clamp(coverUv(magnifiedPixel), 0.001, 0.999);
    scopeBase = texture(uTex, scopeUv).rgb;
  }
  vec3 scopeColor = bandLook(scopeIndex, scopeUv, fragmentPixel, scopeBase);
  vec3 color = base;

  if (uLensOn > 0.001) {
    float ringBand = scopeIndex;
    float distanceToPointer = distance(fragmentPixel, uLens.xy);
    float radius = uLens.z;
    if (distanceToPointer < radius + 3.0) {
      float inside = 1.0 - smoothstep(radius - 1.5, radius + 0.5, distanceToPointer);
      color = mix(color, scopeColor, inside * uLensOn);
      vec3 ringAccent = ringBand < 0.5
        ? ACC_OPTICAL
        : ringBand < 1.5
          ? ACC_THERMAL
          : ringBand < 2.5
            ? ACC_RADAR
            : ACC_SEMANTIC;
      float ring = 1.0 - smoothstep(0.8, 2.4, abs(distanceToPointer - radius));
      color = mix(color, ringAccent, ring * uLensOn * 0.9);
    }
  }

  vec2 vignettePoint = fragmentPixel / uResolution - 0.5;
  color *= 1.0 - dot(vignettePoint, vignettePoint) * 0.5;
  outColor = vec4(color, 1.0);
}`;

function bandIndex(band: PassbandName) {
  return Math.max(0, BANDS.indexOf(band));
}

function usesNativeCursor(target: EventTarget | null) {
  return target instanceof Element
    ? Boolean(target.closest([
        "a",
        "button",
        "input",
        "textarea",
        "select",
        "label",
        "summary",
        "[role='button']",
        "[role='link']",
        "[contenteditable='true']",
        "[data-cursor-native]",
        "p",
        "blockquote",
        "code",
        "pre",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
      ].join(",")))
    : false;
}

function damp(current: number, target: number, lambda: number, deltaSeconds: number) {
  return target + (current - target) * Math.exp(-lambda * deltaSeconds);
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.alt = "";
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Passband Lens could not load ${source}.`));
    image.src = source;
  });
}

function drawCoveredImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawnWidth = image.naturalWidth * scale;
  const drawnHeight = image.naturalHeight * scale;
  context.drawImage(
    image,
    x + (width - drawnWidth) * 0.5,
    y + (height - drawnHeight) * 0.5,
    drawnWidth,
    drawnHeight,
  );
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
  Object.assign(canvas.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
  });
  container.prepend(canvas);
  const mode = createPassbandModeController(
    options.band ?? "optical",
    options.autoCycleMs !== false,
  );
  let image: HTMLImageElement | null = null;
  let destroyed = false;

  const draw = () => {
    const rect = container.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#071019";
    context.fillRect(0, 0, width, height);
    if (!image) return;
    const filters = [
      "saturate(1.06) contrast(1.07)",
      "grayscale(1) sepia(1) saturate(5) hue-rotate(292deg) contrast(1.15)",
      "grayscale(1) contrast(2.2) invert(1) sepia(1) saturate(4) hue-rotate(88deg)",
      "grayscale(0.8) contrast(1.7) sepia(1) saturate(2.8) hue-rotate(218deg)",
    ];
    for (let index = 0; index < BANDS.length; index += 1) {
      const left = (index % 2) * width * 0.5;
      const top = Math.floor(index / 2) * height * 0.5;
      context.save();
      context.beginPath();
      context.rect(left, top, width * 0.5, height * 0.5);
      context.clip();
      context.filter = filters[index] ?? "none";
      drawCoveredImage(context, image, left, top, width * 0.5, height * 0.5);
      context.filter = "none";
      context.fillStyle = "rgba(3, 10, 18, 0.48)";
      context.fillRect(left, top, 150, 32);
      context.fillStyle = "rgba(255, 255, 255, 0.92)";
      context.font = '600 10px "SFMono-Regular", Consolas, monospace';
      context.fillText((BANDS[index] ?? "optical").toUpperCase(), left + 14, top + 21);
      context.restore();
    }
  };

  void loadImage(options.imageSrc ?? PASSBAND_DEMO_IMAGE)
    .then((loaded) => {
      if (destroyed) return;
      image = loaded;
      draw();
    })
    .catch(() => draw());
  const observer = new ResizeObserver(draw);
  observer.observe(container);
  draw();

  return {
    start: draw,
    pause() {},
    resize: draw,
    getBand: mode.getBand,
    isAutoCycleEnabled: mode.isAutoCycleEnabled,
    setAutoCycle(enabled) {
      mode.setAutoCycle(enabled && options.autoCycleMs !== false);
    },
    setBand(band) {
      mode.selectBand(band);
      options.onBandChange?.(band);
    },
    destroy() {
      destroyed = true;
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
    console.error("Passband Lens shader:", gl.getShaderInfoLog(shader));
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
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    powerPreference: "high-performance",
  });
  if (!gl) return createContactSheet(container, options);

  const configuredAutoCycleMs = options.autoCycleMs === false
    ? false
    : (options.autoCycleMs ?? 3_000);

  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vertex || !fragment) return createContactSheet(container, options);
  const program = gl.createProgram();
  if (!program) return createContactSheet(container, options);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Passband Lens link:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return createContactSheet(container, options);
  }

  const vertexArray = gl.createVertexArray();
  const buffer = gl.createBuffer();
  gl.bindVertexArray(vertexArray);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.useProgram(program);

  const uniforms = {
    texture: gl.getUniformLocation(program, "uTex"),
    resolution: gl.getUniformLocation(program, "uResolution"),
    textureResolution: gl.getUniformLocation(program, "uTextureResolution"),
    band: gl.getUniformLocation(program, "uBand"),
    time: gl.getUniformLocation(program, "uTime"),
    lens: gl.getUniformLocation(program, "uLens"),
    lensOn: gl.getUniformLocation(program, "uLensOn"),
    opticalZoom: gl.getUniformLocation(program, "uOpticalZoom"),
  };

  const originalPosition = container.style.position;
  const computedPosition = window.getComputedStyle(container).position;
  if (computedPosition === "static") container.style.position = "relative";
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
  });
  container.prepend(canvas);

  let width = 1;
  let height = 1;
  let ratio = 1;
  let requested = false;
  let visible = true;
  let destroyed = false;
  let ready = false;
  let frameId = 0;
  let cycleTimer = 0;
  const mode = createPassbandModeController(
    options.band ?? "optical",
    configuredAutoCycleMs !== false,
  );
  let band = bandIndex(mode.getBand());
  let pointerX = 0;
  let pointerY = 0;
  let pointerTargetX = 0;
  let pointerTargetY = 0;
  let lensOn = 0;
  let lensTarget = 0;
  let previousTime = performance.now();
  let elapsed = 0;
  let texture: WebGLTexture | null = null;
  let fallback: PassbandLensInstance | null = null;
  let replacement: PassbandLensInstance | null = null;
  let retired = false;
  let resizeObserver: ResizeObserver | null = null;
  let intersectionObserver: IntersectionObserver | null = null;

  const resize = () => {
    if (replacement) {
      replacement.resize();
      return;
    }
    const rect = container.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (!pointerTargetX && !pointerTargetY) {
      pointerX = width * 0.62;
      pointerY = height * 0.52;
      pointerTargetX = pointerX;
      pointerTargetY = pointerY;
    }
    fallback?.resize();
  };

  const render = (now: number) => {
    frameId = 0;
    if (!requested || !visible || document.hidden || destroyed || retired || !ready) return;
    const deltaSeconds = Math.min(0.05, Math.max(0.001, (now - previousTime) / 1000));
    previousTime = now;
    elapsed += deltaSeconds;
    pointerX = damp(pointerX, pointerTargetX, 14, deltaSeconds);
    pointerY = damp(pointerY, pointerTargetY, 14, deltaSeconds);
    lensOn = damp(lensOn, lensTarget, 8, deltaSeconds);
    gl.useProgram(program);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.band, band);
    gl.uniform1f(uniforms.time, elapsed);
    gl.uniform3f(
      uniforms.lens,
      pointerX * ratio,
      pointerY * ratio,
      Math.min(canvas.width, canvas.height) * 0.16,
    );
    gl.uniform1f(uniforms.lensOn, lensOn);
    gl.uniform1f(
      uniforms.opticalZoom,
      Math.min(4, Math.max(1, options.opticalZoom ?? 2.76)),
    );
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    frameId = requestAnimationFrame(render);
  };

  const schedule = () => {
    if (!frameId && requested && visible && !document.hidden && !destroyed && !retired && ready) {
      previousTime = performance.now();
      frameId = requestAnimationFrame(render);
    }
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (fallback || replacement || usesNativeCursor(event.target)) {
      lensTarget = 0;
      container.style.cursor = "";
      return;
    }
    const rect = container.getBoundingClientRect();
    pointerTargetX = event.clientX - rect.left;
    pointerTargetY = event.clientY - rect.top;
    lensTarget = 1;
    if (options.hideNativeCursor ?? true) container.style.cursor = "none";
  };
  const onPointerEnter = (event: PointerEvent) => {
    onPointerMove(event);
  };
  const onPointerLeave = () => {
    lensTarget = 0;
    container.style.cursor = "";
  };
  const activateFallback = () => {
    if (destroyed || fallback) return;
    ready = false;
    stopAutoCycle();
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    lensTarget = 0;
    container.style.cursor = "";
    canvas.style.display = "none";
    const { onBandChange: _onBandChange, ...fallbackOptions } = options;
    fallback = createContactSheet(container, {
      ...fallbackOptions,
      autoCycleMs: configuredAutoCycleMs,
      band: mode.getBand(),
      imageSrc: PASSBAND_DEMO_IMAGE,
    });
    fallback.setAutoCycle(mode.isAutoCycleEnabled());
    if (requested) fallback.start();
  };
  const applyBand = (nextBand: PassbandName) => {
    if (replacement) {
      replacement.setBand(nextBand);
      return;
    }
    band = bandIndex(nextBand);
    options.onBandChange?.(nextBand);
    fallback?.setBand(nextBand);
    schedule();
  };
  const advanceBand = () => {
    applyBand(mode.advanceBand());
  };
  const stopAutoCycle = () => {
    if (cycleTimer) window.clearTimeout(cycleTimer);
    cycleTimer = 0;
  };
  const startAutoCycle = () => {
    stopAutoCycle();
    if (
      configuredAutoCycleMs === false
      || !mode.isAutoCycleEnabled()
      || !requested
      || !ready
      || !visible
      || document.hidden
      || destroyed
      || retired
    ) return;
    cycleTimer = window.setTimeout(() => {
      cycleTimer = 0;
      advanceBand();
      startAutoCycle();
    }, Math.max(1_000, configuredAutoCycleMs));
  };
  const onVisibility = () => {
    if (document.hidden) {
      stopAutoCycle();
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
    } else {
      startAutoCycle();
      schedule();
    }
  };
  const onContextLost = (event: Event) => {
    event.preventDefault();
    activateFallback();
  };
  const onContextRestored = () => {
    if (destroyed || replacement) return;
    retired = true;
    ready = false;
    stopAutoCycle();
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    fallback?.destroy();
    fallback = null;
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    container.removeEventListener("pointermove", onPointerMove);
    container.removeEventListener("pointerenter", onPointerEnter);
    container.removeEventListener("pointerleave", onPointerLeave);
    document.removeEventListener("visibilitychange", onVisibility);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    canvas.removeEventListener("webglcontextrestored", onContextRestored);
    canvas.remove();
    container.style.cursor = "";
    replacement = createPassbandLens(container, {
      ...options,
      autoCycleMs: configuredAutoCycleMs,
      band: mode.getBand(),
    });
    replacement.setAutoCycle(mode.isAutoCycleEnabled());
    if (requested) replacement.start();
  };

  container.addEventListener("pointermove", onPointerMove, { passive: true });
  container.addEventListener("pointerenter", onPointerEnter, { passive: true });
  container.addEventListener("pointerleave", onPointerLeave, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    if (!visible) {
      stopAutoCycle();
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
    } else {
      startAutoCycle();
      schedule();
    }
  }, { rootMargin: "180px 0px" });
  intersectionObserver.observe(container);
  resize();

  void loadImage(options.imageSrc ?? PASSBAND_DEMO_IMAGE)
    .then((image) => {
      if (destroyed || retired || fallback || replacement) return;
      try {
        texture = gl.createTexture();
        if (!texture) throw new Error("Passband Lens could not create its terrain texture.");
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.uniform1i(uniforms.texture, 0);
        gl.uniform2f(uniforms.textureResolution, image.naturalWidth, image.naturalHeight);
        ready = true;
        startAutoCycle();
        schedule();
      } catch (error: unknown) {
        console.error(error);
        activateFallback();
      }
    })
    .catch((error: unknown) => {
      console.error(error);
      activateFallback();
    });

  return {
    start() {
      requested = true;
      if (replacement) {
        replacement.start();
      } else {
        if (fallback) fallback.start();
        else {
          startAutoCycle();
          schedule();
        }
      }
    },
    pause() {
      requested = false;
      stopAutoCycle();
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
      if (replacement) replacement.pause();
      else fallback?.pause();
      container.style.cursor = "";
    },
    resize,
    getBand: () => replacement?.getBand() ?? mode.getBand(),
    isAutoCycleEnabled: () => replacement?.isAutoCycleEnabled() ?? mode.isAutoCycleEnabled(),
    setAutoCycle(enabled) {
      mode.setAutoCycle(enabled && configuredAutoCycleMs !== false);
      if (replacement) {
        replacement.setAutoCycle(mode.isAutoCycleEnabled());
      } else if (mode.isAutoCycleEnabled()) {
        startAutoCycle();
      } else {
        stopAutoCycle();
      }
    },
    setBand(nextBand) {
      mode.selectBand(nextBand);
      stopAutoCycle();
      applyBand(nextBand);
    },
    destroy() {
      destroyed = true;
      requested = false;
      stopAutoCycle();
      if (frameId) cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerenter", onPointerEnter);
      container.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      fallback?.destroy();
      fallback = null;
      replacement?.destroy();
      replacement = null;
      container.style.cursor = "";
      if (computedPosition === "static") container.style.position = originalPosition;
      if (texture) gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vertexArray);
      gl.deleteProgram(program);
      canvas.remove();
    },
  };
}
