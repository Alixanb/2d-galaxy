# Gameplay Design — SIGNAL RELAY

## Lore

The Relay Network is an ancient mesh of communication buoys orbiting blackhole systems across the sector. Each relay station uses the intense gravitational frame-dragging of a blackhole as a quantum timing anchor — the only way to synchronize message timestamps across light-years.

You are **COURIER-7**, an autonomous probe with a degraded memory core and a dwindling fuel supply. Your task: physically carry encrypted signal packets to each relay station to keep the network alive. No one knows who sends the messages, or why they must be delivered in person. You fly because the network demands it.

**Maneuvre**: \
So at the start of the game the player:

1\. Sees a prograde marker on screen

2\. Manually rotates until their ship nose points at it

3\. Burns

After unlocking heading lock:

1\. Clicks PRO button

2\. Ship auto-aligns

---

## Game Modes

| Mode     | Name            | Failure state                            | Tutorial MFD |
| -------- | --------------- | ---------------------------------------- | ------------ |
| Career   | **RELAY**       | Respawn at last docked relay, keep parts | ✓ available  |
| Creative | **FREE FLIGHT** | None — sandbox                           | ✓ available  |
| Hardcore | **DEAD SIGNAL** | Run out of fuel = game over, no respawn  | ✗ never      |

---

## Starting Conditions (RELAY / DEAD SIGNAL)

| System                | Start     | Max (fully upgraded)         |
| --------------------- | --------- | ---------------------------- |
| Thrust                | 20%       | 100%                         |
| Liquid Ergol tank     | 100       | 500                          |
| RCS power             | 40%       | 100%                         |
| Monergol tank         | 40        | 100                          |
| Tidal Shielding       | 0         | III                          |
| Auto-Stab             | ✗ locked  | ✓ unlock                     |
| Retro Burn            | ✗ locked  | ✓ unlock                     |
| MFD slots             | 1         | 2                            |
| Tutorial MFD          | ✓ free    | — (locked in DEAD SIGNAL)    |
| Approach MFD          | ✗ locked  | ✓ unlock                     |
| Heading Lock          | ✗ locked  | prograde → radial → maneuver |
| Trajectory prediction | 100 steps | 5000 steps                   |

---

## Core Gameplay Loop

```
GALAXY MAP
    │
    ▼
SELECT TARGET SYSTEM
(shown on map with BH count, gravity class, tidal rating)
    │
    ▼
INTER-SYSTEM BURN (fully simulated)
(escape current gravity well — burn prograde until trajectory line turns green)
    │
    ▼  void corridor — no gravity, pure inertia
    ▼
ENTER NEW SYSTEM
(BHs fade in, gravity resumes — entry velocity matters)
    │
    ▼
RENDEZVOUS WITH RELAY STATION
(moving target orbiting the BH — Pe/Ap markers + encounter indicator)
    │
    ▼
DOCK
(deliver signal packet — short lore message, earn parts)
    │
    ▼
REFUEL AT DEPOT (optional, depots orbit the system)
    │
    ▼
SPEND PARTS IN TECH TREE
    │
    ▼
GALAXY MAP → next system
```

---

## System Map

10 fixed systems, arranged as a directed graph. Further = harder. Not procedurally generated.

### Connection graph

```
SOL-0 ──────── ECHO-1 ──────── TWIN-I ─────── TWIN-II ─── TRIAD-I
  │               │                │                          │
DRIFT-2 ──── VOID-4 ──────────────┘ TIDE-5 ────────────────┘
                                                               │
                                                          DEEP-8 ─── SINGULARITY
```

### System definitions

| ID          | BH  | Gravity  | Tidal Rating | Relay speed | Hull req | Notes                                         |
| ----------- | --- | -------- | ------------ | ----------- | -------- | --------------------------------------------- |
| SOL-0       | 1   | Very Low | None         | Slow        | —        | Tutorial. First system.                       |
| ECHO-1      | 1   | Low      | None         | Medium      | —        | First rendezvous skill check.                 |
| DRIFT-2     | 1   | Near-0   | None         | Very slow   | —        | Pure RCS/finesse, almost no gravity.          |
| VOID-4      | 1   | Medium   | Low          | Fast        | I        | First tidal threat. Hull I required.          |
| TWIN-I      | 2   | Medium   | Low          | Medium      | I        | Figure-8 gravity zone.                        |
| TIDE-5      | 1   | High     | Medium       | Fast        | II       | Relay in tight orbit. Hull II required.       |
| TWIN-II     | 2   | High     | Medium       | Fast        | II       | Chaotic dual-BH field.                        |
| TRIAD-I     | 3   | High     | Medium       | Variable    | II       | 3 relays, deliver to all 3.                   |
| DEEP-8      | 1   | Extreme  | High         | Very fast   | III      | Hull III required or timer &lt; 60s.          |
| SINGULARITY | 1   | Extreme+ | Extreme      | Near-event  | III      | Final system. Full upgrades strongly advised. |

