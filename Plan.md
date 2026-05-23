# Plan: SIGNAL RELAY Full Gameplay Integration

## Context

The game is a working sandbox gravity simulation. This plan converts it into a structured career game: 10 fixed blackhole systems of escalating difficulty, a relay-station rendezvous as the core objective each system, a tech tree gated by earned "parts", tidal shielding as a hard gate on harder systems, heading-lock orientation modes (auto-rotation toward prograde/retrograde/radial), fully-simulated inter-system transit, Tutorial + Approach MFD screens, Pe/Ap + encounter orbital markers, docking mode with 4-axis RCS, and a redesigned landing page. Two floating UI windows are deleted.

Reference document: `GAMEPLAY.md` authoritative on all game design decisions.

---

## UI layer: Preact

DOM-heavy components (MFD views, TechTree, GalaxyMap overlay) are built with **Preact** a 3 KB React-compatible library. Reason: AI generates JSX far more reliably than imperative `createElement` chains, and the component model maps directly to the view architecture this plan already requires. Canvas rendering, physics, and game state stay from-scratch Preact is UI-only.

---

## Rules for each iteration

- One step at a time. Do not start the next step until the current one is tested in the browser.
- Each step touches at most 2 files. The MFD split step (Step 16) is the single exception.
- After each step: `tsc --noEmit` clean, then visual test, then commit.
- Never commit without launching `npm run dev` and verifying the test criterion.

---

## Implementation Atomic Steps

### Step 0 Install Preact + configure build

**Files:** `vite.config.ts` (new), `tsconfig.json`
**What:** `pnpm add preact`. Create `vite.config.ts` with `esbuild: { jsxImportSource: 'preact' }`. Add `"jsx": "react-jsx"` and `"jsxImportSource": "preact"` to `tsconfig.json` compilerOptions.
**Test:** `npx tsc --noEmit` clean. No visible changes.

---

### Step 1 Fix orbit integration bug

**Files:** `src/entities/Ship.ts`
**What:** In `integrateStep()`, fix position update: `pos += vel / sub` is wrong should be `pos += vel * subDt` (where `subDt = dt / sub`). This makes prediction and reality use identical physics.
**Test:** Enable trajectory. Coast for 60 s without input. Pe/Ap stay fixed no drift. Orbit is a clean ellipse, no corners.

---

### Step 2 Data layer: GameState + 10 systems

**Files:** `src/core/GameState.ts` (new), `src/data/systems.ts` (new)
**What:** Create all types (`GameMode`, `TidalRating`, `HeadingLockMode`, `UpgradeState`, `GameState`) and helper functions (`getMaxLE`, `getMaxMono`, `getThrustFactor`, `getRCSFactor`, `canHeadingLock`, `createInitialState`). Create `SystemConfig` interface and all 10 system configs (SOL-0 through SINGULARITY) matching GAMEPLAY.md. Starting conditions per GAMEPLAY.md: thrust 20%, LE 100, RCS 40%, mono 40. FREE FLIGHT = max upgrades.
**Test:** `npx tsc --noEmit` compiles clean. No render changes.

---

### Step 3 Landing page: 3 mode buttons

**Files:** `src/ui/LandingPage.ts`, `index.html`
**What:** Replace the 6 config sliders with 3 mode buttons: RELAY / FREE FLIGHT / DEAD SIGNAL. Each has a 1-line description (from GAMEPLAY.md). Keep "show black holes" toggle. Change `onStart` signature to `(mode: GameMode, showBlackholes: boolean) => void`.
**Test:** Landing page shows 3 buttons with descriptions. Click each → simulation starts. Old sliders gone.

---

### Step 4 Wire GameState into main.ts + remove floating windows

**Files:** `src/main.ts`
**What:** `startSimulation(mode, showBlackholes)` creates `GameState` via `createInitialState(mode)`. Remove `buildSpawnWindow()`, `buildSimSpeedWindow()`, the star-spawn click listener. Keep the rest of the loop intact.
**Test:** Game starts from each mode. No floating spawn window, no floating sim speed window.

