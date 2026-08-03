export type Point = {
  x: number;
  y: number;
};

export type PointerSnapshot = Point & {
  active: boolean;
  pressed: boolean;
  pointerType: string;
  speed: number;
  velocityX: number;
  velocityY: number;
};

export type MotionPolicy = {
  coarsePointer: boolean;
  dataSaver: boolean;
  reducedMotion: boolean;
  staticFallback: boolean;
};

export type CanvasFrame = {
  context: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  pixelRatio: number;
  time: number;
  delta: number;
  pointer: PointerSnapshot;
  policy: MotionPolicy;
};

export type MovementInstance = {
  start: () => void;
  pause: () => void;
  resize: () => void;
  destroy: () => void;
};

export type CanvasMovementRenderer = {
  render: (frame: CanvasFrame) => void;
  resize?: (frame: CanvasFrame) => void;
  destroy?: () => void;
};

export type CanvasMovementOptions = {
  className?: string;
  hideNativeCursor?: boolean;
  maxPixelRatio?: number;
  pixelBudget?: number;
  renderOnCoarsePointer?: boolean;
  renderOnDataSaver?: boolean;
  renderOnReducedMotion?: boolean;
};

export type MovementManifest = {
  slug: string;
  name: string;
  summary: string;
  technology: "Canvas 2D" | "WebGL2";
  categories: readonly string[];
  capabilities: readonly string[];
  accessibility: string;
  sourcePath: string;
};
