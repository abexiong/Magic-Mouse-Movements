# Orbit Trail

Orbit Trail turns horizontal journey progress into an expanding orbital pointer instrument with a short-lived trail.

## Standalone HTML

```html
<div id="orbit" style="position:relative;min-height:460px"></div>
<script type="module">
  import { createOrbitTrail } from "magic-mouse-movements/orbit-trail"
  const orbit = createOrbitTrail(document.querySelector("#orbit"), {
    chapters: ["DISCOVER", "DESIGN", "BUILD", "TEST", "SHIP"],
  })
  orbit.start()
window.addEventListener("pagehide", () => orbit.destroy(), { once: true })
</script>
```

Use `nodeSelector` to register live DOM landmarks and `stageIndex` to connect the five measurement states to scroll or application state. Coordinate nodes and pointer-driven staging remain available for self-contained demonstrations.

## React

```tsx
import { useCallback } from "react"
import { MovementStage } from "magic-mouse-movements/react"
import { createOrbitTrail } from "magic-mouse-movements/orbit-trail"

export function OrbitExample() {
  const create = useCallback((element: HTMLElement) => createOrbitTrail(element), [])
  return <MovementStage createMovement={create} className="movement-stage" />
}
```

Chapter meaning must remain in semantic HTML. The canvas is decorative.
