# Plan: SIGNAL RELAY Full Gameplay Integration

## Progress read this first

| #   | Step                                                  | Status |
| --- | ----------------------------------------------------- | ------ |
| 1   | Fix orbit integration bug                             | `[ ]`  |
| 2   | Data layer: GameState + 10 systems                    | `[ ]`  |
| 3   | Landing page: 3 mode buttons                          | `[ ]`  |
| 4   | Wire GameState into main.ts + remove floating windows | `[ ]`  |
| 5   | Sim speed fader + pause button in cockpit             | `[ ]`  |
| 6   | RelayStation entity + Galaxy spawning                 | `[ ]`  |
| 7   | Pe/Ap markers on trajectory                           | `[ ]`  |
| 8   | Encounter marker                                      | `[ ]`  |
| 9   | Escape trajectory coloring                            | `[ ]`  |
| 10  | Orientation ring (visual, always on)                  | `[ ]`  |
| 11  | Heading lock                                          | `[ ]`  |
| 12  | Docking mode (4-axis RCS)                             | `[ ]`  |
| 13  | Dock detection + parts reward                         | `[ ]`  |
| 14  | Tidal decay timer                                     | `[ ]`  |
| 15  | Inter-system transit                                  | `[ ]`  |
| 16  | MFD Guide view Approach tab                           | `[ ]`  |
| 17  | MFD Guide view Escape tab                             | `[ ]`  |
| 18  | MFD Approach view                                     | `[ ]`  |
| 19  | Galaxy Map overlay                                    | `[ ]`  |
| 20  | Tech Tree overlay                                     | `[ ]`  |
| 21  | Tech upgrades apply to live ship                      | `[ ]`  |
| 22  | Visual Evolution: Sprite variations                   | `[ ]`  |

---

## Context

The game is a working sandbox gravity simulation. This plan converts it into a structured career game: 10 fixed blackhole systems of escalating difficulty, a relay-station rendezvous as the core objective each system, a tech tree gated by earned "parts", tidal shielding as a hard gate on harder systems, heading-lock orientation modes (auto-rotation toward prograde/retrograde/radial), fully-simulated inter-system transit, Tutorial + Approach MFD screens, Pe/Ap + encounter orbital markers, docking mode with 4-axis RCS, and a redesigned landing page. Two floating UI windows are deleted.

Reference document: `GAMEPLAY.md` authoritative on all game design decisions.

---

## Key Design Clarification: Visual Markers vs Heading Lock

Orbital markers (prograde ⊙, retrograde ⊙, radial ⊙, anti-radial ⊙) are **always drawn on canvas** around the ship no unlock required. Without them, "burn prograde at Pe" is unactionable.

The **heading lock unlock** only grants the _automation_ ship auto-rotates to face the selected mode (costs monergol). The visual markers exist from the first frame regardless of tech tree state.

---

## Rules for each iteration

- One step at a time. Do not start the next step until the current one is tested in the browser.
- Each step touches at most 2 files.
- After each step: `tsc --noEmit` clean, then visual test, then commit.
- Never commit without launching `npm run dev` and verifying the test criterion.

---

## Implementation Atomic Steps

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

### Step 16 MFD Guide view Approach tab

**Files:** `src/ui/MFD.ts`
**What:** Add "guide" view accessible via OSB. APPROACH tab: 5-step checklist. Step done-state computed from MFDData each update: (1) `shipPe > 0.03`, (2) `|shipAp − relayOrbitRadius| / relayOrbitRadius < 0.15`, (3) `encounterDist < 0.08`, (4) `relayRelSpeed < 0.005`, (5) `dockingMode || relayRange < 0.05`. Active step highlighted, done steps dim/strikethrough. Status line shows current value for active step.
**Test:** View shows correct step highlighted. Establish orbit → step 1 ticks off. Etc.

---

### Step 17 MFD Guide view Escape tab

**Files:** `src/ui/MFD.ts`
**What:** Add ESCAPE tab to guide view: 4-step checklist: (1) heading within 10° of prograde, (2) `escapeTrajectory` true, (3) escape + not thrusting, (4) coast to boundary. Tab auto-switches: near relay (encounterDist < 0.15) = APPROACH, otherwise = ESCAPE. Manual tab toggle via OSB.
**Test:** Far from relay → escape tab active. Point prograde → step 1 ticks. Burn until green → step 2 ticks.

---

### Step 18 MFD Approach view

**Files:** `src/ui/MFD.ts`, `src/main.ts`, `src/entities/Ship.ts`
**What:** Add "approach" view: shows REL SPEED, CLOSING RATE, RANGE, RCS bars (FWD/AFT and L/R using ASCII bar `[══●══════]`), DOCK MODE status. Main.ts passes `relayRelSpeed`, `relayRange`, `rcsForward`, `rcsSideways`, `dockingMode` to `cockpit.update()`. Ship already tracks `rcsForward`/`rcsSideways`.
**Test:** In docking mode near relay → see live relative speed, range, and RCS bars moving with input.

---

### Step 19 Galaxy Map overlay

**Files:** `src/ui/GalaxyMap.ts` (new), `src/ui/CockpitHUD.ts`, `src/style.css`
**What:** Canvas overlay (fixed, full-screen, z-index 500). Draw 10 system nodes at fixed normalized positions, connection lines (dim if locked), tidal color coding. Hover tooltip: name, BH count, tidal rating, parts reward. Click unlocked non-current system → set `transitTargetId` and close. MAP button in cockpit opens it. Uses `GameState` to know unlocked/completed/current.
**Test:** Click MAP → overlay. See all nodes. Hover shows tooltip. Click accessible neighbor → closes, sets target.

---

### Step 20 Tech Tree overlay

**Files:** `src/ui/TechTree.ts` (new), `src/ui/CockpitHUD.ts`, `src/style.css`
**What:** DOM overlay. All 25 nodes from GAMEPLAY.md tree in a grid (cross-nodes span both columns). Node states: locked (dim, no click), available (clickable), done (green check). Click available node → deduct parts, apply upgrade to `UpgradeState`, re-render. TECH button in cockpit opens it. Parts counter in header.
**Test:** Click TECH → overlay shows nodes. With 0 parts nothing is buyable. With parts: buy AUTO-STAB → node turns green, cockpit AUTO-STAB button activates.

---

### Step 21 Tech upgrades apply to live ship

**Files:** `src/ui/TechTree.ts`, `src/entities/Ship.ts`
**What:** On each unlock, apply to live ship via an `onUpgrade()` callback from main.ts: `trajSteps`, `autoStab`, heading lock tier (ungray buttons), `maxLiquidErgol`, `maxMonergol`, thrust/RCS factors. Ship reads its own caps from the same `UpgradeState` reference (passed at construction or via setter). Heading lock buttons in cockpit auto-gray/ungray based on `headingLockTier`.
**Test:** Buy PROGRADE LOCK → PRO/RET buttons activate immediately. Buy L-ERGOL I → fuel cap increases (visible in gauge).

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
