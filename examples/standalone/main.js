import {
  createActiveLinks,
  createConstellationWand,
  createFusionField,
  createLayeredReveal,
  createMagneticInk,
  createOrbitTrail,
  createPassbandLens,
  createPathfinder,
  createSystemAssembly,
  createTerrainScanner,
} from "../../dist/src/index.js"

const passband = createPassbandLens(document.querySelector("#passband"), {
  onBandChange: (band) => {
    for (const button of document.querySelectorAll("[data-band]")) {
      button.setAttribute("aria-pressed", String(button.dataset.band === band))
    }
  },
})

const movements = [
  passband,
  createOrbitTrail(document.querySelector("#orbit")),
  createSystemAssembly(document.querySelector("#assembly")),
  createActiveLinks(document.querySelector("#links")),
  createPathfinder(document.querySelector("#pathfinder"), { targetSelector: "[data-path-target]" }),
  createTerrainScanner(document.querySelector("#terrain")),
  createLayeredReveal(document.querySelector("#reveal")),
  createMagneticInk(document.querySelector("#ink")),
  createConstellationWand(document.querySelector("#constellation"), {
    listContainer: document.querySelector("#constellation-list"),
  }),
  createFusionField(document.querySelector("#fusion"), { scatterSelector: "[data-fusion-scatter]" }),
]

for (const movement of movements) movement.start()
for (const button of document.querySelectorAll("[data-band]")) {
  button.addEventListener("click", () => passband.setBand(button.dataset.band))
}
window.addEventListener("pagehide", () => {
  for (const movement of movements) movement.destroy()
}, { once: true })
