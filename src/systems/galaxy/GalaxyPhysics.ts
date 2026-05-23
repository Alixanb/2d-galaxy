import BlackHole from "../../entities/BlackHole";
import Ship from "../../entities/Ship";
import Star from "../../entities/Star";
import RelayStation from "../../entities/RelayStation";
import FuelDepot from "../../entities/FuelDepot";

export class GalaxyPhysics {
  updateStars(stars: Star[], blackholes: BlackHole[], dt: number): number {
    let maxVel = 0;
    for (let star of stars) {
      star.update(blackholes, dt);
      if (star.vel.length() > maxVel) {
        maxVel = star.vel.length();
      }
    }
    return maxVel;
  }

  updateEntities(dt: number, ship: Ship | undefined, fuelDepots: FuelDepot[], relayStations: RelayStation[], dockedRelays: Set<RelayStation>, onDock: (relay: RelayStation) => void) {
    for (const depot of fuelDepots) {
      depot.update(dt);
      if (ship && ship.pos.distance(depot.pos) < depot.collectRadius) {
        ship.collectFuel(depot.type, depot.amount);
        depot.collected = true;
      }
    }

    for (const relay of relayStations) {
      relay.update(dt);
      if (ship && !dockedRelays.has(relay)) {
        const dist = ship.pos.distance(relay.pos);
        const relVelX = -Math.sin(relay.orbitAngle) * relay.orbitRadius * relay.orbitSpeed;
        const relVelY = Math.cos(relay.orbitAngle) * relay.orbitRadius * relay.orbitSpeed;
        const relSpeed = Math.hypot(ship.vel.x - relVelX, ship.vel.y - relVelY);
        if (dist < relay.completionRadius && relSpeed < 0.0002) {
          dockedRelays.add(relay);
          onDock(relay);
        }
      }
    }
  }
}
