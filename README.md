# Signal Relay

2D gravity simulation game built with Vite + TypeScript. You pilot a probe through blackhole systems, rendezvous with orbital relay stations, and earn upgrades to reach harder systems.

## Run

```bash
pnpm i
pnpm dev
```

## Stack

- **Vite + TypeScript** — strict mode
- **Canvas2D** — ship, blackholes, UI overlays
- **WebGL** — star field (custom shader)

## Project structure

```
src/
├── core/        # types, Vec2, Color, utilities
├── data/        # system configs (10 BH systems)
├── entities/    # Ship, Star, BlackHole, RelayStation
├── systems/     # Galaxy (simulation loop), Camera, Canvas
└── ui/          # CockpitHUD, MFD, GalaxyMap, TechTree, LandingPage
docs/
└── GAMEPLAY.md  # full game design spec
```

## Development workflow (Claude Code)

Type `/step` in Claude Code to implement the next step automatically (tsc + visual verify + commit).

Or manually: find the first `[ ]` in `.claude/Plan.md`, implement it (≤ 2 files), pass `npx tsc --noEmit`, verify in the browser, commit, push.
