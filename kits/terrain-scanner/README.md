# Terrain Scanner

Terrain Scanner reveals newly generated contours and point samples through a pointer-driven scan mask and directional front.

## Standalone HTML

```html
<div id="terrain" style="position:relative;min-height:500px"></div>
<script type="module">
  import { createTerrainScanner } from "magic-mouse-movements/terrain-scanner"
  const terrain = createTerrainScanner(document.querySelector("#terrain"), {
    contourCount: 28,
    pointCount: 220,
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

The terrain is procedural and contains no third-party imagery.
