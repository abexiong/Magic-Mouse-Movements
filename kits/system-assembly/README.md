# System Assembly

System Assembly builds configurable technical segments around the pointer and highlights a domain according to pointer position.

## Standalone HTML

```html
<div id="assembly" style="position:relative;min-height:460px"></div>
<script type="module">
  import { createSystemAssembly } from "magic-mouse-movements/system-assembly"
  const assembly = createSystemAssembly(document.querySelector("#assembly"), {
    domains: ["INPUT", "MODEL", "MOTION", "ACCESS", "OUTPUT"],
  })
  assembly.start()
window.addEventListener("pagehide", () => assembly.destroy(), { once: true })
</script>
```

Use `targetSelector` to register live capability elements and `activeIndex` to connect selection to scroll, hover, or application state. Coordinate nodes and pointer-driven selection remain available for self-contained demonstrations.

## React

```tsx
import { useCallback } from "react"
import { MovementStage } from "magic-mouse-movements/react"
import { createSystemAssembly } from "magic-mouse-movements/system-assembly"

export function AssemblyExample() {
  const create = useCallback((element: HTMLElement) => createSystemAssembly(element), [])
  return <MovementStage createMovement={create} className="movement-stage" />
}
```

Domain content must remain readable without the effect.
