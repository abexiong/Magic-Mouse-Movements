# Terrain Scanner

Terrain Scanner moves across a complete neutral website surface and reveals contours, samples, and terrain intelligence beneath it. Its continuous comet trail narrows and softens behind the pointer, then restores the website after three seconds.

## Standalone HTML

```html
<div id="terrain" style="position:relative;min-height:500px"></div>
<script type="module">
  import { createTerrainScanner } from "magic-mouse-movements/terrain-scanner"
  const terrain = createTerrainScanner(document.querySelector("#terrain"), {
    contourCount: 28,
    pointCount: 220,
    revealDuration: 3000,
    revealRadius: 96,
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
- `terrainColor` controls the revealed field beneath the cover.
- `accent`, `contourCount`, and `pointCount` tune the revealed data layer.

The reveal trail shrinks throughout its three-second lifetime instead of waiting before closing. Closely spaced samples form a continuous comet shape even during quick pointer movement. Reduced motion shows a static diagonal cutaway with the native cursor. The website and terrain are procedural and contain no third-party imagery.
