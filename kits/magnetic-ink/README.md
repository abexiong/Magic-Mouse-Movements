# Magnetic Ink

Magnetic Ink attracts particles, writes while the pointer is pressed, and scatters captured particles after a quick reversal.

## Standalone HTML

```html
<div id="ink" style="position:relative;min-height:520px"></div>
<script type="module">
  import { createMagneticInk } from "magic-mouse-movements/magnetic-ink"
  const ink = createMagneticInk(document.querySelector("#ink"), {
    particleCount: 220,
    attractionRadius: 180,
  })
  ink.start()
  window.addEventListener("pagehide", () => ink.destroy(), { once: true })
</script>
```

## React

```tsx
import { useCallback } from "react"
import { MovementStage } from "magic-mouse-movements/react"
import { createMagneticInk } from "magic-mouse-movements/magnetic-ink"

export function InkExample() {
  const create = useCallback((element: HTMLElement) => createMagneticInk(element), [])
  return <MovementStage createMovement={create} className="movement-stage" />
}
```

Touch can press and draw. Reduced motion receives a still particle field with the native cursor.
