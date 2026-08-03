"use client";

import { useEffect, useRef, type HTMLAttributes } from "react";
import type { MovementInstance } from "../core/types.js";

export type MovementStageProps = HTMLAttributes<HTMLDivElement> & {
  createMovement: (container: HTMLElement) => MovementInstance;
  paused?: boolean;
};

export function MovementStage({ createMovement, paused = false, ...props }: MovementStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const movement = createMovement(container);
    if (paused) movement.pause();
    else movement.start();
    return () => movement.destroy();
  }, [createMovement, paused]);

  return <div {...props} ref={containerRef} />;
}