---

### Step 5 Sim speed fader + pause button in cockpit

**Files:** `src/ui/CockpitHUD.ts`, `src/main.ts`
**What:** Add SIM SPEED fader to DRIVE SYS section (callbacks via constructor). Add PAUSE button to FLIGHT CTRL section toggles a `paused` boolean in main.ts that stops accumulator.
**Test:** Sim speed slider changes speed visibly. PAUSE freezes stars and ship. RESUME continues.

---

### Step 6 RelayStation entity + Galaxy spawning

**Files:** `src/entities/RelayStation.ts`, `src/systems/Galaxy.ts`
**What:** Create `RelayStation`: orbit update (`orbitAngle += orbitSpeed * dt`), `projectPosition(steps, dt)` for encounter math. Draw using `drawRelayStation(ctx, size, tidalLevel)` from `src/sprites/relay.ts` cached to an offscreen canvas. Galaxy spawns relay(s) from `SystemConfig.relayCount / relayOrbitRadius / relayOrbitSpeed` and passes the system's `TidalRating` mapped to a `TidalLevel`.
**Test:** Relay station visible, orbiting the black hole, using the correct sprite for the current system's tidal level.

---

### Step 6.5 Relay Station Physics & Collision

**Files:** `src/entities/RelayStation.ts`, `src/systems/galaxy/GalaxyPhysics.ts`, `src/data/systems.ts`, `src/main.ts`
**What:** Refactor `RelayStation` to compute a realistic orbital velocity using $v = \sqrt{GM/r}$ (similar to Star) instead of arbitrary fixed speeds, converting linear velocity to angular velocity for its orbit. Increase `relayOrbitRadius` for `SOL-0` in `systems.ts` so it sits further from the black hole. Add circle-collision detection between `Ship` and `RelayStation` in `GalaxyPhysics.updateEntities()`. Add an empty `onDeath()` callback to `main.ts` and `Galaxy.ts` triggered upon collision.
**Test:** The relay station moves at a logical speed, is further out on level 1, and flying directly into the relay station visually triggers the collision check (can be verified with a console.log or observing the empty callback hit).

---

### Step 7 Pe/Ap markers on trajectory

**Files:** `src/entities/Ship.ts`
**What:** In `predictPath()`, scan path for min/max distance from `blackholes[0]` → store `pe` and `ap` (worldPos + dist). In `drawPath()`, draw ▼ (dim red) at `pe.worldPos` and ▲ (dim yellow) at `ap.worldPos` in world space.
**Test:** Enable trajectory → ▼ appears at closest BH approach, ▲ at farthest point. Markers move when ship burns.

---

### Step 8 Encounter marker

**Files:** `src/entities/Ship.ts`
**What:** Ship gains `targetRelay?: RelayStation`. In `predictPath()`, for each step project relay position via `targetRelay.projectPosition(i, dt)`, find minimum approach → store `encounterPoint` (worldPos, dist, timeToReach) when dist < 0.10 wu. In `drawPath()`, draw ◆ (cyan) at encounter worldPos with distance annotation. Galaxy sets `ship.targetRelay` after spawning.
**Test:** Trajectory shows ◆ where ship path comes closest to the relay orbit.

---

### Step 9 Escape trajectory coloring

**Files:** `src/entities/Ship.ts`
**What:** In `predictPath()`, flag `escapeTrajectory = true` and store `escapeStepIndex` when a path point exceeds `systemBoundaryRadius`. In `drawPath()`, draw path segments green from `escapeStepIndex` onward.
**Test:** Burn strongly prograde → trajectory line turns green past the escape point.

---

### Step 10 Orientation ring (visual, always on)

