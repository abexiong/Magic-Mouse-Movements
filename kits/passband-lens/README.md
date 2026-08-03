# Passband Lens

Passband Lens keeps one photoreal aerial terrain plate in its original optical view while the movable sensing lens rotates through optical, thermal, radar, and semantic instruments. The included demonstration plate shows a runway, telemetry buildings, large dishes, a river channel, and varied ground so the remote-sensing use case remains immediately legible.

## Standalone HTML

```html
<div id="passband" style="position:relative;min-height:520px"></div>
<script type="module">
  import {
    createPassbandLens,
    PASSBAND_DEMO_IMAGE,
  } from "magic-mouse-movements/passband-lens"

  const lens = createPassbandLens(document.querySelector("#passband"), {
    band: "optical",
    autoCycleMs: 3000,
    imageSrc: PASSBAND_DEMO_IMAGE,
  })
  lens.start()
  window.addEventListener("pagehide", () => lens.destroy(), { once: true })
</script>
```

## React

```tsx
import { useCallback } from "react"
import { MovementStage } from "magic-mouse-movements/react"
import {
  createPassbandLens,
  PASSBAND_DEMO_IMAGE,
} from "magic-mouse-movements/passband-lens"

export function PassbandExample() {
  const create = useCallback((element: HTMLElement) =>
    createPassbandLens(element, {
      band: "optical",
      autoCycleMs: 3000,
      imageSrc: PASSBAND_DEMO_IMAGE,
    }), [])
  return <MovementStage createMovement={create} className="movement-stage" />
}
```

Set `autoCycleMs` to `3000` for a smooth three-second scope rotation, or leave it unset and connect native controls to `setBand`. Supply your own image through `imageSrc`, or use the included plate while evaluating the kit. The optical photograph outside the scope remains unchanged while every scope band reprocesses the same registered pixels. Reduced motion, coarse pointers, data saver, and unavailable WebGL2 receive a static four-band contact sheet based on the same image.
