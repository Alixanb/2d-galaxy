# Plan: Preact UI Migration

> Migrate all imperative DOM-manipulation UI to Preact components with co-located SCSS.
> Steps execute via `/step`. Each step: ≤ 2 source files + its `.scss` sibling.

---

### Step 1
**Files**: `vite.config.ts`, `.claude/ARCHITECTURE.md`
**What**: Install `@preact/signals`. Add `includePaths: ['src/scss']` to vite CSS config. Create `.claude/ARCHITECTURE.md` documenting component tree, signal file, SCSS convention, mounting entry points. Replace Plan.md + plan_state.json.
**Test**: `tsc --noEmit` clean; `pnpm dev` starts without error.

---

### Step 2
**Files**: `src/core/gameSignals.ts`
**What**: Create `src/core/gameSignals.ts`. Export `signal()` instances for all live game data the UI reads: `speedSignal`, `leSignal`, `leMaxSignal`, `moSignal`, `moMaxSignal`, `decaySecondsSignal` (number|null), `decayMaxSignal` (number|null), `headingSignal` (radians), `velSignal` ({x,y}), `systemIdSignal`, `elapsedSignal` (ms), `progressSignal` (0–1), `fpsSignal`, `starCountSignal`, `totalStarsSignal`. Type all signals explicitly (no `any`).
**Test**: `tsc --noEmit` clean (file exists but is not imported anywhere yet).

---

### Step 3
**Files**: `src/ui/LandingPage.tsx` + `src/ui/LandingPage.scss`, `src/home.tsx`
**What**: Convert `LandingPage.ts` → `LandingPage.tsx`. Functional component accepting `onStart(mode: GameMode, showBlackholes: boolean) => void`. Renders existing HTML structure (mode buttons, BH toggle, START button) as JSX. Move styles from `src/scss/features/landing/` into `LandingPage.scss`. Update `src/home.ts` → `src/home.tsx`: `render(<LandingPage onStart={…} />, el)`. Delete `src/ui/LandingPage.ts`, `src/home.ts`, `src/scss/features/landing/`.
**Test**: Landing page loads; clicking START button navigates to simulation with correct `?mode=` + `?bh=` params.

---

### Step 4
**Files**: `src/systems/FloatingWindow.tsx` + `src/systems/FloatingWindow.scss`
**What**: Replace `createFloatingWindow()` factory with a `<FloatingWindow title minWidth? minHeight? onClose?>` Preact component. Draggable via `onPointerDown/Move/Up` on the titlebar and `useState` for position. Resizable via grip element. Renders `{children}` in the window body. Move styles from `src/scss/features/hud/_windows.scss` into `FloatingWindow.scss`. Delete `FloatingWindow.ts`.
**Test**: `tsc --noEmit` clean; a `<FloatingWindow>` instance can be rendered without errors.

---

### Step 5
**Files**: `src/ui/cockpit/StatusPanel.tsx` + `src/ui/cockpit/StatusPanel.scss`
**What**: Convert `StatusPanel.ts` → `StatusPanel.tsx`. Three `<canvas>` elements mounted via `useRef`. `drawGauge` logic moved verbatim. Expose `draw(vx,vy,le,leMax,mo,moMax,decay,decayMax)` via `useImperativeHandle`. Export `mountStatusPanel(container): StatusPanelRef` helper that calls `render(<StatusPanel ref={r}/>, container)` and returns the ref. Update `CockpitHUD.ts`: call `mountStatusPanel(lastCol)` and store ref. Delete `StatusPanel.ts`. Move styles from `_status.scss`.
**Test**: 3 arc gauges visible in bottom bar; speed and fuel values update during flight.

---

### Step 6
**Files**: `src/ui/cockpit/HeadingPanel.tsx` + `src/ui/cockpit/HeadingPanel.scss`
**What**: Convert `HeadingPanel.ts` → `HeadingPanel.tsx`. Reads `velSignal` and `headingSignal` via `useSignal`/`useComputed`. Computes PRO/RET/RDL/ANT deltas reactively. Export `mountHeadingPanel(container, galaxy)`. Update `CockpitHUD.ts`. Delete `HeadingPanel.ts`.
**Test**: PRO/RET/RDL/ANT angular deltas update as the ship moves.

---

### Step 7
**Files**: `src/ui/cockpit/FlightControlsPanel.tsx` + `src/ui/cockpit/FlightControlsPanel.scss`
**What**: Convert `FlightControlsPanel.ts` → `FlightControlsPanel.tsx`. Button grid with `useState` for toggle states (autoStab, retrograde, dockMode). Heading lock row. Writes to `galaxy.ship` properties on click. Export `mountFlightControlsPanel(container, galaxy, onPause)`. Update `CockpitHUD.ts`. Delete `FlightControlsPanel.ts`.
**Test**: AUTO-STAB button toggles its visual active state and `ship.autoStab` boolean.

---

### Step 8
**Files**: `src/ui/cockpit/PredictionPanel.tsx` + `src/ui/cockpit/SimParamsPanel.tsx` (+ `.scss` each)
**What**: `PredictionPanel.tsx`: single PREDICTION SYS toggle button, writes `ship.showPath`. `SimParamsPanel.tsx`: 3 `<input type="range">` faders for THRUSTER, RCS, SIM SPEED, writing `Ship.THRUSTPOWER`, `Ship.RADIALPOWER`, and `setSimSpeed()`. Delete `PredictionPanel.ts`, `SimParamsPanel.ts`, `CockpitUtils.ts`. Update `CockpitHUD.ts`.
**Test**: THRUSTER fader changes ship thrust; SIM SPEED fader changes time scale.

