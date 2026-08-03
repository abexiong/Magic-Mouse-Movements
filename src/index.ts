export { movementCatalog, getMovement } from "./catalog.js";
export { createCanvasMovement } from "./core/canvas-movement.js";
export { readMotionPolicy } from "./core/motion-policy.js";
export type {
  CanvasFrame,
  CanvasMovementOptions,
  CanvasMovementRenderer,
  MotionPolicy,
  MovementInstance,
  MovementManifest,
  Point,
  PointerSnapshot,
} from "./core/types.js";

export { createPassbandLens } from "../kits/passband-lens/index.js";
export { createOrbitTrail } from "../kits/orbit-trail/index.js";
export { createSystemAssembly } from "../kits/system-assembly/index.js";
export { createActiveLinks } from "../kits/active-links/index.js";
export { createPathfinder } from "../kits/pathfinder/index.js";
export { createTerrainScanner } from "../kits/terrain-scanner/index.js";
export { createLayeredReveal } from "../kits/layered-reveal/index.js";
export { createMagneticInk } from "../kits/magnetic-ink/index.js";
export { createConstellationWand } from "../kits/constellation-wand/index.js";
export { createFusionField } from "../kits/fusion-field/index.js";
