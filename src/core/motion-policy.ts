import type { MotionPolicy } from "./types.js";

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
  };
};

export function readMotionPolicy(options?: {
  renderOnCoarsePointer?: boolean;
  renderOnDataSaver?: boolean;
  renderOnReducedMotion?: boolean;
}): MotionPolicy {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const dataSaver = Boolean((navigator as NavigatorWithConnection).connection?.saveData);

  return {
    reducedMotion,
    coarsePointer,
    dataSaver,
    staticFallback:
      (reducedMotion && !options?.renderOnReducedMotion) ||
      (coarsePointer && !options?.renderOnCoarsePointer) ||
      (dataSaver && !options?.renderOnDataSaver),
  };
}
