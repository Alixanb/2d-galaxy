import type { TidalRating } from '../core/GameState';

export interface SystemConfig {
  id: string;
  name: string;
  bhCount: number;
  bhMass: number;
  tidalRating: TidalRating;
  relayCount: number;
  relayOrbitRadius: number;
  hullRequired: number;
  partsReward: number;
  systemBoundaryRadius: number;
  mapPos: [number, number];
}

export const SYSTEMS: SystemConfig[] = [
  { id: 'SOL-0',       name: 'SOL-0',       bhCount: 1, bhMass: 80,   tidalRating: 'None',    relayCount: 1, relayOrbitRadius: 0.50, hullRequired: 0, partsReward: 2,  systemBoundaryRadius: 1.5, mapPos: [0.10, 0.50] },
  { id: 'ECHO-1',      name: 'ECHO-1',      bhCount: 1, bhMass: 150,  tidalRating: 'None',    relayCount: 1, relayOrbitRadius: 0.25, hullRequired: 0, partsReward: 3,  systemBoundaryRadius: 1.5, mapPos: [0.30, 0.50] },
  { id: 'DRIFT-2',     name: 'DRIFT-2',     bhCount: 1, bhMass: 10,   tidalRating: 'None',    relayCount: 1, relayOrbitRadius: 0.40, hullRequired: 0, partsReward: 3,  systemBoundaryRadius: 1.5, mapPos: [0.10, 0.70] },
  { id: 'VOID-4',      name: 'VOID-4',      bhCount: 1, bhMass: 400,  tidalRating: 'Low',     relayCount: 1, relayOrbitRadius: 0.20, hullRequired: 1, partsReward: 4,  systemBoundaryRadius: 2.0, mapPos: [0.30, 0.70] },
  { id: 'TWIN-I',      name: 'TWIN-I',      bhCount: 2, bhMass: 300,  tidalRating: 'Low',     relayCount: 1, relayOrbitRadius: 0.35, hullRequired: 1, partsReward: 4,  systemBoundaryRadius: 2.0, mapPos: [0.50, 0.40] },
  { id: 'TIDE-5',      name: 'TIDE-5',      bhCount: 1, bhMass: 700,  tidalRating: 'Medium',  relayCount: 1, relayOrbitRadius: 0.18, hullRequired: 2, partsReward: 5,  systemBoundaryRadius: 2.0, mapPos: [0.50, 0.60] },
  { id: 'TWIN-II',     name: 'TWIN-II',     bhCount: 2, bhMass: 500,  tidalRating: 'Medium',  relayCount: 1, relayOrbitRadius: 0.22, hullRequired: 2, partsReward: 5,  systemBoundaryRadius: 2.5, mapPos: [0.70, 0.40] },
  { id: 'TRIAD-I',     name: 'TRIAD-I',     bhCount: 3, bhMass: 400,  tidalRating: 'Medium',  relayCount: 3, relayOrbitRadius: 0.28, hullRequired: 2, partsReward: 6,  systemBoundaryRadius: 2.5, mapPos: [0.80, 0.30] },
  { id: 'DEEP-8',      name: 'DEEP-8',      bhCount: 1, bhMass: 1500, tidalRating: 'High',    relayCount: 1, relayOrbitRadius: 0.12, hullRequired: 3, partsReward: 7,  systemBoundaryRadius: 3.0, mapPos: [0.80, 0.70] },
  { id: 'SINGULARITY', name: 'SINGULARITY', bhCount: 1, bhMass: 3000, tidalRating: 'Extreme', relayCount: 1, relayOrbitRadius: 0.08, hullRequired: 3, partsReward: 10, systemBoundaryRadius: 3.0, mapPos: [0.95, 0.70] },
];
