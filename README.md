# Magic Mouse Movements

Complete, accessible cursor effect kits for product stories, portfolios, data reveals, guided navigation, and experimental websites.

<p align="center">
  <a href="https://www.abrahamxiong.com/resources/magic-mouse-movements"><strong>Try every movement in the live playground</strong></a>
</p>

<p align="center">
  <img src="./docs/images/magic-mouse-movements-overview.png" alt="Magic Mouse Movements website concept with Passband Lens, the movement catalog, complete kit anatomy, code examples, and repository actions" width="760" />
</p>

<p align="center">
  <img alt="MIT License" src="https://img.shields.io/badge/license-MIT-5793ff" />
  <img alt="TypeScript" src="https://img.shields.io/badge/core-TypeScript-2457d6" />
  <img alt="Rendering" src="https://img.shields.io/badge/rendering-Canvas%202D%20%2B%20WebGL2-111722" />
  <img alt="React optional" src="https://img.shields.io/badge/React-optional-a8c4ff" />
</p>

Magic Mouse Movements helps the pointer do useful work. A movement can reveal a hidden layer, connect related content, guide visitors toward the next action, explain a technical system, or give a launch page a memorable interactive moment.

Each movement is a complete, customizable kit. You get the pointer behavior, visual engine, demonstration scene, accessibility policy, lifecycle cleanup, and standalone plus React guidance. Start with a working interaction, then replace the scene, tune the physics, and adapt the visual language to your site.

## Choose by use case

| What your page needs | Recommended movements | Example applications |
|---|---|---|
| Reveal hidden detail or compare visual states | Passband Lens, Terrain Scanner, Layered Reveal | Maps, technical imagery, before-and-after work, product layers |
| Guide attention toward relevant content | Pathfinder, Active Links, Orbit Trail | Case studies, chapter navigation, calls to action, related evidence |
| Make a system or process easier to understand | System Assembly, Constellation Wand | Architecture, capabilities, relationships, workflows |
| Add expressive motion to a high-impact moment | Magnetic Ink, Fusion Field, Orbit Trail | Portfolio heroes, product launches, campaigns, interactive editorial |

## Why use a complete kit

- **Show the idea clearly.** The included scene demonstrates why the interaction exists, not only how the cursor moves.
- **Integrate faster.** Start from a working Canvas 2D or WebGL2 engine with direct imports for each movement.
- **Keep the page usable.** Native controls, semantic HTML, touch behavior, reduced motion, and static fallbacks remain part of the contract.
- **Clean up safely.** Every movement exposes the same lifecycle so observers, listeners, frames, canvases, and graphics resources can be released.
- **Make it your own.** Swap the imagery, labels, nodes, particles, targets, colors, timing, and physics without rebuilding the engine.

## Visual tour

### Passband Lens

Passband Lens is useful when visitors need to inspect one registered image through multiple information layers. The base terrain remains optical while the movable scope switches between optical, thermal, radar, and semantic views.

![Passband Lens previewing a thermal instrument inside an optical view of a photoreal aerial test range](./docs/images/passband-lens-feature.png)

### A catalog designed to grow

The catalog covers trails, assembly, active links, pathfinding, scanning, layered reveals, magnetic particles, constellations, and binary fields. New movements can join the same manifest and lifecycle without changing the integration model.

![A visual gallery of cursor trails, linked nodes, pathfinding, terrain scanning, layered reveals, magnetic particles, constellations, and a binary vortex](./docs/images/movement-gallery.png)

The Passband image is a browser capture of the live engine. The overview and gallery are conceptual previews. Use the live playground or run the local gallery to interact with every rendering engine.

## Install

```bash
npm install github:abexiong/Magic-Mouse-Movements
```

Import the full catalog or one movement directly:

```ts
import {
  createPassbandLens,
  PASSBAND_DEMO_IMAGE,
} from "magic-mouse-movements/passband-lens"

const container = document.querySelector<HTMLElement>("[data-passband]")
if (!container) throw new Error("Passband container not found")

const movement = createPassbandLens(container, {
  imageSrc: PASSBAND_DEMO_IMAGE,
})

movement.start()

// Restore the native cursor and release all resources when the page exits.
window.addEventListener("pagehide", () => movement.destroy(), { once: true })
```

Run the complete local gallery with `npm run demo`.

## Adapt a movement to your site

1. Pick the movement that matches the job your page needs to do.
2. Copy its neutral demonstration scene or provide your own imagery and content.
3. Tune the exported options for timing, radius, particle count, selectors, and callbacks.
4. Keep the fallback and lifecycle behavior intact when you integrate it.

Each folder under [`kits/`](./kits) includes standalone HTML and React examples, options, accessibility notes, and cleanup guidance.

## Current catalog

| Movement | Technology | Useful for |
|---|---|---|
| Passband Lens | WebGL2 | Inspecting maps, terrain, products, or technical imagery through registered visual modes |
| Orbit Trail | Canvas 2D | Connecting long-form chapters and turning page progression into a visible journey |
| System Assembly | Canvas 2D | Explaining capabilities, architecture, and how separate parts form a system |
| Active Links | Canvas 2D | Showing relationships between nearby content, nodes, and destinations |
| Pathfinder | Canvas 2D | Guiding visitors toward the nearest action, evidence point, or next step |
| Terrain Scanner | Canvas 2D | Revealing hidden spatial or technical detail without covering the readable page |
| Layered Reveal | Canvas 2D | Comparing old and new states, before-and-after work, or two visual narratives |
| Magnetic Ink | Canvas 2D | Adding tactile drawing and particle response to expressive brand moments |
| Constellation Wand | Canvas 2D | Making networks, destinations, and connected ideas feel explorable |
| Fusion Field | Canvas 2D | Giving technology stories and launch pages a responsive cinematic focal point |

## Shared lifecycle

Every kit exposes the same lifecycle:

```ts
const movement = createMovement(container, options)
movement.start()
movement.pause()
movement.resize()
movement.destroy()
```

Only one movement needs to be mounted and animated at a time. Rendering cores are dependency-free, while React remains an optional integration layer.

## Accessibility and fallbacks

The effects enhance a page. They should never become the only way to understand or navigate it. Keep important content in semantic HTML, preserve native keyboard behavior, and use the included reduced-motion, coarse-pointer, and static fallback paths.

## Contributing

New movements are welcome when they include a complete demonstration scene, documented integration path, accessibility behavior, cleanup, and public provenance. See [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a contribution.

## License

Magic Mouse Movements is available under the [MIT License](./LICENSE).
