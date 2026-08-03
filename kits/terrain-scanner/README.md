# Terrain Scanner

Terrain Scanner moves across a complete neutral website surface and overlays contours, samples, and terrain intelligence without obscuring the page. It uses the same transparent radar mask, connected strokes, scan front, and 1.4-second decay as the first-party reference implementation.

## Standalone HTML

```html
<div id="terrain" style="position:relative;min-height:500px"></div>
<script type="module">
  import { createTerrainScanner } from "magic-mouse-movements/terrain-scanner"
  const terrain = createTerrainScanner(document.querySelector("#terrain"), {
    contourCount: 32,
    pointCount: 260,
    revealDuration: 1400,
    revealRadius: 138,
  })
  terrain.start()
  window.addEventListener("pagehide", () => terrain.destroy(), { once: true })
</script>
```

## React

```tsx
import { useCallback } from "react"
import { MovementStage } from "magic-mouse-movements/react"
import { createTerrainScanner } from "magic-mouse-movements/terrain-scanner"

export function TerrainExample() {
  const create = useCallback((element: HTMLElement) => createTerrainScanner(element), [])
  return <MovementStage createMovement={create} className="movement-stage" />
}
```

## Interaction tuning

- `revealRadius` controls the scanner footprint.
- `revealDuration` controls how long each revealed section remains open in milliseconds.
- `renderSurface` replaces the included website scene with your own Canvas 2D surface.
- `surfaceColor` controls the included website scene's background.
- `terrainColor` remains accepted for compatibility. The transparent reference palette is controlled by `accent`.
- `accent`, `contourCount`, and `pointCount` tune the radar data layer.

The trail uses three connected soft strokes, squared age decay, a radial head mask, and a brief directional scan front. It clears in 1.4 seconds and never paints an opaque background over the website. Reduced motion keeps the neutral website scene and native cursor without animating the scanner. The website and terrain are procedural and contain no third-party imagery.
