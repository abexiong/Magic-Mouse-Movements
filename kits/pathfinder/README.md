# Pathfinder

Pathfinder draws a new orthogonal route toward the nearest configured target or element matching a selector.

## Standalone HTML

```html
<div id="path" style="position:relative;min-height:460px">
  <button data-path-target data-pathfinder-label="ACTION / OPEN">Open evidence</button>
</div>
<script type="module">
  import { createPathfinder } from "magic-mouse-movements/pathfinder"
  const path = createPathfinder(document.querySelector("#path"), {
    targetSelector: "[data-path-target]",
  })
  path.start()
  window.addEventListener("pagehide", () => path.destroy(), { once: true })
</script>
```

## React

```tsx
import { useCallback } from "react"
import { MovementStage } from "magic-mouse-movements/react"
import { createPathfinder } from "magic-mouse-movements/pathfinder"

export function PathfinderExample() {
  const create = useCallback((element: HTMLElement) =>
    createPathfinder(element, { targetSelector: "[data-path-target]" }), [])
  return <MovementStage createMovement={create} className="movement-stage" />
}
```

Targets retain native focus, activation, and visible focus styles.
