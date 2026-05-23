import Vec2 from "../../core/Vec2";
import Galaxy from "../../systems/Galaxy";
import Star from "../Star";
import BlackHole from "../BlackHole";
import RelayStation from "../RelayStation";
import Ship from "../Ship";

export interface EncounterPoint {
  worldPos: Vec2;
  dist: number;
  timeToReach: number;
}

export interface OrbitPoint {
  worldPos: Vec2;
  dist: number;
}

export class ShipNavigator {
  path: Vec2[] = [];
  pe: OrbitPoint | null = null;
  ap: OrbitPoint | null = null;
  encounterPoint: EncounterPoint | null = null;
  escapeTrajectory: boolean = false;
  escapeStepIndex: number = -1;

  maxSteps: number = 100;

  constructor(_ship: Ship) {}

  getGravityVelocity(dt: number, pos: Vec2, blackholes: BlackHole[]) {
    let addedVelocities = new Vec2();

    for (let blackhole of blackholes) {
      const distance = pos.distance(blackhole.pos);
      const forceMagnitude = Galaxy.G * (blackhole.mass / distance ** 2) * Star.kGravity * 3; // 3 is Ship.MASS

      const directionX = (blackhole.pos.x - pos.x) / distance;
      const directionY = (blackhole.pos.y - pos.y) / distance;

      const forceVector = new Vec2(
        directionX * forceMagnitude,
        directionY * forceMagnitude,
      ).clamp(-0.4, 0.4);

      addedVelocities = addedVelocities.add(forceVector);
    }

    return addedVelocities.multiply(dt);
  }

  predictPath(dt: number, pos: Vec2, vel: Vec2, blackholes: BlackHole[], targetRelay?: RelayStation, boundaryRadius: number = 1.0) {
    let curPos = pos.clone();
    let curVel = vel.clone();
    this.path = [];
    this.pe = null;
    this.ap = null;
    this.encounterPoint = null;
    this.escapeTrajectory = false;
    this.escapeStepIndex = -1;
    let encMinDist = Infinity;
    let encIdx = -1;

    const bh0c = blackholes[0];
    let totalAngle = 0;
    let previousAngle = bh0c ? Math.atan2(curPos.y - bh0c.pos.y, curPos.x - bh0c.pos.x) : 0;
    for (let i = 0; i < this.maxSteps; i++) {
      let minDist = Infinity;
      for (const bh of blackholes) {
        const d = curPos.distance(bh.pos);
        if (d < minDist) minDist = d;
      }

      const sub = minDist < 0.04 ? 80 : minDist < 0.12 ? 40 : minDist < 0.3 ? 15 : 4;
      const subDt = dt / sub;

      for (let s = 0; s < sub; s++) {
        curVel = curVel.add(this.getGravityVelocity(subDt, curPos, blackholes));
        curPos = curPos.add(curVel.multiply(1 / sub));
      }

      this.path.push(curPos.clone());

      if (targetRelay) {
        const relayPos = targetRelay.projectPosition(i, dt);
        const d = curPos.distance(relayPos);
        if (d < encMinDist) { encMinDist = d; encIdx = i; }
      }

      if (bh0c) {
        const currentAngle = Math.atan2(curPos.y - bh0c.pos.y, curPos.x - bh0c.pos.x);
        let deltaAngle = currentAngle - previousAngle;
        while (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
        while (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
        totalAngle += deltaAngle;
        previousAngle = currentAngle;

        if (Math.abs(totalAngle) >= 2 * Math.PI - 0.05) break;

        const distToPrimary = curPos.distance(bh0c.pos);
        if (!this.escapeTrajectory && distToPrimary > boundaryRadius) {
          this.escapeTrajectory = true;
          this.escapeStepIndex = i;
        }

        if (this.escapeTrajectory && distToPrimary > boundaryRadius * 1.5) break;
      }
    }

    if (targetRelay && encIdx >= 0 && encMinDist < 0.10) {
      this.encounterPoint = { worldPos: this.path[encIdx], dist: encMinDist, timeToReach: encIdx * dt };
    }

    if (bh0c && this.path.length > 0) {
      let peIdx = 0, apIdx = 0, minD = Infinity, maxD = 0;
      for (let i = 0; i < this.path.length; i++) {
        const d = this.path[i].distance(bh0c.pos);
        if (d < minD) { minD = d; peIdx = i; }
        if (d > maxD) { maxD = d; apIdx = i; }
      }
      this.pe = { worldPos: this.path[peIdx], dist: minD };
      this.ap = { worldPos: this.path[apIdx], dist: maxD };
    }
  }
}
