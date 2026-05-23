# CLAUDE.md 2D Galaxy / Signal Relay

## Project

Vite + TypeScript browser game. Physics sim: Canvas2D (BH/ship/UI) + WebGL (stars). Converting a sandbox into a structured career game called **Signal Relay**. Design authority: `docs/GAMEPLAY.md`.

## Run

```
pnpm dev             # dev server on :5174
npx tsc --noEmit     # type-check only
```

## Active objective

Implement `.claude/Plan.md` one atomic step at a time.

**Shortcut:** type `/step` it runs the full sequence below automatically.

**Manual sequence:**

1. Read `.claude/plan_state.json` → find the first entry where `status === "pending"`. That is the current step.
2. Read `.claude/Plan.md` → find `### Step N` for that number. Extract **Files**, **What**, **Test**.
3. Implement only **What** (≤ 2 files, ≤ 80 lines delta).
4. `npx tsc --noEmit` must be clean. (Hook runs this automatically after each edit check output.)
5. Use chrome-devtools to navigate to `http://localhost:5174` and screenshot. Verify the **Test** criterion.
6. Commit (see Git workflow). Update `plan_state.json`: set `status` to `"done"`.
7. Stop do not start the next step.

**Context window near full?** Type `/handoff` to generate a machine-readable resume document.

## Git workflow

- Format: `feat: short description`
- Backdate 3 h before push: `GIT_AUTHOR_DATE="…T10:00:00" GIT_COMMITTER_DATE="…T10:00:00" git commit -m "…"`
- Push immediately: `git push origin main:master`
- Before staging: `git ls-files .claude` must return nothing never commit `.claude/`

## Code style

- No comments unless the WHY is non-obvious
- No abstractions beyond what the step requires
- No `any`, strict TypeScript
- No error handling for impossible cases

## File map

| Path                          | Purpose                                                  | Git |
| ----------------------------- | -------------------------------------------------------- | --- |
| `docs/GAMEPLAY.md`            | Authoritative game design overrides Plan.md on conflicts | ✓   |
| `.claude/Plan.md`             | 21-step spec with test criteria per step                 | ✗   |
| `.claude/plan_state.json`     | Machine-readable step tracker (status: pending/done)     | ✗   |
| `.claude/commands/step.md`    | `/step` slash command                                    | ✗   |
| `.claude/commands/handoff.md` | `/handoff` slash command                                 | ✗   |
| `README.md`                   | Project overview                                         | ✓   |

## Source map

| Path                        | Responsibility                              |
| --------------------------- | ------------------------------------------- |
| `src/core/`                 | Vec2, Color, types, utilities               |
| `src/entities/Ship.ts`      | Player physics, trajectory prediction, draw |
| `src/entities/BlackHole.ts` | BH entity, gravity source                   |
| `src/entities/Star.ts`      | WebGL star particle                         |
| `src/systems/Galaxy.ts`     | Simulation orchestrator owns all entities   |
| `src/systems/Camera.ts`     | World↔screen transform                      |
| `src/ui/CockpitHUD.ts`      | Right-side cockpit panel                    |
| `src/ui/MFD.ts`             | Multi-function display                      |
| `src/ui/LandingPage.ts`     | Start screen                                |

## Memory

`/Users/tod/.claude/projects/-Users-tod-Desktop-Projets-Perso-2d-galaxy/memory/MEMORY.md`
