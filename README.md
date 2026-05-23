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

This project uses [Claude Code](https://claude.ai/code) with an atomic step methodology.

**The rule:** one feature at a time, visual test before every commit.

1. Open `.claude/Plan.md` — find the first unchecked step `[ ]`
2. Implement only that step (≤ 2 files touched)
3. `npx tsc --noEmit` must pass
4. Verify the step's **Test** criterion in the browser (`pnpm dev`)
5. Commit, check the box `[x]`, push
6. Repeat

Claude entry point: `CLAUDE.md` (auto-loaded each session, not committed).

**Why atomic steps?** A previous attempt implemented 10 phases (~2000 lines) without testing. Three silent bugs survived `tsc`: broken orbit physics, unwired UI buttons, wrong game state. All reverted. Atomic steps + visual tests prevent this class of failure.
