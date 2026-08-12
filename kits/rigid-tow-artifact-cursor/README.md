# Rigid Tow Artifact Cursor

Rigid Tow Artifact Cursor lets the pointer tow a small Audi R8 through one fixed front-center chassis joint. The center of mass trails behind the connection, the nose rotates into the pull, and momentum lets the rear swing without sideways skating or snapping.

<video src="./demo/rigid-tow-artifact-cursor-replay.mp4" controls muted playsinline poster="./demo/rigid-tow-artifact-cursor-poster.jpg" title="Rigid Tow Artifact Cursor demonstration with a mouse towing an Audi R8 through circles, reversals, diagonals, and slow drags"></video>

[Download the authentic browser replay](./demo/rigid-tow-artifact-cursor-replay.mp4)

## Standalone HTML

Copy `demo/audi-r8-cursor.glb` to a public location before creating the movement.

```html
<div id="rigid-tow" style="position:relative;min-height:520px"></div>
<script type="module">
  import { createRigidTowArtifactCursor } from "magic-mouse-movements/rigid-tow-artifact-cursor"

  const cursor = createRigidTowArtifactCursor(
    document.querySelector("#rigid-tow"),
    { modelUrl: "/media/audi-r8-cursor.glb" },
  )
  cursor.start()
  window.addEventListener("pagehide", () => cursor.destroy(), { once: true })
</script>
```

## React

```tsx
import { useCallback } from "react"
import { MovementStage } from "magic-mouse-movements/react"
import { createRigidTowArtifactCursor } from "magic-mouse-movements/rigid-tow-artifact-cursor"

export function RigidTowExample() {
  const create = useCallback((element: HTMLElement) =>
    createRigidTowArtifactCursor(element, {
      modelUrl: "/media/audi-r8-cursor.glb",
    }), [])

  return <MovementStage createMovement={create} className="movement-stage" />
}
```

## Physics contract

- One attachment point stays locked to the front-center chassis at every angle.
- Spring force and torque act through that joint. The center is never translated directly toward the pointer.
- Force is decomposed into forward and lateral components in the car's local frame.
- Side and rear pulls rotate the nose before allowing meaningful translation.
- Linear and angular momentum are preserved, with tire-like lateral resistance and angular damping.
- Delta-time clamping, substeps, force caps, torque caps, speed caps, and angle normalization keep reversals and circles stable.
- Rendering stops after the body settles and smoke clears.

Append `?towDebug` or pass `{ debug: true }` to show the pointer target, fixed tow anchor, center of mass, forward axis, and lateral-force component.

## Accessibility and performance

The canvases are decorative, `aria-hidden`, and unable to receive pointer input. Controls retain the native cursor. Reduced-motion and data-saving visitors receive a static fallback without loading the Audi model. Coarse pointers remain supported without blocking scrolling or default touch behavior. Destroying the movement releases listeners, observers, animation frames, canvases, textures, geometries, materials, and the WebGL renderer.

## Audi R8 model credit

`Audi R8` by [Randomness](https://sketchfab.com/throwbackthursdaymodels), available on [Sketchfab](https://sketchfab.com/3d-models/audi-r8-0e5c6feed3ff489093e33e686dd8f796), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

The distributed derivative was modified through glTF-Transform optimization, Meshopt compression, WebP texture conversion, and quantization. Audi and the model creator do not endorse this project.
