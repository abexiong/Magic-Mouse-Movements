# Passband Lens

Passband Lens renders one procedural terrain field through optical, thermal, radar, and semantic bands. Moving the pointer reveals the next band inside a sensing lens. Tapping the stage cycles bands.

## Standalone HTML

```html
<div id="passband" style="position:relative;min-height:520px"></div>
<script type="module">
  import { createPassbandLens } from "magic-mouse-movements/passband-lens"

  const lens = createPassbandLens(document.querySelector("#passband"), {
    band: "optical",
    lensRadius: 118,
  })
  lens.start()
  window.addEventListener("pagehide", () => lens.destroy(), { once: true })
</script>
```

## React

```tsx
import { useCallback } from "react"
import { MovementStage } from "magic-mouse-movements/react"
import { createPassbandLens } from "magic-mouse-movements/passband-lens"

export function PassbandExample() {
  const create = useCallback((element: HTMLElement) =>
    createPassbandLens(element, { band: "optical" }), [])
  return <MovementStage createMovement={create} className="movement-stage" />
}
```

Keep native band buttons next to the stage. Reduced motion, coarse pointers, data saver, and unavailable WebGL2 receive a static four-band contact sheet.
