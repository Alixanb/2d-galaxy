import type { GameMode, GameState } from "./GameState";

const KEY = (mode: GameMode) => `signal-relay-save-${mode}`;

export function loadSave(mode: GameMode): GameState | null {
  const raw = localStorage.getItem(KEY(mode));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState): void {
  localStorage.setItem(KEY(state.mode), JSON.stringify(state));
}
