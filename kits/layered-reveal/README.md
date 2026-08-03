# Layered Reveal

Layered Reveal uses a moving brush to erase the original Something Old website surface and uncover Abraham Xiong's looping Something New film. Supply the included film, custom render functions, or the complete procedural defaults.

<video src="./demo/layered-reveal-replay.mp4" controls muted playsinline title="Layered Reveal demonstration showing Something Old erased to uncover Something New"></video>

[Download the Layered Reveal demonstration video](./demo/layered-reveal-replay.mp4)

[Download the Something New loop](./demo/something-new-loop.mp4) · [Download its poster](./demo/something-new-poster.jpg)

## Standalone HTML

```html
<div id="reveal" style="position:relative;min-height:500px"></div>
<script type="module">
  import { createLayeredReveal } from "magic-mouse-movements/layered-reveal"
  const reveal = createLayeredReveal(document.querySelector("#reveal"), {
    brushRadius: 84,
    revealDuration: 4000,
    videoPoster: "./demo/something-new-poster.jpg",
    videoSrc: "./demo/something-new-loop.mp4",
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
  const create = useCallback((element: HTMLElement) => createLayeredReveal(element, {
    videoPoster: "/media/something-new-poster.jpg",
    videoSrc: "/media/something-new-loop.mp4",
  }), [])
  return <MovementStage createMovement={create} className="movement-stage" />
}
```

Describe both visual layers in nearby semantic content when they communicate meaning.

## What the kit includes

- The self-restoring brush mask and cursor ring
- The original generic Something Old website renderer
- Abraham Xiong's original Something New loop and poster
- A procedural Something New fallback renderer
- `renderTop` and `renderBottom` hooks for image, canvas, or video-backed scenes
- The original 30-second demonstration replay created and contributed by Abraham Xiong

The demonstration video is included for reuse with this kit under the repository license. The procedural defaults remain the live, editable source of truth.

Set `revealDuration` in milliseconds to control how quickly Something Old returns after the pointer passes. Set `videoSrc` and `videoPoster` after copying the included files to your site's public media directory.
