# Fusion Field

Fusion Field combines a visible cursor halo, a ringed comet trail, two counter-rotating binary streams, a luminous core, momentum-based digit knockback, and optional character-level text movement.

## Standalone HTML

```html
<div id="fusion" style="position:relative;min-height:520px">
  <h2 data-fusion-scatter>Move through the field.</h2>
</div>
<script type="module">
  import { createFusionField } from "magic-mouse-movements/fusion-field"
  const fusion = createFusionField(document.querySelector("#fusion"), {
    haloRadius: 118,
    scatterSelector: "[data-fusion-scatter]",
    trailLife: 0.62,
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
  const create = useCallback(
    (element: HTMLElement) => createFusionField(element, {
      scatterSelector: "[data-fusion-scatter]",
    }),
    [],
  )
  return (
    <MovementStage createMovement={create} className="movement-stage">
      <strong data-fusion-scatter>Move through the field.</strong>
    </MovementStage>
  )
}
```

## Interaction tuning

- `haloRadius` changes both the visible halo and the collision radius used to knock digits out of orbit.
- `trailLife` controls how long the ringed comet trail remains visible.
- `digitCount` adjusts the vortex population.
- `scatterSelector` identifies plain-text elements whose individual characters should react to cursor momentum.

The selected text receives an equivalent accessible label while its visual characters are split into physics bodies. Original markup, text, and accessibility attributes are restored during cleanup. Reduced motion keeps the native cursor, a still field, and unsplit text.
