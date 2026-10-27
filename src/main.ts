import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const BOARD_COUNT = 39
const LANE_WIDTH_IN = 41.5
const LANE_LENGTH_FT = 60
const RIGHT_HAND_POCKET_BOARD = 17.5
const BOARD_WIDTH_FT = LANE_WIDTH_IN / BOARD_COUNT / 12
const LANE_WIDTH_FT = LANE_WIDTH_IN / 12
const GUTTER_WIDTH_FT = 9.25 / 12
const boardToX = (board: number) => (board - 20) * BOARD_WIDTH_FT

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <a class="brand" href="#" aria-label="Sightline home">
        <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="brand-name">SIGHTLINE<span> / BOWLING</span></span>
      </a>
      <div class="topbar-actions">
        <div class="view-switch" role="group" aria-label="Lane view">
          <button class="view-option is-active" type="button" data-view="basic" aria-pressed="true">Basic</button>
          <button class="view-option" type="button" data-view="pattern" aria-pressed="false">Oil pattern</button>
        </div>
        <span class="regulation-tag"><span class="live-dot"></span> REGULATION LANE</span>
        <button class="reset-view" id="reset-view" type="button" title="Reset the 3D camera">Reset view</button>
      </div>
    </header>

    <main class="workspace">
      <section class="lane-stage" aria-label="Interactive 3D bowling lane">
        <div id="lane-scene" class="lane-scene"></div>
        <div class="stage-heading">
          <p class="eyebrow"><span id="view-kicker">BASIC VERSION</span><span id="view-detail">SHOT PLANNER</span></p>
          <h1 id="stage-title">Find your line.</h1>
          <p class="stage-subtitle" id="stage-subtitle">Release to breakpoint, mapped to the boards.</p>
        </div>
        <div class="stage-scale" aria-label="Lane distances">
          <span><b>0 FT</b> FOUL LINE</span>
          <span class="scale-rule"></span>
          <span><b>60 FT</b> HEAD PIN</span>
        </div>
        <div class="scene-caption"><span class="caption-swatch"></span> RIGHT-HAND VIEW <span class="caption-divider">/</span> BOARD 1 IS RIGHT</div>
        <div class="scene-controls-hint" aria-hidden="true"><span>DRAG TO ORBIT</span><span>SCROLL TO ZOOM</span><span>W A S D TO MOVE</span></div>
        <button class="move-forward-control" id="move-forward" type="button" aria-label="Hold to move forward" title="Hold to move forward">
          <span aria-hidden="true">W</span><small>HOLD</small>
        </button>
      </section>

      <aside class="control-panel" aria-label="Shot setup and calculations">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">SHOT SETUP</p>
            <h2>Right-hand line</h2>
          </div>
          <span class="panel-index">01</span>
        </div>

        <div class="input-section">
          <div class="section-label"><span>01</span><h3>Release point</h3></div>
          <label class="field-label" for="release-board">BOARD AT FOUL LINE</label>
          <div class="number-field">
            <input id="release-board" type="number" min="1" max="39" step="1" value="30" inputmode="numeric" aria-describedby="board-hint" />
            <span class="field-unit">BOARD</span>
          </div>
          <p class="field-hint" id="board-hint">1 is nearest the right gutter; 39 is left.</p>
        </div>

        <div class="input-section breakpoint-section">
          <div class="section-label"><span>02</span><h3>Breakpoint</h3></div>
          <div class="paired-fields">
            <label class="field-wrap" for="break-board">
              <span class="field-label">BOARD</span>
              <span class="number-field"><input id="break-board" type="number" min="1" max="39" step="1" value="10" inputmode="numeric" /><span class="field-unit">BD</span></span>
            </label>
            <label class="field-wrap" for="break-distance">
              <span class="field-label">DISTANCE</span>
              <span class="number-field"><input id="break-distance" type="number" min="1" max="60" step="1" value="43" inputmode="decimal" /><span class="field-unit">FT</span></span>
            </label>
          </div>
          <p class="field-hint">Distance is measured from the foul line.</p>
        </div>

        <div class="input-section hook-section">
          <div class="section-label"><span>03</span><h3>Hook estimate</h3></div>
          <div class="slider-heading"><label class="field-label" for="hook-boards">LATE MOVE TOWARD POCKET</label><output id="hook-value" for="hook-boards">8 BD</output></div>
          <input class="range-input" id="hook-boards" type="range" min="0" max="18" step="1" value="8" />
          <div class="range-scale"><span>0 BD</span><span>18 BD</span></div>
        </div>

        <div class="angle-result" aria-live="polite">
          <div class="result-topline"><span class="result-kicker">TARGETING ANGLE</span><span class="angle-indicator" id="angle-direction">RIGHT</span></div>
          <div class="angle-value"><span id="angle-value">2.54</span><span class="degree-mark">&deg;</span></div>
          <p class="angle-note">Release to breakpoint <span id="angle-summary">30 &rarr; 10 board</span></p>
        </div>

        <div class="point-summary">
          <div><span class="summary-label">RELEASE</span><strong id="release-summary">30 <small>BD</small></strong></div>
          <span class="summary-link" aria-hidden="true"></span>
          <div><span class="summary-label">BREAKPOINT</span><strong id="break-summary">10 <small>BD / 43 FT</small></strong></div>
          <span class="summary-link estimated-link" aria-hidden="true"></span>
          <div><span class="summary-label">EST. ENTRY</span><strong id="entry-summary">18 <small>BD</small></strong></div>
        </div>

        <p class="disclaimer"><span class="disclaimer-mark">i</span><span>Hook is a visual estimate only. It does not predict ball motion, lane conditions, or equipment reaction.</span></p>
      </aside>

      <div class="board-legend" aria-label="Path legend">
        <span class="oil-legend"><i class="legend-oil"></i> OIL <span class="oil-scale-label">LIGHT</span><i class="oil-gradient"></i><span class="oil-scale-label">HEAVY</span></span>
        <span><i class="legend-dot release-dot"></i> RELEASE</span>
        <span><i class="legend-line target-line"></i> TARGET LINE</span>
        <span><i class="legend-line hook-line"></i> EST. HOOK</span>
      </div>
    </main>
  </div>
