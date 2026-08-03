# Layered Reveal

Layered Reveal uses a moving brush to show a second visual system beneath the first. Supply custom render functions or use the neutral procedural defaults.

## Standalone HTML

```html
<div id="reveal" style="position:relative;min-height:500px"></div>
<script type="module">
  import { createLayeredReveal } from "magic-mouse-movements/layered-reveal"
  const reveal = createLayeredReveal(document.querySelector("#reveal"), {
    brushRadius: 84,
  })
  reveal.start()
  window.addEventListener("pagehide", () => reveal.destroy(), { once: true })
</script>
```

## React

```tsx
import { useCallback } from "react"
import { MovementStage } from "magic-mouse-movements/react"
import { createLayeredReveal } from "magic-mouse-movements/layered-reveal"

export function RevealExample() {
  const create = useCallback((element: HTMLElement) => createLayeredReveal(element), [])
  return <MovementStage createMovement={create} className="movement-stage" />
}
```

Describe both visual layers in nearby semantic content when they communicate meaning.