### System map screen

- 2D node graph, visible connections as lines.
- Locked systems shown as dim nodes (hull requirement not met).
- Hover a node to see: BH count, gravity class, tidal rating, parts earned on first dock.
- Map is accessible via a cockpit button; **simulation time continues** (ship drifts). Player can pause with the pause button.

---

## Tidal Shielding (Decay Mechanic)

Blackhole systems emit intense tidal forces. Without adequate shielding, the probe's hull decays.

### How it works

- Each system has a **Tidal Rating**: None / Low / Medium / High / Extreme.
- The ship has a **Tidal Shielding** level: 0 / I / II / III.
- If `system.tidalRating > ship.tidalShielding`, a **decay timer** activates on entry.
- The bigger the gap, the shorter the timer.

| Gap      | Timer    | Notes                                    |
| -------- | -------- | ---------------------------------------- |
| 1 level  | \~5 min  | Tight but doable                         |
| 2 levels | \~90 sec | Very difficult, requires tight execution |
| 3 levels | \~30 sec | Near-impossible, effectively gated       |

- Timer is shown as a red countdown bar on the HUD, pulsing when &lt; 30s.
- In **DEAD SIGNAL**: timer reaches 0 = game over. In **RELAY**: you're ejected back to the system entry point.
- In **DEAD SIGNAL**: docking magnetism radius is 50% smaller (harder to catch the relay).
- In **FREE FLIGHT**: no decay, shielding is irrelevant.

---

## Inter-System Travel (Fully Simulated)

The trip between systems is simulated in real physics — no loading screen, no teleport.

### Escape phase

- Burn **prograde** until the trajectory prediction line turns **green** (escape trajectory).
- "Green" means the predicted path no longer curves back toward the BH.
- Tutorial MFD (ESCAPE mode) walks through this step by step.
- When the ship crosses the **system boundary radius**, BHs in the current system begin fading (gravity smoothly goes to 0 over \~2 seconds).

### Void corridor

- Ship drifts at constant velocity — pure inertia, no forces.
- Stars in the background are sparser (deep space feel).
- Galaxy map remains accessible. Ship position is shown between source and target systems.
- Time can be accelerated by the sim speed control.

### Entry phase

- As the ship approaches the target system's **entry radius**, new BHs fade in and gravity resumes.
- Entry velocity matters: arriving too fast requires a hard brake burn, arriving slowly gives more control.
- The trajectory line re-activates once BH gravity is strong enough to bend it.

### System world positions

- Each system has an abstract position in "map space" (not simulation space).
- The Galaxy class supports a `transitionToSystem(config)` method that swaps BH positions and properties without reloading.
- All coordinates are local to the current system center — transit is handled by a `transitMode` flag that disables gravity.

---

## Rendezvous System

### Orbit indicators (always visible when relay is present)

- **Pe marker** ▼: minimum distance from BH in predicted path
- **Ap marker** ▲: maximum distance from BH in predicted path
- **Relay orbit ring**: faint circle at the relay's orbital radius
- **Encounter marker** ◆: shown when closest approach &lt; 0.10 wu — displays range and time to encounter

### Approach steps (used in Tutorial MFD)

**Step 1 — Raise Apoapsis to relay altitude**Burn prograde at Pe. Ap marker climbs. Done when Ap ≈ relay orbit radius ±10%.

**Step 2 — Wait for encounter**Encounter marker ◆ appears. Coasting phase — no burn needed. Done when encounter range &lt; 0.08 wu.

**Step 3 — Circularize / match velocity**Burn retrograde at encounter point to shed relative speed. Done when relative speed &lt; docking threshold → docking mode activates.

---

## Heading Lock (Orientation Modes)

Like KSP's heading lock modes. When active, the ship auto-rotates to face the chosen reference direction (uses monergol).

| Mode        | Icon | Direction                    | Unlock tier |
| ----------- | ---- | ---------------------------- | ----------- |
| Manual      | —    | Player-controlled            | Always      |
| Prograde    | ⊙→   | Velocity vector direction    | Tier 2      |
| Retrograde  | ⊙←   | Opposite velocity vector     | Tier 2      |
| Radial In   | ⊙↓   | Toward nearest BH            | Tier 3      |
| Anti-Radial | ⊙↑   | Away from nearest BH         | Tier 3      |
| Maneuver    | ⊙△   | Toward planned maneuver node | Tier 4      |

- Heading lock button group appears in the cockpit Flight Ctrl section (replaces manual rotation only when locked).
- Pressing a rotation key while locked disengages lock (falls back to manual).
- Lock uses monergol continuously while correcting.

---