`

const sceneContainer = document.querySelector<HTMLDivElement>('#lane-scene')!
const scene = new THREE.Scene()
scene.background = new THREE.Color('#1b302c')

const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 180)
camera.position.set(0, 29, -25)

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.12
renderer.domElement.className = 'lane-canvas'
renderer.domElement.setAttribute('aria-label', 'Three-dimensional bowling lane. Drag to orbit and scroll to zoom.')
sceneContainer.append(renderer.domElement)

scene.add(new THREE.HemisphereLight('#f3e9ce', '#19231f', 2.05))
const keyLight = new THREE.DirectionalLight('#fff1d0', 3.1)
keyLight.position.set(-8, 19, 19)
keyLight.castShadow = true
keyLight.shadow.mapSize.set(1024, 1024)
scene.add(keyLight)

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 0, 29)
controls.enableDamping = true
controls.dampingFactor = 0.065
controls.enablePan = false
controls.minDistance = 18
controls.maxDistance = 94
controls.maxPolarAngle = Math.PI * 0.49
controls.update()

const movementKeys = new Set<string>()
const movementSpeed = 10
const movementKeyNames = new Set(['w', 'a', 's', 'd'])

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase()
  if (!movementKeyNames.has(key)) return

  const activeElement = document.activeElement
  if (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement instanceof HTMLSelectElement ||
    (activeElement instanceof HTMLElement && activeElement.isContentEditable)
  ) return

  movementKeys.add(key)
  event.preventDefault()
})

window.addEventListener('keyup', (event) => movementKeys.delete(event.key.toLowerCase()))
window.addEventListener('blur', () => movementKeys.clear())
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') movementKeys.clear()
})

const moveForwardButton = document.querySelector<HTMLButtonElement>('#move-forward')!
moveForwardButton.addEventListener('pointerdown', (event) => {
  event.preventDefault()
  moveForwardButton.setPointerCapture(event.pointerId)
  movementKeys.add('w')
})

const stopForwardButton = () => movementKeys.delete('w')
moveForwardButton.addEventListener('pointerup', stopForwardButton)
moveForwardButton.addEventListener('pointercancel', stopForwardButton)
moveForwardButton.addEventListener('lostpointercapture', stopForwardButton)
moveForwardButton.addEventListener('contextmenu', (event) => event.preventDefault())

const woodMaterial = new THREE.MeshStandardMaterial({ color: '#bd8950', roughness: 0.52, metalness: 0.02 })
const lane = new THREE.Mesh(new THREE.BoxGeometry(LANE_WIDTH_FT, 0.18, LANE_LENGTH_FT), woodMaterial)
lane.position.set(0, 0, LANE_LENGTH_FT / 2)
lane.receiveShadow = true
scene.add(lane)

const stageFloor = new THREE.Mesh(
  new THREE.BoxGeometry(38, 0.22, 94),
  new THREE.MeshStandardMaterial({ color: '#263c35', roughness: 0.92 }),
)
stageFloor.position.set(0, -0.22, 29)
stageFloor.receiveShadow = true
scene.add(stageFloor)

const approach = new THREE.Mesh(
  new THREE.BoxGeometry(LANE_WIDTH_FT, 0.12, 13),
  new THREE.MeshStandardMaterial({ color: '#cfaa75', roughness: 0.7 }),
)
approach.position.set(0, -0.04, -6.5)
approach.receiveShadow = true
scene.add(approach)

for (const side of [-1, 1]) {
  const gutter = new THREE.Mesh(
    new THREE.BoxGeometry(GUTTER_WIDTH_FT, 0.11, LANE_LENGTH_FT),
    new THREE.MeshStandardMaterial({ color: '#292e2b', roughness: 0.36, metalness: 0.16 }),
  )
  gutter.position.set(side * (LANE_WIDTH_FT / 2 + GUTTER_WIDTH_FT / 2), -0.015, LANE_LENGTH_FT / 2)
  scene.add(gutter)
}

const addLine = (points: THREE.Vector3[], color: string, opacity = 1, dashed = false) => {
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = dashed
    ? new THREE.LineDashedMaterial({ color, dashSize: 0.38, gapSize: 0.24, transparent: opacity < 1, opacity })
    : new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity })
  const line = new THREE.Line(geometry, material)
  if (dashed) line.computeLineDistances()
  scene.add(line)
  return line
}

for (let board = 1; board < BOARD_COUNT; board += 1) {
  const x = (board - 19.5) * BOARD_WIDTH_FT
  addLine([new THREE.Vector3(x, 0.092, 0), new THREE.Vector3(x, 0.092, LANE_LENGTH_FT)], '#63472f', board % 5 === 0 ? 0.29 : 0.12)
}

const guideBoards = [5, 10, 15, 20, 25, 30, 35]
const arrowDistances = [13, 14, 15, 16, 15, 14, 13]
const guideMaterial = new THREE.MeshBasicMaterial({ color: '#493a2d', side: THREE.DoubleSide })
const targetDotGeometry = new THREE.CylinderGeometry(0.055, 0.055, 0.016, 16)

for (const [index, board] of guideBoards.entries()) {
  const x = boardToX(board)
  const arrowTipDistance = arrowDistances[index]
  const arrowGeometry = new THREE.BufferGeometry()
  arrowGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([
      x, 0.096, arrowTipDistance,
      x - 0.065, 0.096, arrowTipDistance - 0.4,
      x + 0.065, 0.096, arrowTipDistance - 0.4,
    ], 3),
  )
  arrowGeometry.setIndex([0, 1, 2])
  arrowGeometry.computeVertexNormals()
  scene.add(new THREE.Mesh(arrowGeometry, guideMaterial))

  const targetDot = new THREE.Mesh(targetDotGeometry, guideMaterial)
  targetDot.position.set(x, 0.099, 7)
  scene.add(targetDot)
}

const smoothStep = (edge0: number, edge1: number, value: number) => {
  const amount = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
  return amount * amount * (3 - 2 * amount)
}

const oilCanvas = document.createElement('canvas')
oilCanvas.width = 512
oilCanvas.height = 1024
const oilContext = oilCanvas.getContext('2d')!
const oilImage = oilContext.createImageData(oilCanvas.width, oilCanvas.height)
const oilEdgePosition = Math.abs(boardToX(2)) / (LANE_WIDTH_FT / 2)
const edgeOilRatio = 1 / 1.97

for (let y = 0; y < oilCanvas.height; y += 1) {
  const distance = (y / (oilCanvas.height - 1)) * 36
  const longitudinalFade = smoothStep(0, 2, distance) * (1 - smoothStep(34.5, 36, distance))

  for (let x = 0; x < oilCanvas.width; x += 1) {
    const lateralPosition = Math.abs((x / (oilCanvas.width - 1)) * 2 - 1)
    const edgeFade = 1 - smoothStep(oilEdgePosition, oilEdgePosition + 0.03, lateralPosition)
    const coverage = longitudinalFade * edgeFade
    const centerWeight = 1 - smoothStep(0.12, oilEdgePosition, lateralPosition)
    const oilRatio = edgeOilRatio + centerWeight * (1 - edgeOilRatio)
    const contrast = Math.pow((oilRatio - edgeOilRatio) / (1 - edgeOilRatio), 0.62)
    const pixel = (y * oilCanvas.width + x) * 4

    oilImage.data[pixel] = Math.round(112 - contrast * 91)
    oilImage.data[pixel + 1] = Math.round(221 - contrast * 183)
    oilImage.data[pixel + 2] = Math.round(204 + contrast * 44)
    oilImage.data[pixel + 3] = Math.round(coverage * (150 + contrast * 90))
  }
}

oilContext.putImageData(oilImage, 0, 0)
const oilTexture = new THREE.CanvasTexture(oilCanvas)
oilTexture.colorSpace = THREE.SRGBColorSpace
const oilOverlay = new THREE.Mesh(
  new THREE.PlaneGeometry(LANE_WIDTH_FT, 36),
  new THREE.MeshBasicMaterial({ map: oilTexture, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }),
)
oilOverlay.rotation.x = -Math.PI / 2
oilOverlay.position.set(0, 0.093, 18)
oilOverlay.renderOrder = 1
oilOverlay.visible = false
scene.add(oilOverlay)

for (const distance of [15, 34, 40, 46]) {
  addLine(
    [new THREE.Vector3(-LANE_WIDTH_FT / 2 + 0.08, 0.096, distance), new THREE.Vector3(LANE_WIDTH_FT / 2 - 0.08, 0.096, distance)],
    '#f0d5a5',
    0.17,
  )
}

const foulLine = new THREE.Mesh(
  new THREE.BoxGeometry(LANE_WIDTH_FT, 0.025, 0.08),
  new THREE.MeshStandardMaterial({ color: '#fff3d7', emissive: '#fff3d7', emissiveIntensity: 0.12 }),
)
foulLine.position.set(0, 0.105, 0)
scene.add(foulLine)

const makePin = (x: number, z: number) => {
  const group = new THREE.Group()
  const pinBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.21, 0.85, 12),
    new THREE.MeshStandardMaterial({ color: '#f6f0df', roughness: 0.32 }),
  )
  pinBody.position.y = 0.54
  pinBody.castShadow = true
  group.add(pinBody)
  const neckBand = new THREE.Mesh(
    new THREE.TorusGeometry(0.15, 0.035, 6, 16),
    new THREE.MeshStandardMaterial({ color: '#dc4e37', roughness: 0.45 }),
  )
  neckBand.rotation.x = Math.PI / 2
  neckBand.position.y = 0.72
  group.add(neckBand)
  group.position.set(x, 0.1, z)
  scene.add(group)
}

for (let row = 0; row < 4; row += 1) {
  for (let index = 0; index <= row; index += 1) {
    makePin((index - row / 2) * 0.9, 60.1 + row * 0.77)
  }
}

const makeLabel = (text: string, color: string, background: string) => {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  canvas.width = 384
  canvas.height = 112
  context.fillStyle = background
  context.beginPath()
  context.roundRect(2, 2, 380, 108, 22)
  context.fill()
  context.fillStyle = color
  context.font = '700 36px Trebuchet MS, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 2)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }))
  sprite.scale.set(1.2, 0.35, 1)
  sprite.renderOrder = 4
  return sprite
}

const laneSideX = LANE_WIDTH_FT / 2 + GUTTER_WIDTH_FT

for (const distance of [10, 20, 30, 40, 50]) {
  for (const side of [-1, 1]) {
    const edgeX = side * laneSideX
    addLine(
      [new THREE.Vector3(edgeX, 0.105, distance), new THREE.Vector3(edgeX + side * 0.28, 0.105, distance)],
      '#e3e8d9',
      0.52,
    )
  }

  const distanceLabel = makeLabel(`${distance} FT`, '#e8ecdf', 'rgba(22, 43, 35, 0.68)')
  distanceLabel.scale.set(0.82, 0.24, 1)
  distanceLabel.position.set(-laneSideX - 0.72, 0.32, distance)
  scene.add(distanceLabel)
}

const shotGroup = new THREE.Group()
scene.add(shotGroup)

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const estimateEntryBoard = (breakBoard: number, hookBoards: number) => {
  const pocketOffset = RIGHT_HAND_POCKET_BOARD - breakBoard
  return breakBoard + Math.sign(pocketOffset) * Math.min(hookBoards, Math.abs(pocketOffset))
}

const clearShot = () => {
  for (const object of shotGroup.children) {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) object.geometry.dispose()
    if ('material' in object) {
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      for (const material of materials) {
        if (material instanceof THREE.SpriteMaterial) material.map?.dispose()
        material.dispose()
      }
    }
  }
  shotGroup.clear()
}

const drawShot = (releaseBoard: number, breakBoard: number, breakDistance: number, hookBoards: number) => {
  clearShot()

  const release = new THREE.Vector3(boardToX(releaseBoard), 0.2, 0.35)
  const breakpoint = new THREE.Vector3(boardToX(breakBoard), 0.22, breakDistance)
  const entryBoard = estimateEntryBoard(breakBoard, hookBoards)
  const entry = new THREE.Vector3(boardToX(entryBoard), 0.22, LANE_LENGTH_FT)

  const targetCurve = new THREE.LineCurve3(release, breakpoint)
  const targetTube = new THREE.Mesh(
    new THREE.TubeGeometry(targetCurve, 32, 0.045, 8, false),
    new THREE.MeshStandardMaterial({ color: '#ff634f', emissive: '#a42617', emissiveIntensity: 0.25 }),
  )
  shotGroup.add(targetTube)

  const hookControl = new THREE.Vector3(
    breakpoint.x + (entry.x - breakpoint.x) * 0.2,
    0.24,
    breakpoint.z + (entry.z - breakpoint.z) * 0.55,
  )
  const hookCurve = new THREE.QuadraticBezierCurve3(breakpoint, hookControl, entry)
  const hookPath = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(hookCurve.getPoints(48)),
    new THREE.LineDashedMaterial({ color: '#d6fa66', dashSize: 0.56, gapSize: 0.3, linewidth: 2 }),
  )
  hookPath.computeLineDistances()
  shotGroup.add(hookPath)

  const makeMarker = (position: THREE.Vector3, color: string, radius: number) => {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 20, 16),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.23, roughness: 0.28 }),
    )
    marker.position.copy(position)
    marker.castShadow = true
    shotGroup.add(marker)
  }

  makeMarker(release, '#fff3d7', 0.16)
  makeMarker(breakpoint, '#ff634f', 0.2)
  makeMarker(entry, '#d6fa66', 0.2)

  const releaseLabel = makeLabel(`REL ${releaseBoard}`, '#24352e', '#fff3d7')
  releaseLabel.position.set(release.x, 1.15, release.z + 1.5)
  shotGroup.add(releaseLabel)

  const breakLabel = makeLabel(`BREAK ${breakBoard}`, '#ffffff', '#d94a38')
  breakLabel.position.set(breakpoint.x, 1.05, breakpoint.z - 1.2)
  shotGroup.add(breakLabel)

  const entryLabel = makeLabel(`ENTRY ${entryBoard}`, '#26372d', '#d6fa66')
  entryLabel.position.set(entry.x, 1.05, entry.z - 1.3)
  shotGroup.add(entryLabel)
}

const releaseInput = document.querySelector<HTMLInputElement>('#release-board')!
const breakBoardInput = document.querySelector<HTMLInputElement>('#break-board')!
const breakDistanceInput = document.querySelector<HTMLInputElement>('#break-distance')!
const hookInput = document.querySelector<HTMLInputElement>('#hook-boards')!
const viewButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.view-option'))
const boardLegend = document.querySelector<HTMLDivElement>('.board-legend')!
const laneStage = document.querySelector<HTMLElement>('.lane-stage')!

const setView = (view: 'basic' | 'pattern') => {
  const showPattern = view === 'pattern'
  oilOverlay.visible = showPattern
  boardLegend.classList.toggle('pattern-active', showPattern)
  laneStage.classList.toggle('pattern-active', showPattern)
  document.querySelector<HTMLSpanElement>('#view-kicker')!.textContent = showPattern ? 'OIL PATTERN' : 'BASIC VERSION'
  document.querySelector<HTMLSpanElement>('#view-detail')!.textContent = showPattern ? 'KEGEL SHEET' : 'SHOT PLANNER'
  document.querySelector<HTMLHeadingElement>('#stage-title')!.textContent = showPattern ? 'Short Ballard.' : 'Find your line.'
  document.querySelector<HTMLParagraphElement>('#stage-subtitle')!.textContent = showPattern
    ? '36 FT  /  29.16 ML  /  1.97:1 RATIO'
    : 'Release to breakpoint, mapped to the boards.'

  for (const button of viewButtons) {
    const isActive = button.dataset.view === view
    button.classList.toggle('is-active', isActive)
    button.setAttribute('aria-pressed', String(isActive))
  }
}

for (const button of viewButtons) {
  button.addEventListener('click', () => setView(button.dataset.view === 'pattern' ? 'pattern' : 'basic'))
}

const getInputValue = (input: HTMLInputElement, fallback: number, min: number, max: number) => {
  const value = input.valueAsNumber
  return clamp(Number.isFinite(value) ? value : fallback, min, max)
}

const updateShot = () => {
  const releaseBoard = getInputValue(releaseInput, 30, 1, BOARD_COUNT)
  const breakBoard = getInputValue(breakBoardInput, 10, 1, BOARD_COUNT)
  const breakDistance = getInputValue(breakDistanceInput, 43, 1, LANE_LENGTH_FT)
  const hookBoards = getInputValue(hookInput, 8, 0, 18)
  const entryBoard = estimateEntryBoard(breakBoard, hookBoards)
  const angle = Math.atan2(boardToX(releaseBoard) - boardToX(breakBoard), breakDistance) * (180 / Math.PI)
  const direction = Math.abs(angle) < 0.005 ? 'STRAIGHT' : angle > 0 ? 'RIGHT' : 'LEFT'

  document.querySelector<HTMLOutputElement>('#hook-value')!.textContent = `${hookBoards} BD`
  document.querySelector<HTMLSpanElement>('#angle-value')!.textContent = Math.abs(angle).toFixed(2)
  document.querySelector<HTMLSpanElement>('#angle-direction')!.textContent = direction
  document.querySelector<HTMLSpanElement>('#angle-direction')!.classList.toggle('left-angle', direction === 'LEFT')
  document.querySelector<HTMLSpanElement>('#angle-direction')!.classList.toggle('straight-angle', direction === 'STRAIGHT')
  document.querySelector<HTMLSpanElement>('#angle-summary')!.innerHTML = `${releaseBoard} &rarr; ${breakBoard} board`
  document.querySelector<HTMLElement>('#release-summary')!.innerHTML = `${releaseBoard} <small>BD</small>`
  document.querySelector<HTMLElement>('#break-summary')!.innerHTML = `${breakBoard} <small>BD / ${breakDistance} FT</small>`
  document.querySelector<HTMLElement>('#entry-summary')!.innerHTML = `${entryBoard} <small>BD</small>`
  document.querySelector<HTMLOutputElement>('#hook-value')!.value = `${hookBoards} BD`

  drawShot(releaseBoard, breakBoard, breakDistance, hookBoards)
}

for (const input of [releaseInput, breakBoardInput, breakDistanceInput, hookInput]) {
  input.addEventListener('input', updateShot)
}

document.querySelector<HTMLButtonElement>('#reset-view')!.addEventListener('click', () => {
  camera.position.set(0, 29, -25)
  controls.target.set(0, 0, 29)
  controls.update()
})

const resizeObserver = new ResizeObserver(() => {
  const { width, height } = sceneContainer.getBoundingClientRect()
  if (width === 0 || height === 0) return
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
})
resizeObserver.observe(sceneContainer)

updateShot()
setView('basic')
let previousFrameTime = performance.now()
renderer.setAnimationLoop(() => {
  controls.update()
  const currentFrameTime = performance.now()
  const delta = Math.min((currentFrameTime - previousFrameTime) / 1000, 0.05)
  previousFrameTime = currentFrameTime
  const forwardAmount = Number(movementKeys.has('w')) - Number(movementKeys.has('s'))
  const strafeAmount = Number(movementKeys.has('d')) - Number(movementKeys.has('a'))

  if (forwardAmount !== 0 || strafeAmount !== 0) {
    camera.updateMatrixWorld()
    const forward = controls.target.clone().sub(camera.position)
    forward.y = 0
    forward.normalize()
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
    right.y = 0
    right.normalize()
    const movement = forward.multiplyScalar(forwardAmount).add(right.multiplyScalar(strafeAmount))

    if (movement.lengthSq() > 0) {
      movement.normalize().multiplyScalar(movementSpeed * delta)
      camera.position.add(movement)
      controls.target.add(movement)
      controls.update()
    }
  }

  renderer.render(scene, camera)
})
