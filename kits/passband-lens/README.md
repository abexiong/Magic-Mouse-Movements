# Passband Lens

Passband Lens renders one procedural terrain field through optical, thermal, radar, and semantic bands. Moving the pointer reveals the next band inside a sensing lens. Bands can rotate automatically or advance when the user taps the stage.

## Standalone HTML

```html
<div id="passband" style="position:relative;min-height:520px"></div>
<script type="module">
  import { createPassbandLens } from "magic-mouse-movements/passband-lens"

  const lens = createPassbandLens(document.querySelector("#passband"), {
    band: "optical",
    autoCycleMs: 3000,
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
    createPassbandLens(element, { band: "optical", autoCycleMs: 3000 }), [])
  return <MovementStage createMovement={create} className="movement-stage" />
}
```

Set `autoCycleMs` to `3000` for a smooth three-second rotation, or leave it unset and provide native band controls. Reduced motion, coarse pointers, data saver, and unavailable WebGL2 receive a static four-band contact sheet.
