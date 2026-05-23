export type GameMode = 'RELAY' | 'FREE_FLIGHT' | 'DEAD_SIGNAL';
export type TidalRating = 'None' | 'Low' | 'Medium' | 'High' | 'Extreme';
export type HeadingLockMode = 'manual' | 'prograde' | 'retrograde' | 'radial' | 'anti-radial' | 'maneuver';

export type UpgradeState = {
  parts: number;
  thrustLevel: 0 | 1 | 2 | 3 | 4;
  autoStab: boolean;
  hullLevel: 0 | 1 | 2 | 3;
  lErgolLevel: 0 | 1 | 2 | 3;
  headingLockTier: 0 | 1 | 2 | 3;
  trajSteps: 100 | 500 | 1000 | 5000;
  retroBurn: boolean;
  rcsBoostLevel: 0 | 1 | 2;
  approachMfd: boolean;
  emergRes: boolean;
  secondMfd: boolean;
  maneuverNode: boolean;
  monoTankII: boolean;
  tidalSensor: boolean;
};

export type GameState = {
  mode: GameMode;
  currentSystemId: string;
  completedSystems: string[];
  upgrades: UpgradeState;
  liquidErgol: number;
  monergol: number;
};

const LE_CAPS = [100, 200, 350, 500] as const;
const THRUST_PCTS = [0.2, 0.4, 0.6, 0.8, 1.0] as const;
const RCS_PCTS = [0.4, 0.6, 0.8] as const;

export function getMaxLE(u: UpgradeState): number { return LE_CAPS[u.lErgolLevel]; }
export function getMaxMono(u: UpgradeState): number { return u.monoTankII ? 100 : 60; }
export function getThrustFactor(u: UpgradeState): number { return THRUST_PCTS[u.thrustLevel]; }
export function getRCSFactor(u: UpgradeState): number { return RCS_PCTS[u.rcsBoostLevel]; }
export function canHeadingLock(u: UpgradeState, mode: HeadingLockMode): boolean {
  if (mode === 'manual') return true;
  if (mode === 'prograde' || mode === 'retrograde') return u.headingLockTier >= 1;
  if (mode === 'radial' || mode === 'anti-radial') return u.headingLockTier >= 2;
  return u.headingLockTier >= 3;
}

const START: UpgradeState = {
  parts: 0, thrustLevel: 0, autoStab: false, hullLevel: 0, lErgolLevel: 0,
  headingLockTier: 0, trajSteps: 100, retroBurn: false, rcsBoostLevel: 0,
  approachMfd: false, emergRes: false, secondMfd: false, maneuverNode: false,
  monoTankII: false, tidalSensor: false,
};

const MAX: UpgradeState = {
  parts: 0, thrustLevel: 4, autoStab: true, hullLevel: 3, lErgolLevel: 3,
  headingLockTier: 3, trajSteps: 5000, retroBurn: true, rcsBoostLevel: 2,
  approachMfd: true, emergRes: true, secondMfd: true, maneuverNode: true,
  monoTankII: true, tidalSensor: true,
};

export function createInitialState(mode: GameMode): GameState {
  return {
    mode,
    currentSystemId: 'SOL-0',
    completedSystems: [],
    upgrades: mode === 'FREE_FLIGHT' ? { ...MAX } : { ...START },
    liquidErgol: 100,
    monergol: 40,
  };
}