**Files:** `src/entities/Ship.ts`
**What:** In `draw()`, call `drawOrientationRing(canvas)`: fixed screen-space ring (radius 40px × dpr) around ship. 4 markers at computed world angles: prograde (`atan2(vel.x, -vel.y)`), retrograde (+π), radial-in (toward nearest BH), anti-radial (+π). Small filled circle (4px) + glyph per marker. Prograde/retrograde = `#3dff7a`, radial = `#e9d628`. Only draw when `vel.length() > 0.0001`.
**Test:** Markers visible around ship. Prograde marker always points in the direction of travel.

---

### Step 11 Heading lock

**Files:** `src/entities/Ship.ts`, `src/ui/CockpitHUD.ts`
**What:** Ship gains `headingLock: HeadingLockMode = 'manual'`. In `updateFlightMode()`, if lock ≠ manual, compute target angle and apply angular correction impulse toward it (drains monergol). Rotation key disengages lock. Add 5-button row (MAN / PRO / RET / RDL / ANT) to FLIGHT CTRL section in cockpit. Buttons gray when tier not met (check `canHeadingLock` from upgrades pass upgrades ref to cockpit or check on ship). Active mode highlighted.
**Test:** Click PRO → ship rotates automatically to face velocity direction. Pressing ← or → disengages to MAN.

---

### Step 12 Docking mode (4-axis RCS)

**Files:** `src/entities/Ship.ts`, `src/ui/CockpitHUD.ts`
**What:** Ship gains `dockingMode: boolean`, `rcsForward: number`, `rcsSideways: number`. In `updateDockingMode()`: arrows = translation in ship-local frame (20% thrust, drains monergol), Q/E = rotation, angular damping always on. Track `rcsForward`/`rcsSideways` for MFD. Add DOCK MODE button to FLIGHT CTRL.
**Test:** Toggle DOCK MODE → arrow keys translate ship. Angular damping holds heading.

---

### Step 13 Dock detection + parts reward

**Files:** `src/systems/Galaxy.ts`, `src/main.ts`
**What:** In `Galaxy.update()`, check ship distance to each relay. When `dist < relay.completionRadius` AND relative speed < 0.0002 wu/s: call `onDock(relay)`. Main.ts `onDock` grants `config.partsReward` to `gameState.upgrades.parts`, adds system to `completedSystems`. Wire `ship.targetRelay` to first relay on spawn.
**Test:** Approach relay very slowly in docking mode → dock triggers (log or visible state change).

---

### Step 14 Tidal decay timer

**Files:** `src/main.ts`, `src/ui/CockpitHUD.ts`, `src/style.css`
**What:** `getDecaySeconds()` returns null if shielding sufficient, else seconds from gap table (gap 1 = 300s, gap 2 = 90s, gap 3 = 30s, gap 4 = 15s). Decrement by `rawDelta` in animate(). On zero in RELAY: respawn ship at system entry. Add red countdown bar to SHIP STATUS section (hidden when null, pulses with CSS animation when < 30s).
**Test:** SOL-0 (no tidal) → bar hidden. Manually test with a high-tidal config → bar visible and depleting. At zero, ship respawns.

---

### Step 15 Inter-system transit

**Files:** `src/systems/Galaxy.ts`, `src/main.ts`
**What:** Galaxy gains `transitMode: boolean`, `enterTransitMode()` (sets flag, disables gravity), `transitionToSystem(config)` (re-spawns BHs/stars/relays, fades gravity in over 2s, resets flag). Main.ts: when ship exits boundary → `enterTransitMode()`. When ship reaches 1.5× boundary in transit → `loadSystem(nextConfig)`. `loadSystem()` resets decay timer, updates `currentSystemId`.
**Test:** Fly past system boundary → gravity stops, stars sparse. Ship coasts. After crossing void → new system's BH appears, gravity resumes.

---

### Step 16 Split MFD into Preact view components

