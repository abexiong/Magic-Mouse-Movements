# Fusion Field

Fusion Field combines a comet pointer, two counter-rotating binary streams, a luminous core, velocity response, and optional decorative text movement.

## Standalone HTML

```html
<div id="fusion" style="position:relative;min-height:520px">
  <h2 data-fusion-scatter>Move through the field.</h2>
</div>
<script type="module">
  import { createFusionField } from "magic-mouse-movements/fusion-field"
  const fusion = createFusionField(document.querySelector("#fusion"), {
    scatterSelector: "[data-fusion-scatter]",
  })
  fusion.start()
  window.addEventListener("pagehide", () => fusion.destroy(), { once: true })
</script>
```

## React

```tsx
import { useCallback } from "react"
import { MovementStage } from "magic-mouse-movements/react"
import { createFusionField } from "magic-mouse-movements/fusion-field"

export function FusionExample() {
  const create = useCallback((element: HTMLElement) => createFusionField(element), [])
  return <MovementStage createMovement={create} className="movement-stage" />
}
```

Text remains readable and selectable. The temporary visual movement is decorative and is restored during cleanup.