## Docking

### Approach

When ship enters **docking range** (≤ 0.05 wu from relay), docking mode activates automatically. Can also be toggled manually from the cockpit FLIGHT CTRL section at any time.

### Docking Mode

- Main engine (ArrowUp) **disabled**.
- RCS becomes **4-axis translation**:
  - ArrowUp / ArrowDown → forward / backward translation (monergol)
  - ArrowLeft / ArrowRight → lateral translation (monergol)
  - Q / E → rotation (monergol)
- Angular damping always on — ship holds angle.
- HUD automatically switches to Approach MFD.
- A **docking magnet** pulls the relay slightly toward the ship once within 0.02 wu (reduced by 50% in DEAD SIGNAL).

### Dock completion

- Relative speed &lt; 0.0002 wu/s AND range &lt; 0.012 wu.
- Triggers delivery animation, lore message, parts grant.

---

## MFD Screens

### Tutorial MFD (free in RELAY / FREE FLIGHT, locked in DEAD SIGNAL)

Two manual buttons at the top: `[ APPROACH ]` and `[ ESCAPE ]`. Auto-switches based on context (near a relay = APPROACH, far from relay = ESCAPE).

Each mode shows a numbered checklist. Completed steps are crossed out with a dim color.

```
╔══════════════════════════════╗
║  NAV GUIDE        [APPROACH] ║
╠══════════════════════════════╣
║  ✓ 1. Establish orbit        ║
║  ► 2. Raise Ap to relay alt  ║
║    3. Wait for encounter ◆   ║
║    4. Burn retro at encounter ║
║    5. Activate docking mode   ║
╠══════════════════════════════╣
║  NEXT: Raise Ap to 0.18 wu   ║
║  CURRENT Ap: 0.09 wu         ║
╚══════════════════════════════╝
```

```
╔══════════════════════════════╗
║  NAV GUIDE         [ESCAPE]  ║
╠══════════════════════════════╣
║  ✓ 1. Point prograde         ║
║  ► 2. Burn until line green  ║
║    3. Cut engine             ║
║    4. Wait for system entry  ║
╠══════════════════════════════╣
║  TRAJECTORY: BOUND           ║
║  Burn for: ~8s more          ║
╚══════════════════════════════╝
```

### Approach MFD (unlockable — Tier 3)

High-refresh every frame. Shows relative motion data during docking.

```
╔══════════════════════════════╗
║  APPROACH                    ║
╠══════════════════════════════╣
║  REL. SPEED   0.042 wu/s     ║
║  CLOSING      ▼  0.018 wu/s  ║
║  RANGE        0.031 wu       ║
╠══════════════════════════════╣
║  RCS THRUST                  ║
║   FWD/AFT   [══●══════]  +2  ║
║   L/R       [═══════●══]  -4 ║
╠══════════════════════════════╣
║  DOCKING MODE  ■ ACTIVE      ║
╚══════════════════════════════╝
```

---

## Tech Tree

Single interweaved tree. PROPULSION nodes (left) and SYSTEMS nodes (right) alternate, with cross-nodes between tiers that require one from each side. Unlock cost in **parts**.

```
                        ┌──── ROOT ────┐
                        │              │
              [THRUST I — 1p]    [AUTO-STAB — 1p]
                    │      \    /      │
                    │    [HULL I — 2p] │           ← cross-node: tidal tier I
                    │      /    \      │
           [L-ERGOL I — 1p]    [PROGRADE LOCK — 1p]
                    │      \    /      │
                    │   [TRAJ 500 — 1p]│           ← cross-node
                    │      /    \      │
           [THRUST II — 1p]    [RETRO BURN — 2p]
                    │      \    /      │
                    │    [HULL II — 2p]│           ← cross-node: tidal tier II
                    │      /    \      │
        [RCS BOOST I — 1p]    [APPROACH MFD — 1p]
                    │      \    /      │
                    │   [TRAJ 1K — 2p] │           ← cross-node
                    │      /    \      │
           [L-ERGOL II — 2p]  [RADIAL LOCK — 2p]
                    │      \    /      │
                    │  [EMERG RES — 2p]│           ← cross-node: 50 L-Ergol on dock
                    │      /    \      │
          [THRUST III — 2p]    [2ND MFD SLOT — 2p]
                    │      \    /      │
                    │    [HULL III — 3p]            ← cross-node: tidal tier III
                    │      /    \      │
        [RCS BOOST II — 2p]  [MANEUVER NODE — 3p]
                    │      \    /      │
                    │   [TRAJ 5K — 2p] │           ← cross-node
                    │      /    \      │
      [MONO TANK II — 2p]   [TIDAL SENSOR — 2p]   ← shows decay overlay on map
                    │      \    /      │
           [THRUST IV — 3p]   [L-ERGOL III — 3p]
```

