Audit the game's difficulty curve and resource economy.

## Process

1. **Read Data:** Read `src/data/systems.ts`, `src/core/GameState.ts`, and `docs/GAMEPLAY.md`.
2. **Calculate Requirements:** For each system, mathematically estimate the absolute minimum `delta-v` (and thus fuel/monergol) required to travel from the spawn point to the relay station, factoring in the system's gravity wells.
3. **Compare to Caps:** Compare these requirements against the maximum fuel and thrust capabilities allowed by the tech tree upgrades expected at that stage of the game.
4. **Identify Bottlenecks:** Flag any system where the required resources exceed 80% of the maximum available resources (a potential soft-lock) or 100% (a hard-lock/impossible level).
5. **Output Report:** Generate a Markdown table summarizing the analysis per system (System, Est. Fuel Needed, Max Fuel Available, Feasibility Status) and provide specific recommendations for tweaking `SystemConfig` values or upgrade caps to ensure a smooth difficulty curve.
