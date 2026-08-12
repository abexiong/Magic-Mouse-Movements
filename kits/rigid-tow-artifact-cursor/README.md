# Rigid Tow Artifact Cursor

Rigid Tow Artifact Cursor lets the pointer tow a small Audi R8 through one fixed front-center chassis joint. The center of mass trails behind the connection, the nose rotates into the pull, and momentum lets the rear swing without sideways skating or snapping.

The sample now opens with a deterministic Three.js assembly story built from the same licensed GLB. Its real component meshes expand, hold, and return to the identical assembled vehicle before the cursor demonstrates the fixed-front towing physics. The story previews once and then responds to ordinary page scrolling without intercepting wheel or touch behavior.

<video src="./demo/rigid-tow-artifact-cursor-replay.mp4" controls muted playsinline poster="./demo/rigid-tow-artifact-cursor-poster.jpg" title="Rigid Tow Artifact Cursor demonstration with an Audi R8 expanding into its real model meshes, reforming, and being towed through circles, reversals, diagonals, and slow drags"></video>

[Download the authentic browser replay](./demo/rigid-tow-artifact-cursor-replay.mp4)

## Standalone HTML

Copy `demo/audi-r8-cursor.glb` to a public location before creating the movement.

```html
<div id="rigid-tow" style="position:relative;min-height:520px"></div>
<script type="module">
  import {
    createRigidTowAssemblyStory,
    createRigidTowArtifactCursor,
  } from "magic-mouse-movements/rigid-tow-artifact-cursor"

  const story = createRigidTowAssemblyStory(
    document.querySelector("#rigid-tow"),
    {
      modelUrl: "/media/audi-r8-cursor.glb",
      posterUrl: "/media/audi-r8-assembly-poster.jpg",
    },
  )

  const cursor = createRigidTowArtifactCursor(
    document.querySelector("#rigid-tow"),
    { modelUrl: "/media/audi-r8-cursor.glb" },
  )
  story.start()
  cursor.start()
  window.addEventListener("pagehide", () => {
    story.destroy()
    cursor.destroy()
  }, { once: true })
</script>
```

## React

```tsx
import { useCallback } from "react"
import { MovementStage } from "magic-mouse-movements/react"
import {
  createRigidTowAssemblyStory,
  createRigidTowArtifactCursor,
} from "magic-mouse-movements/rigid-tow-artifact-cursor"

export function RigidTowExample() {
  const create = useCallback((element: HTMLElement) => {
    const story = createRigidTowAssemblyStory(element, {
      modelUrl: "/media/audi-r8-cursor.glb",
      posterUrl: "/media/audi-r8-assembly-poster.jpg",
    })
    const cursor = createRigidTowArtifactCursor(element, {
      modelUrl: "/media/audi-r8-cursor.glb",
    })
    return {
      start() { story.start(); cursor.start() },
      pause() { story.pause(); cursor.pause() },
      resize() { story.resize(); cursor.resize() },
      destroy() { story.destroy(); cursor.destroy() },
    }
  }, [])

  return <MovementStage createMovement={create} className="movement-stage" />
}
```

## Assembly story contract

- The source is the same public CC BY 4.0 GLB used by the cursor, not a separate generated vehicle film.
- Real model meshes move outward from their assembled positions and return along the same paths.
- The opening and closing state are mathematically identical.
- A quiet assembled hold precedes expansion, the exploded state remains readable, and reassembly receives slightly more time than expansion.
- The first automatic preview stops after one cycle. Any ordinary page scroll takes control of progress.
- The renderer draws only when progress, visibility, or dimensions change.
- Reduced-motion, data-saving, WebGL-failure, and model-failure paths retain the static Audi poster.

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

The canvases are decorative, `aria-hidden`, and unable to receive pointer input. Controls retain the native cursor. Reduced-motion and data-saving visitors receive a static fallback without loading the Audi model. Coarse pointers remain supported without blocking scrolling or default touch behavior. The assembly story uses native scrolling and never captures the wheel. Destroying either movement releases listeners, observers, animation frames, canvases, textures, geometries, materials, and its WebGL renderer.

## Audi R8 model credit

`Audi R8` by [Randomness](https://sketchfab.com/throwbackthursdaymodels), available on [Sketchfab](https://sketchfab.com/3d-models/audi-r8-0e5c6feed3ff489093e33e686dd8f796), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

The distributed derivative was modified through glTF-Transform optimization, Meshopt compression, WebP texture conversion, and quantization. Audi and the model creator do not endorse this project.