---

### Step 9
**Files**: `src/ui/CockpitHUD.tsx` + `src/ui/CockpitHUD.scss`
**What**: Convert `CockpitHUD.ts` → `CockpitHUD.tsx`. Functional component assembling top-bar + cockpit-panel grid as JSX. All sub-components rendered inline. Expose `update()` and `updateStatusGauges(data)` via `useImperativeHandle`. Update `src/main.ts`: create `#ui-root` div, `render(<CockpitHUD ref={cockpitRef} …/>, uiRoot)`. Add `<div id="ui-root" style="position:fixed;inset:0;pointer-events:none">` to `simulation.html`. Delete `CockpitHUD.ts`. Move styles from `_layout.scss`.
**Test**: Full cockpit renders; top bar shows elapsed time and system ID.

---

### Step 10
**Files**: `src/ui/mfd/views/HomeView.tsx` + `TelemetryView.tsx` (+ `.scss` each)
**What**: `HomeView.tsx`: 5 menu items rendered as JSX, `setView` callback prop. `TelemetryView.tsx`: data rows consuming `fpsSignal`/`starCountSignal`; canvas chart via `useRef`. Both accept `data: MFDData` prop and expose `getLabels(): string[]` + `onOSB(idx: number): void` via `useImperativeHandle`. Delete old `.ts` counterparts.
**Test**: MFD HOME view renders 5 menu items; telemetry values visible.

---

### Step 11
**Files**: `src/ui/mfd/views/VelocityView.tsx` + `AttitudeView.tsx` (+ `.scss` each)
**What**: Same pattern as Step 10. Data rows consuming `velSignal`, `headingSignal`. Delete old `.ts` counterparts.
**Test**: Switching MFD to VELOCITY view shows live velocity data rows.

---

### Step 12
**Files**: `src/ui/mfd/views/FuelView.tsx` + `RadarView.tsx` + `GuideView.tsx` + `ApproachView.tsx` (+ `.scss` each)
**What**: Same pattern. FuelView: fuel bar rows from `leSignal`/`moSignal`. RadarView: canvas `useRef`. GuideView/ApproachView: text + data rows. Delete old `.ts` counterparts. Delete `src/ui/mfd/MFDUtils.ts` (helpers replaced by JSX or inlined).
**Test**: All 8 MFD views cycle without errors via OSBs.

---

### Step 13
**Files**: `src/ui/MFD.tsx` + `src/ui/MFD.scss`
**What**: Convert `MFD.ts` → `MFD.tsx`. `useState<MFDViewName>` for active view. Renders 6 OSB buttons and the active view component. Expose `update(data: MFDData)` via `useImperativeHandle`. Export `mountMFD(container, galaxy)`. Update `CockpitHUD.tsx`. Delete `MFD.ts`, `MFDView.ts`. Move styles from `_mfd.scss`.
**Test**: MFD renders; OSB 1 cycles views; telemetry values update during flight.

---

### Step 14
**Files**: `src/ui/DebugPanel.tsx` + `src/ui/DebugPanel.scss`
**What**: Convert `DebugPanel.ts` → `DebugPanel.tsx`. Collapsible panel with warp select + action buttons (refill, max upgrades, add parts) calling passed callbacks. Delete `DebugPanel.ts`.
**Test**: Debug warp button changes system; refill button restores fuel.

---

### Step 15
**Files**: `src/ui/GalaxyMap.tsx` + `src/ui/GalaxyMap.scss`
**What**: Convert `GalaxyMap.ts` → `GalaxyMap.tsx`. Full-screen canvas overlay, visibility via `isVisible` prop. Canvas drawing logic moved verbatim, called in `useEffect` draw loop + pointer event handlers. `onTransit` callback prop. Delete `GalaxyMap.ts`. Move styles from `_map.scss`.
**Test**: M key opens map; hovering a system shows tooltip; clicking adjacent system triggers transit.

---

### Step 16
**Files**: `src/ui/TechTree.tsx` + `src/ui/TechTree.scss`
**What**: Convert `TechTree.ts` → `TechTree.tsx`. Full-screen overlay with node grid, SVG bezier lines, ship preview canvas. `gameState` + `onUpgrade` props. Node unlock state computed from props. Delete `TechTree.ts`.
**Test**: T key opens tree; available nodes are clickable; upgrades persist after save/reload.

---

### Step 17
**Files**: `src/main.ts`, `src/scss/main.scss`
**What**: Replace all `new XxxPanel(…)` / `new CockpitHUD(…)` calls with `render(<GameUI ref={uiRef} …/>, uiRoot)`. `GameUI` (new component in `src/ui/GameUI.tsx`) assembles everything. Game loop writes to signals and calls imperative draw refs. Remove `src/scss/features/` imports from `main.scss`. Delete `src/scss/features/` directory.
**Test**: Full simulation loads; plays; docks; tech tree upgrades apply; save/load round-trips correctly. `/docs.html` still renders.