### Node descriptions

| Node          | Parts | Effect                                                            |
| ------------- | ----- | ----------------------------------------------------------------- |
| THRUST I      | 1     | Thrust 40%                                                        |
| AUTO-STAB     | 1     | Angular velocity damping toggle                                   |
| HULL I        | 2     | Tidal Shielding I — unlocks systems with Low tidal rating         |
| L-ERGOL I     | 1     | +100 tank capacity (200 total)                                    |
| PROGRADE LOCK | 1     | Heading lock: prograde + retrograde modes                         |
| TRAJ 500      | 1     | Trajectory prediction 500 steps                                   |
| THRUST II     | 1     | Thrust 60%                                                        |
| RETRO BURN    | 2     | Auto retrograde burn system (requires Auto-Stab + Prograde Lock)  |
| HULL II       | 2     | Tidal Shielding II — unlocks systems with Medium tidal rating     |
| RCS BOOST I   | 1     | RCS power 60%                                                     |
| APPROACH MFD  | 1     | Unlocks Approach MFD screen                                       |
| TRAJ 1K       | 2     | Trajectory prediction 1000 steps                                  |
| L-ERGOL II    | 2     | +150 tank capacity (350 total)                                    |
| RADIAL LOCK   | 2     | Heading lock: radial + anti-radial modes (requires Prograde Lock) |
| EMERG RES     | 2     | Receive 50 bonus L-Ergol on each successful dock                  |
| THRUST III    | 2     | Thrust 80%                                                        |
| 2ND MFD SLOT  | 2     | Two MFDs visible simultaneously                                   |
| HULL III      | 3     | Tidal Shielding III — unlocks systems with High/Extreme tidal     |
| RCS BOOST II  | 2     | RCS power 80%                                                     |
| MANEUVER NODE | 3     | Place delta-V nodes on trajectory; heading lock: maneuver mode    |
| TRAJ 5K       | 2     | Trajectory prediction 5000 steps                                  |
| MONO TANK II  | 2     | +40 monergol capacity (100 total)                                 |
| TIDAL SENSOR  | 2     | Map overlay showing decay timer preview before entering system    |
| THRUST IV     | 3     | Thrust 100%                                                       |
| L-ERGOL III   | 3     | +150 tank capacity (500 total)                                    |

---

## UI Changes

### Remove

- Floating spawn window (add stars button) — feature removed entirely.
- Floating sim speed window — class removed.

### Add to cockpit panel

- **Sim Speed fader** — added to the existing DRIVE SYS section of the cockpit.
- **Pause button** — global pause toggle in cockpit header area.
- **DOCKING MODE button** — in FLIGHT CTRL section alongside AUTO-STAB and RETRO BURN.
- **Heading Lock buttons** — group of 5 buttons in FLIGHT CTRL: MANUAL / PRO / RETRO / RAD / MNV. Locked ones grayed out until node is purchased.
- **Decay timer bar** — appears in SHIP STATUS section when tidal threat is active, red + pulsing.
- **MAP button** — opens galaxy map overlay (simulation continues, pause separately).
- **TECH TREE button** — opens tech tree overlay (simulation continues).

---

## Technical Fixes Required

### 1. Orbit drift (precision bug)

Current Euler integration accumulates error on coasting orbits near a BH. **Fix**: switch to **Velocity Verlet** integration. Apply gravity force at the midpoint of the step (or apply before position update, not after). Also increase sub-step count when within 0.3 wu of any BH.

### 2. Pe / Ap markers from trajectory array

- Pe = path point with minimum `pos.distance(bh.pos)`
- Ap = path point with maximum `pos.distance(bh.pos)`
- Draw small ▼ and ▲ glyphs at those world positions on the canvas
- Trajectory must be long enough to show a full orbit — increase minimum to 2000 steps for rendezvous context

### 3. Docking mode RCS translation

Ship currently has only angular velocity. Need `translationVel: Vec2` on Ship, applied every frame when `dockingMode = true`. Arrow keys become translation axes. Monergol consumption same rate.

### 4. Inter-system transit mode

- `Galaxy` gains a `transitMode: boolean` flag.
- In transit mode: BH array is empty, gravity loop skips, background renders as void.
- `transitionToSystem(config: SystemConfig)` fades in new BHs over \~2s.
- `systemBoundaryRadius` per system — exit triggers transit mode start.
- Ship world position is preserved throughout (no coordinate reset).

### 5. Heading Lock system

- `Ship` gains `headingLock: HeadingLockMode | null`.
- Each frame in `update()`: if lock is active, compute target angle (prograde = `atan2(vel.x, -vel.y)`, retrograde = +π, radial = toward BH, etc.) and apply angular impulse toward it (uses monergol).
- Pressing a rotation key sets `headingLock = null`.
