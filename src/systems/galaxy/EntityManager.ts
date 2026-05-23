import Vec2 from "../../core/Vec2";
import BlackHole from "../../entities/BlackHole";
import FuelDepot from "../../entities/FuelDepot";
import RelayStation from "../../entities/RelayStation";
import Star from "../../entities/Star";
import { type Canvas2d } from "../Canvas";
import type { TidalLevel } from "../../sprites/relay";

export class EntityManager {
  stars: Star[] = [];
  fuelDepots: FuelDepot[] = [];
  relayStations: RelayStation[] = [];
  totalStarsSpawned = 0;

  constructor() {}

  spawnRelays(blackholes: BlackHole[], count: number, orbitRadius: number, tidalLevel: TidalLevel = 0): void {
    const bh = blackholes[0];
    if (!bh) return;

    // Calculate circular orbit speed: v = sqrt(G_eff * M / r)
    // where G_eff = Galaxy.G * Star.kGravity
    const G_eff = 6.6743e-11 * (8.5 * 10e4);
    const orbitalVel = Math.sqrt((G_eff * bh.mass) / orbitRadius);
    const angularVel = orbitalVel / orbitRadius;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      // We use the calculated angularVel
      this.relayStations.push(new RelayStation(bh.pos, orbitRadius, angle, angularVel, tidalLevel));
    }
  }

  spawnFuelDepots(blackholes: BlackHole[]): void {
    if (blackholes.length === 0) return;

    for (let i = 0; i < 5; i++) {
      const bh = blackholes[i % blackholes.length];
      const radius = 0.12 + Math.random() * 0.28;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.15 + Math.random() * 0.10;
      this.fuelDepots.push(new FuelDepot(bh.pos, radius, angle, 'liquid-ergol', 100, speed));
    }

    for (let i = 0; i < 8; i++) {
      const bh = blackholes[i % blackholes.length];
      const radius = 0.08 + Math.random() * 0.22;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.30 + Math.random() * 0.20;
      this.fuelDepots.push(new FuelDepot(bh.pos, radius, angle, 'monergol', 25, speed));
    }
  }

  createStars(n: number, size: number, canvas2d: Canvas2d, blackholes: BlackHole[]) {
    for (let i = 0; i < n; i++) {
      const pos = canvas2d.randomCirclePosition(size);
      const sSize = Math.random() * Star.MAX_SIZE;
      const vel = blackholes.length > 0 
        ? Star.getVelocity(pos, blackholes[0])
        : new Vec2(0, 0);

      this.stars.push(new Star(pos, sSize, vel));
    }
    this.totalStarsSpawned += n;
  }

  addStarAt(worldPos: Vec2, blackholes: BlackHole[]) {
    const size = Math.random() * Star.MAX_SIZE;
    const vel = blackholes.length > 0
      ? Star.getVelocity(worldPos, blackholes[0])
      : new Vec2(0, 0);
    this.stars.push(new Star(worldPos, size, vel));
    this.totalStarsSpawned += 1;
  }
}
