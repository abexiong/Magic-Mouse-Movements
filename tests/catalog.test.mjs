import assert from "node:assert/strict"
import { access, readdir, readFile } from "node:fs/promises"
import { test } from "node:test"
import { movementCatalog } from "../dist/src/catalog.js"
import * as publicApi from "../dist/src/index.js"

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
  assert.match(terrain, /const revealed: ScanPoint\[\]/)
  assert.match(terrain, /revealDuration/)
  assert.match(terrain, /point\.life -= frame\.delta/)
  assert.match(terrain, /drawWebsiteSurface/)
  assert.match(terrain, /cometTaper/)
  assert.match(terrain, /options\.revealDuration \?\? 3_000/)
  assert.doesNotMatch(terrain, /drawTerrain\(context, width, height, 0\.13\)/)
  assert.match(layered, /SOMETHING/)
  assert.match(layered, /OLD/)
  assert.match(layered, /NEW/)
  assert.match(layered, /const revealed: RevealPoint\[\]/)
  assert.match(layered, /revealDuration/)
  assert.match(layered, /point\.life -= frame\.delta/)
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
  assert.match(passband, /startAutoCycle/)
  assert.match(passband, /stopAutoCycle/)
  assert.match(constellation, /id: "adapt"/)
  assert.match(constellation, /id: "archive"/)
  assert.match(constellation, /id: "observe"/)
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
