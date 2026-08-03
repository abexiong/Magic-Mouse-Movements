import type { Point } from "./types.js";

export const TAU = Math.PI * 2;

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function mix(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function dot(
  context: CanvasRenderingContext2D,
  point: Point,
  radius: number,
  color: string,
) {
  context.beginPath();
  context.arc(point.x, point.y, radius, 0, TAU);
  context.fillStyle = color;
  context.fill();
}

export function line(
  context: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  color: string,
  width = 1,
) {
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.strokeStyle = color;
  context.lineWidth = width;
  context.stroke();
}

export function label(
  context: CanvasRenderingContext2D,
  point: Point,
  text: string,
  color = "rgba(238, 244, 255, 0.88)",
) {
  context.save();
  context.font = '600 9px "SFMono-Regular", Consolas, monospace';
  context.fillStyle = color;
  context.textBaseline = "middle";
  context.fillText(text, point.x + 18, point.y - 17);
  context.restore();
}

export function clear(context: CanvasRenderingContext2D, width: number, height: number) {
  context.clearRect(0, 0, width, height);
}

export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
