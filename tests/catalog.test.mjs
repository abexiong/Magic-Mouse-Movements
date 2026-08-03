import assert from "node:assert/strict"
import { access, readdir, readFile } from "node:fs/promises"
import { test } from "node:test"
import { movementCatalog } from "../dist/src/catalog.js"
import * as publicApi from "../dist/src/index.js"
import { createPassbandModeController } from "../dist/kits/passband-lens/index.js"

const repositoryRoot = new URL("../", import.meta.url)

test("catalog slugs and source folders are unique", () => {
  const slugs = movementCatalog.map((movement) => movement.slug)
  const paths = movementCatalog.map((movement) => movement.sourcePath)
  assert.equal(new Set(slugs).size, slugs.length)
  assert.equal(new Set(paths).size, paths.length)
  assert.ok(slugs.includes("passband-lens"))
})

test("every initial movement exports a creator", () => {
  const creators = [
    "createPassbandLens",
    "createOrbitTrail",
    "createSystemAssembly",
    "createActiveLinks",
    "createPathfinder",
    "createTerrainScanner",
    "createLayeredReveal",
    "createMagneticInk",
    "createConstellationWand",
    "createFusionField",
  ]
  for (const creator of creators) assert.equal(typeof publicApi[creator], "function", creator)
})

test("every catalog folder documents standalone HTML and React", async () => {
  for (const movement of movementCatalog) {
    const readmeUrl = new URL(`${movement.sourcePath}/README.md`, repositoryRoot)
    const readme = await readFile(readmeUrl, "utf8")
    assert.match(readme, /## Standalone HTML/)
    assert.match(readme, /## React/)
    assert.match(readme, /destroy\(\)/)
  }
})

test("repository visuals are present and linked from the README", async () => {
  const readme = await readFile(new URL("README.md", repositoryRoot), "utf8")
  const visuals = [
    "magic-mouse-movements-overview.png",
    "passband-lens-feature.png",
    "movement-gallery.png",
  ]
  for (const visual of visuals) {
    await access(new URL(`docs/images/${visual}`, repositoryRoot))
    assert.match(readme, new RegExp(`docs/images/${visual.replaceAll(".", "\\.")}`))
  }
  assert.doesNotMatch(readme, /Interactive Cursor Lab/)
  assert.doesNotMatch(readme, /10 Free Mouse Effects/)
  assert.match(readme, /## Choose by use case/)
  assert.match(readme, /## Why use a complete kit/)
  assert.match(readme, /## Adapt a movement to your site/)
  assert.match(readme, /product stories, portfolios, data reveals, guided navigation/)
  assert.match(readme, /https:\/\/www\.abrahamxiong\.com\/resources\/magic-mouse-movements/)
})

test("Fusion Field includes its halo, ringed trail, and collision physics", async () => {
  const source = await readFile(
    new URL("kits/fusion-field/index.ts", repositoryRoot),
    "utf8",
  )
  assert.match(source, /function drawPointerHalo/)
  assert.match(source, /function drawTrail/)
  assert.match(source, /haloRadius/)
  assert.match(source, /digit\.velocityX/)
  assert.match(source, /prepareScatterTargets/)
  assert.match(source, /restoreScatterTargets/)
  assert.match(source, /!frame\.policy\.staticFallback && !scatterPrepared/)
  assert.match(source, /const boundedX = clamp/)
})

test("Terrain Scanner and Layered Reveal ship complete contrasting scenes", async () => {
  const terrain = await readFile(
    new URL("kits/terrain-scanner/index.ts", repositoryRoot),
    "utf8",
  )
  const layered = await readFile(
    new URL("kits/layered-reveal/index.ts", repositoryRoot),
    "utf8",
  )
  assert.match(terrain, /surfaceColor/)
  assert.match(terrain, /const samples: RadarSample\[\]/)
  assert.match(terrain, /revealDuration/)
  assert.match(terrain, /drawWebsiteSurface/)
  assert.match(terrain, /drawTerrainTexture/)
  assert.match(terrain, /drawMask/)
  assert.match(terrain, /REFERENCE_TRAIL_LIFETIME = 1_400/)
  assert.match(terrain, /MAX_SAMPLES = 78/)
  assert.match(terrain, /globalCompositeOperation = "destination-in"/)
  assert.match(terrain, /options\.revealDuration \?\? REFERENCE_TRAIL_LIFETIME/)
  assert.doesNotMatch(terrain, /drawTerrain\(context, width, height, 0\.13\)/)
  assert.match(layered, /SOMETHING/)
  assert.match(layered, /OLD/)
  assert.match(layered, /NEW/)
  assert.match(layered, /const revealed: RevealPoint\[\]/)
  assert.match(layered, /revealDuration/)
  assert.match(layered, /point\.life -= frame\.delta/)
  assert.match(layered, /let lastPointerSample: Point \| null = null/)
  assert.match(layered, /frame\.canvas\.dataset\.revealPoints/)
  assert.doesNotMatch(layered, /last\.life = revealDuration/)
  assert.match(layered, /videoSrc/)
  assert.match(layered, /videoPoster/)
  await access(
    new URL(
      "kits/layered-reveal/demo/layered-reveal-replay.mp4",
      repositoryRoot,
    ),
  )
  await access(
    new URL(
      "kits/layered-reveal/demo/something-new-loop.mp4",
      repositoryRoot,
    ),
  )
  await access(
    new URL(
      "kits/layered-reveal/demo/something-new-poster.jpg",
      repositoryRoot,
    ),
  )
})

test("Passband Lens can auto-cycle and Constellation Wand ships a dense graph", async () => {
  const passband = await readFile(
    new URL("kits/passband-lens/index.ts", repositoryRoot),
    "utf8",
  )
  const constellation = await readFile(
    new URL("kits/constellation-wand/index.ts", repositoryRoot),
    "utf8",
  )
  assert.match(passband, /autoCycleMs/)
  assert.match(passband, /uniform sampler2D uTex/)
  assert.match(passband, /coverUv/)
  assert.match(passband, /ironbow/)
  assert.match(passband, /sobel/)
  assert.match(passband, /semanticLook/)
  assert.match(passband, /const BANDS: readonly PassbandName\[\] = \["optical", "thermal", "radar", "semantic"\]/)
  assert.match(passband, /vec3 color = base/)
  assert.match(passband, /mix\(color, vec3\(0\.64, 0\.86, 1\.00\), 0\.16\)/)
  assert.match(passband, /vec3 scopeColor = bandLook\(scopeIndex/)
  assert.match(passband, /float scopeIndex = mod\(floor\(uBand \+ 0\.5\), 4\.0\)/)
  assert.match(passband, /uniform float uOpticalZoom/)
  assert.match(passband, /\(fragmentPixel - uLens\.xy\) \/ max\(1\.0, uOpticalZoom\)/)
  assert.match(passband, /Math\.min\(4, Math\.max\(1, options\.opticalZoom \?\? 2\.76\)\)/)
  assert.doesNotMatch(passband, /scopeBlend/)
  assert.doesNotMatch(passband, /bandTarget/)
  assert.match(passband, /band = bandIndex\(nextBand\)/)
  assert.match(passband, /createPassbandModeController/)
  assert.match(passband, /options\.autoCycleMs \?\? 3_000/)
  assert.match(passband, /isAutoCycleEnabled:/)
  assert.match(passband, /setAutoCycle\(enabled\)/)
  assert.match(passband, /\|\| !mode\.isAutoCycleEnabled\(\)/)
  assert.match(passband, /setBand\(nextBand\) \{\n      mode\.selectBand\(nextBand\);\n      stopAutoCycle\(\)/)
  assert.match(passband, /applyBand\(nextBand\)/)
  assert.match(passband, /window\.setTimeout\(\(\) =>/)
  assert.match(passband, /advanceBand\(\);\n      startAutoCycle\(\)/)
  assert.doesNotMatch(passband, /window\.setInterval\(advanceBand/)
  assert.match(passband, /imageSrc/)
  assert.match(passband, /Math\.min\(canvas\.width, canvas\.height\) \* 0\.16/)
  assert.match(passband, /startAutoCycle/)
  assert.match(passband, /stopAutoCycle/)
  assert.match(passband, /\|\| !ready/)
  assert.match(passband, /ready = true;\n        startAutoCycle\(\)/)
  assert.doesNotMatch(passband, /startAutoCycle\(\);\n        if \(fallback\)/)
  assert.match(passband, /function createContactSheet/)
  assert.match(passband, /const activateFallback/)
  assert.match(passband, /webglcontextlost/)
  assert.match(passband, /webglcontextrestored/)
  assert.match(passband, /replacement = createPassbandLens/)
  assert.match(passband, /autoCycleMs: configuredAutoCycleMs/)
  assert.match(passband, /replacement\.setAutoCycle\(mode\.isAutoCycleEnabled\(\)\)/)
  assert.match(passband, /usesNativeCursor\(event\.target\)/)
  assert.match(passband, /container\.style\.cursor = ""/)
  assert.match(passband, /\.catch\(\(error: unknown\) =>/)
  assert.match(passband, /fallback\?\.setBand\(nextBand\)/)
  await access(
    new URL(
      "kits/passband-lens/demo/passband-terrain-v2.jpg",
      repositoryRoot,
    ),
  )
  assert.match(constellation, /id: "adapt"/)
  assert.match(constellation, /id: "archive"/)
  assert.match(constellation, /id: "observe"/)
  assert.match(constellation, /id: "release"/)
  assert.match(constellation, /const dustCount = width < 680 \? 150 : 280/)
  assert.match(constellation, /pointerDistance \/ 330/)
})

test("Passband Lens defaults to Auto and manual selection remains locked", () => {
  const mode = createPassbandModeController()

  assert.equal(mode.getBand(), "optical")
  assert.equal(mode.isAutoCycleEnabled(), true)
  assert.deepEqual(
    [mode.advanceBand(), mode.advanceBand(), mode.advanceBand(), mode.advanceBand()],
    ["thermal", "radar", "semantic", "optical"],
  )

  assert.equal(mode.selectBand("radar"), "radar")
  assert.equal(mode.isAutoCycleEnabled(), false)
  assert.equal(mode.advanceBand(), "radar")

  mode.setAutoCycle(true)
  assert.equal(mode.isAutoCycleEnabled(), true)
  assert.equal(mode.advanceBand(), "semantic")
})

test("first-party interaction constants remain intact", async () => {
  const sources = Object.fromEntries(await Promise.all(
    [
      "orbit-trail",
      "system-assembly",
      "active-links",
      "pathfinder",
      "layered-reveal",
      "magnetic-ink",
      "fusion-field",
    ].map(async (slug) => [
      slug,
      await readFile(new URL(`kits/${slug}/index.ts`, repositoryRoot), "utf8"),
    ]),
  ))
  assert.match(sources["orbit-trail"], /time - trail\[0\]\.born > 900/)
  assert.match(sources["orbit-trail"], /13 \+ expansion \* 15/)
  assert.match(sources["orbit-trail"], /nodeSelector\?: string/)
  assert.match(sources["orbit-trail"], /stageIndex\?: number \| \(\(\) => number\)/)
  assert.match(sources["system-assembly"], /const radius = 27/)
  assert.match(sources["system-assembly"], /nodeDistance < 420/)
  assert.match(sources["system-assembly"], /targetSelector\?: string/)
  assert.match(sources["system-assembly"], /activeIndex\?: number \| \(\(\) => number\)/)
  assert.match(sources["active-links"], /options\.radius \?\? 540/)
  assert.match(sources["active-links"], /time \* 0\.00042/)
  assert.match(sources["active-links"], /nodeSelector\?: string/)
  assert.match(sources.pathfinder, /const cursorCorners/)
  assert.match(sources.pathfinder, /const targetRect/)
  assert.match(sources["layered-reveal"], /options\.revealDuration \?\? 2_600/)
  assert.match(sources["layered-reveal"], /Math\.ceil\(travel \/ 9\)/)
  assert.match(sources["layered-reveal"], /video\.autoplay = !prefersStaticMedia/)
  assert.match(sources["magnetic-ink"], /options\.particleCount \?\? \(coarsePointer \? 170 : 300\)/)
  assert.match(sources["magnetic-ink"], /options\.attractionRadius \?\? 275/)
  assert.match(sources["magnetic-ink"], /reversals\.length >= 3/)
  assert.match(sources["magnetic-ink"], /delta \/ 18_000/)
  assert.match(sources["magnetic-ink"], /const frameScale = clamp\(delta \/ 16\.67, 0\.25, 3\)/)
  assert.match(sources["magnetic-ink"], /particle\.vx \*= Math\.pow\(0\.938, frameScale\)/)
  assert.match(sources["fusion-field"], /options\.haloRadius \?\? 210/)
  assert.match(sources["fusion-field"], /width \* \(mobile \? 0\.5 : 0\.78\)/)
  assert.match(sources["fusion-field"], /mobile \? 58 : 104/)
  assert.match(sources["fusion-field"], /renderScatterBodies\(frame, scatter\.bodies, 180, motion\)/)
})

test("the shared controller restores native cursors over interactive and selectable content", async () => {
  const source = await readFile(
    new URL("src/core/canvas-movement.ts", repositoryRoot),
    "utf8",
  )
  assert.match(source, /function nativeCursorTarget/)
  assert.match(source, /\[data-cursor-native\]/)
  assert.match(source, /"button"/)
  assert.match(source, /"p"/)
  assert.match(source, /container\.style\.cursor = nativeCursor \? "" : "none"/)
  assert.match(source, /pointer\.active = !nativeCursorTarget\(event\.target\)/)
})

test("public source contains no private paths or em dashes", async () => {
  const blocked = ["/Users/"]
  const roots = [
    "README.md",
    "NOTICE.md",
    "PROVENANCE.md",
    "THIRD_PARTY_NOTICES.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
    "docs/images/README.md",
    "examples",
    "scripts",
    "src",
    "kits",
  ]

  async function collect(relativePath) {
    const url = new URL(relativePath, repositoryRoot)
    const entries = await readdir(url, { withFileTypes: true })
    const files = []
    for (const entry of entries) {
      const next = `${relativePath.replace(/\/$/, "")}/${entry.name}`
      if (entry.isDirectory()) files.push(...await collect(`${next}/`))
      else files.push(next)
    }
    return files
  }

  const files = []
  for (const root of roots) {
    if (root.includes(".")) files.push(root)
    else files.push(...await collect(`${root}/`))
  }
  for (const file of files) {
    const content = await readFile(new URL(file, repositoryRoot), "utf8")
    for (const value of blocked) assert.equal(content.includes(value), false, `${file} contains ${value}`)
    assert.equal(content.includes("—"), false, `${file} contains an em dash`)
  }
})
