# Active Links

Active Links connects the pointer to nearby configurable nodes and animates signal pulses along active relationships.

## Standalone HTML

```html
<div id="links" style="position:relative;min-height:460px"></div>
<script type="module">
  import { createActiveLinks } from "magic-mouse-movements/active-links"
  const links = createActiveLinks(document.querySelector("#links"), {
    nodes: [{ x: .2, y: .3 }, { x: .5, y: .7 }, { x: .82, y: .28 }],
  })
  links.start()
  window.addEventListener("pagehide", () => links.destroy(), { once: true })
</script>
```

## React

```tsx
import { useCallback } from "react"
import { MovementStage } from "magic-mouse-movements/react"
import { createActiveLinks } from "magic-mouse-movements/active-links"

export function ActiveLinksExample() {
  const create = useCallback((element: HTMLElement) => createActiveLinks(element), [])
  return <MovementStage createMovement={create} className="movement-stage" />
}
```

The semantic relationship list remains the source of truth.
