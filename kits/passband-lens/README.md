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

Automatic rotation is enabled by default at a consistent three-second interval. Set `autoCycleMs` to another duration to change the interval, or set it to `false` to begin in manual mode. The first interval begins only after the image and WebGL texture are ready, and the timer pauses while the instrument is hidden. Each mode switches discretely without blending through the photograph. Calling `setBand()` selects a manual band and stops automatic rotation. Call `setAutoCycle(true)` to resume the configured automatic interval from the current band. Optical magnifies the registered image inside the scope by `1.38` by default; adjust that behavior with `opticalZoom`. Supply your own image through `imageSrc`, or use the included plate while evaluating the kit. The photograph outside the scope remains unchanged while the calibrated optical, thermal, radar, and semantic modes reprocess the same registered pixels. Reduced motion, coarse pointers, data saver, and unavailable WebGL2 receive a static four-band contact sheet based on the same image.
