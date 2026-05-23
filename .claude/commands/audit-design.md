Ensure the codebase strictly adheres to the authoritative game design document.

## Process

1. **Read Sources:** Read `docs/GAMEPLAY.md` (the source of truth) and the relevant implementation files (e.g., `src/data/systems.ts`, `src/core/GameState.ts`, `src/ui/TechTree.ts`).
2. **Cross-Reference Systems:** Verify that all 10 systems in the code exactly match the design document regarding:
   - System Name
   - Tidal Rating (None, Low, Med, High, Extreme)
   - Parts Reward amount
   - General layout constraints (number of black holes)
3. **Cross-Reference Tech Tree:** Verify that all tech tree nodes match the design document regarding:
   - Node Name
   - Cost (Parts)
   - Prerequisites/Dependencies
   - Exact mechanical effect (e.g., Max LE +100, Thrust +20%)
4. **Output Report:** List any discrepancies found. If discrepancies exist, prompt the user asking if you should update the code to match the design document, or if the design document should be updated to reflect the code. Do not make changes automatically.
