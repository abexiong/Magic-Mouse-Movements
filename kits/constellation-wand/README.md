# Constellation Wand

Constellation Wand bends a configurable 16-node graph, highlights nearby paths, selects destinations, and can generate an accessible list companion. The expanded default mesh uses large canvases while custom nodes and edges remain fully supported.

## Standalone HTML

```html
<div id="constellation" style="position:relative;min-height:520px"></div>
<div id="destinations"></div>
<script type="module">
  import { createConstellationWand } from "magic-mouse-movements/constellation-wand"
  const constellation = createConstellationWand(document.querySelector("#constellation"), {
    listContainer: document.querySelector("#destinations"),
    onSelect: (node) => console.log(node.id),
  })
  constellation.start()
  window.addEventListener("pagehide", () => constellation.destroy(), { once: true })
</script>
```

## React

```tsx
import { useCallback } from "react"
import { MovementStage } from "magic-mouse-movements/react"
import { createConstellationWand } from "magic-mouse-movements/constellation-wand"

export function ConstellationExample() {
  const create = useCallback((element: HTMLElement) => createConstellationWand(element), [])
  return <MovementStage createMovement={create} className="movement-stage" />
}
```

The accessible list is the canonical navigation surface. The constellation is an enhancement.