**Files:** `src/ui/MFD.ts` + `src/ui/mfd/views/` (exception to 2-file rule)
**What:** Create `src/ui/mfd/views/` with Preact components: `HomeView.tsx`, `VelView.tsx`, etc. MFD.ts becomes a thin shell for standard slots. Create a **dedicated** `TutorialMFD.ts` shell for the independent tutorial screen. Both use the same view-switching architecture.
**Test:** Existing MFD views display in standard slots. New Tutorial MFD screen appears in its dedicated area.

---

### Step 17 Tutorial MFD Dynamic Guide Logic

**Files:** `src/ui/mfd/views/GuideView.tsx` (new), `src/ui/TutorialMFD.ts`
**What:** Implement the GuideView Preact component. Logic to auto-switch between APPROACH and ESCAPE based on distance to relay. Dynamic instruction line: computes remaining delta-V needed for orbit, or distance to boundary. Steps (1-5) auto-tick based on live `MFDData`.
**Test:** Tutorial MFD shows APPROACH steps when near relay, ESCAPE when far. Instructions update live as you burn.

---

### Step 18 MFD Approach view & 2nd Slot logic

**Files:** `src/ui/MFD.ts`, `src/ui/mfd/views/ApproachView.tsx` (new), `src/ui/CockpitHUD.ts`
**What:** Add "approach" view. Update `CockpitHUD` to render two MFD slot containers, but keep the 2nd one hidden/disabled unless `gameState.upgrades.mfdSlots > 1`.
**Test:** In docking mode → see relative speed/range. Buy 2nd slot upgrade → two independent MFDs become visible.

---

### Step 19 Tech Tree: Purchase & Refund Logic

**Files:** `src/ui/TechTree.tsx`, `src/core/GameState.ts`
**What:** Implement `onPurchase(nodeId)` and `onRefund(nodeId)`. Refund returns 100% parts. Ensure tree dependency logic (cannot refund a node if a dependent node is still owned).
**Test:** Buy node → parts decrease. Refund node → parts return to original value. Locked dependents stay locked.

---

### Step 20 Galaxy Map overlay

**Files:** `src/ui/GalaxyMap.ts` (new), `src/ui/CockpitHUD.ts`, `src/style.css`
**What:** Canvas overlay for system nodes. Hover tooltip (Preact). Click sets `transitTargetId`. MAP button in cockpit opens it.
**Test:** Click MAP → overlay. Hover shows tooltip.

---

### Step 21 Tech upgrades apply to live ship

**Files:** `src/entities/Ship.ts`, `src/main.ts`
**What:** On each upgrade change, re-calculate ship stats: `trajSteps`, `autoStab`, `thrustFactor`, `maxFuel`, etc. Call `ship.onUpgradeChanged(upgrades)`.
**Test:** Stats update immediately in HUD after purchase/refund.

---

### Step 22 Visual Evolution: Sprite variations

**Files:** `src/entities/Ship.ts`
**What:** In `Ship.draw()`, use `drawProbeDynamic(ctx, t, size, upgrades)` from `src/sprites/probe.ts`. Implement an `onUpgradeChanged` handler (or re-render on demand) to update an offscreen canvas caching the probe sprite, passing the mapped tech tree state (hull, thrust, ergol, rcs, avionics) into the `ProbeUpgrades` interface.
**Test:** Buying upgrades visibly changes the ship's sprite. Refunding them reverts appearance.

---

## Verification checklist (run at the end)

1. Orbit stable: coast 60 s without input, Pe/Ap don't drift.
2. Pe ▼ / Ap ▲ / encounter ◆ / escape green all visible on trajectory.
3. Prograde marker tracks velocity, retrograde is opposite, radial-in points at BH.
4. PRO heading lock auto-rotates ship to prograde. Rotation key disengages.
5. DOCK MODE: arrows translate, angular damping holds heading.
6. Dock completes: parts granted, system marked complete.
7. Decay bar: hidden in SOL-0, visible + depleting in high-tidal config.
8. Transit: fly out → coast → new system fades in.
9. Guide MFD approach steps tick off in order during a real rendezvous.
10. MAP shows systems, click sets transit target. TECH shows nodes, purchase applies live.
