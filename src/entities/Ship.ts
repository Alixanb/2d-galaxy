import Color from "../core/Color";
import Vec2 from "../core/Vec2";
import type { Canvas2d } from "../systems/Canvas";
import type { HeadingLockMode } from "../core/GameState";
import Galaxy from "../systems/Galaxy";
import BlackHole from "./BlackHole";
import RelayStation from "./RelayStation";
import Star from "./Star";

export type ShipStatus = "idle" | "thrusting";
export type SpriteStatusKey<T> = {
  [key in ShipStatus]: T;
};

export default class Ship {
  static DEFAULT_THRUSTPOWER = 50e-7;
  static THRUSTPOWER = 50e-7;
  static DEFAULT_RADIALPOWER = 0.002;
  static RADIALPOWER = 0.002;
  static MASS = 3;
  static LIQUID_ERGOL_RATE = 10;
  static MONERGOL_RATE = 3;

  size: number;
  pos: Vec2;
  vel: Vec2 = new Vec2();
  thrusterPct: number = 0;

  liquidErgol: number = 400;
  maxLiquidErgol: number = 500;
  monergol: number = 80;
  maxMonergol: number = 100;

  keys: { [key: string]: boolean } = {};
  blackholes: BlackHole[];
  sprites: SpriteStatusKey<HTMLImageElement>;
  status: ShipStatus = "idle";
  angle: number = 0;
  angluarVel: number = 0;
  spritesWidthRatio: SpriteStatusKey<number> = { idle: 0, thrusting: 0 };
  showPath: boolean;
  autoStab: boolean = false;
  retrogradeActive: boolean = false;
  retrogradePhase: "align" | "burn" | null = null;
  path: Vec2[] = [];
  pathColor = new Color(80, 182, 201); // cyan #50b6c9
  predictionInteration: number = 2000;
  pe: { worldPos: Vec2; dist: number } | null = null;
  ap: { worldPos: Vec2; dist: number } | null = null;
  targetRelay?: RelayStation;
  encounterPoint: { worldPos: Vec2; dist: number; timeToReach: number } | null = null;
  escapeTrajectory: boolean = false;
  escapeStepIndex: number = -1;
  systemBoundaryRadius: number = 1.0;
  headingLock: HeadingLockMode = 'manual';
  headingLockTier: 0 | 1 | 2 | 3 = 2;
  dockingMode: boolean = false;
  rcsForward: number = 0;
  rcsSideways: number = 0;

  constructor(
    pos: Vec2,
    spriteIdle: HTMLImageElement,
    spriteThrusting: HTMLImageElement,
    size: number,
    showPath: boolean = false,
    blackholes: BlackHole[],
  ) {
    this.pos = pos;

    this.sprites = {
      idle: spriteIdle,
      thrusting: spriteThrusting,
    };
    this.size = size;
    this.showPath = showPath;
    this.blackholes = blackholes;

    this.spritesWidthRatio["idle"] = spriteIdle.height / spriteIdle.width;
    this.spritesWidthRatio["thrusting"] =
      spriteThrusting.height / spriteThrusting.width;

    document.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
      this.keys[e.key.toLowerCase()] = true;
    });

    document.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  draw(canvas: Canvas2d) {
    const screenPos = canvas.place(this.pos);

    const width = this.size;
    const height = this.size * this.spritesWidthRatio["idle"];

    canvas.context.save();
    canvas.context.translate(screenPos.x, screenPos.y);
    canvas.context.rotate(this.angle);

    if (this.status === "thrusting") {
      this.drawThruster(canvas, width, height, this.thrusterPct);
    }

    canvas.context.drawImage(
      this.sprites["idle"],
      -width / 2,
      -height / 2,
      width,
      height,
    );

    canvas.context.restore();

    if (this.showPath) {
      this.drawPath(canvas);
    }

    this.drawOffscreenIndicator(canvas);
  }

  private drawOffscreenIndicator(canvas: Canvas2d) {
    const dpr = window.devicePixelRatio;
    const W = canvas.dimensions.x / dpr;
    const H = canvas.dimensions.y / dpr;
    const sp = canvas.place(this.pos);

    if (sp.x >= 0 && sp.x <= W && sp.y >= 0 && sp.y <= H) return;

    const margin = 40;
    const cx = W / 2;
    const cy = H / 2;
    const dx = sp.x - cx;
    const dy = sp.y - cy;
    const theta = Math.atan2(dy, dx);
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    let t = Infinity;
    if (cosT > 1e-4) t = Math.min(t, (W / 2 - margin) / cosT);
    if (cosT < -1e-4) t = Math.min(t, -(W / 2 - margin) / cosT);
    if (sinT > 1e-4) t = Math.min(t, (H / 2 - margin) / sinT);
    if (sinT < -1e-4) t = Math.min(t, -(H / 2 - margin) / sinT);

    const ex = cx + t * cosT;
    const ey = cy + t * sinT;

    const ctx = canvas.context;
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);

    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(theta);
    ctx.globalAlpha = 0.55 + 0.45 * pulse;
    ctx.fillStyle = "#3dff7a";
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#3dff7a";
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -7);
    ctx.lineTo(-8, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawThruster(canvas: Canvas2d, w: number, h: number, pct: number) {
    if (pct <= 0) return;
    const ctx = canvas.context;
    const rearY = h * 0.5;

    const flicker = 0.8 + Math.random() * 0.4;
    const tipY = rearY + w * 1.6 * pct * flicker;
    const sideW = w * 0.18 * (0.85 + Math.random() * 0.3);

    const grad = ctx.createLinearGradient(0, rearY, 0, tipY);
    grad.addColorStop(0, "rgba(233, 214, 40, 0.9)");
    grad.addColorStop(0.4, "rgba(236, 38, 38, 0.7)");
    grad.addColorStop(1, "rgba(236, 38, 38, 0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-sideW, rearY);
    ctx.lineTo(sideW, rearY);
    ctx.lineTo(0, tipY);
    ctx.closePath();
    ctx.fill();
  }

  update(dt: number) {
    if (this.keys["z"]) {
      Ship.THRUSTPOWER = Math.min(
        Ship.DEFAULT_THRUSTPOWER * 5,
        Ship.THRUSTPOWER + Ship.DEFAULT_THRUSTPOWER * 0.05,
      );
    }
    if (this.keys["s"]) {
      Ship.THRUSTPOWER = Math.max(
        0,
        Ship.THRUSTPOWER - Ship.DEFAULT_THRUSTPOWER * 0.05,
      );
    }
    if (this.keys["e"] && !this.dockingMode) {
      Ship.RADIALPOWER = Math.min(
        Ship.DEFAULT_RADIALPOWER * 5,
        Ship.RADIALPOWER + Ship.DEFAULT_RADIALPOWER * 0.05,
      );
    }
    if (this.keys["q"] && !this.dockingMode) {
      Ship.RADIALPOWER = Math.max(
        0,
        Ship.RADIALPOWER - Ship.DEFAULT_RADIALPOWER * 0.05,
      );
    }

    this.thrusterPct = Ship.THRUSTPOWER / Ship.DEFAULT_THRUSTPOWER;

    if (!this.dockingMode) {
      // RCS rotation — consumes monergol
      if (this.keys["ArrowRight"] && this.monergol > 0) {
        this.angluarVel += Ship.RADIALPOWER;
        this.monergol -= Ship.MONERGOL_RATE * dt;
        this.headingLock = 'manual';
      }
      if (this.keys["ArrowLeft"] && this.monergol > 0) {
        this.angluarVel -= Ship.RADIALPOWER;
        this.monergol -= Ship.MONERGOL_RATE * dt;
        this.headingLock = 'manual';
      }

      // Main engine — consumes liquid ergol
      if (this.keys["ArrowUp"] && this.liquidErgol > 0) {
        this.status = "thrusting";
        const ax = Ship.THRUSTPOWER * Math.sin(this.angle);
        const ay = -Ship.THRUSTPOWER * Math.cos(this.angle);
        this.vel = this.vel.add(new Vec2(ax, ay));
        this.liquidErgol -= Ship.LIQUID_ERGOL_RATE * dt;
      } else {
        this.status = "idle";
      }
    }

    // Auto-stab — consumes monergol only while actively damping
    if (
      this.autoStab &&
      !this.dockingMode &&
      !this.keys["ArrowRight"] &&
      !this.keys["ArrowLeft"] &&
      !this.retrogradeActive &&
      this.headingLock === 'manual'
    ) {
      if (this.monergol > 0 && Math.abs(this.angluarVel) > 0) {
        const damping = Math.min(Math.abs(this.angluarVel), Ship.RADIALPOWER);
        this.angluarVel -= damping * Math.sign(this.angluarVel);
        this.monergol -= (damping / Ship.RADIALPOWER) * Ship.MONERGOL_RATE * dt;
      }
    }

    if (this.retrogradeActive) {
      const speed = this.vel.length();
      if (speed < 0.000025) {
        this.retrogradeActive = false;
        this.retrogradePhase = null;
        this.vel = new Vec2(0, 0);
      } else {
        const targetAngle = Math.atan2(-this.vel.x, this.vel.y);
        let angleDiff = targetAngle - this.angle;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        // Align phase — requires monergol
        if (this.retrogradePhase === "align" && this.monergol > 0) {
          if (Math.abs(angleDiff) < 0.05) {
            this.angle = targetAngle;
            this.angluarVel = 0;
            this.retrogradePhase = "burn";
          } else {
            this.angluarVel = Math.sign(angleDiff) * 0.04;
            this.monergol -= Ship.MONERGOL_RATE * dt;
          }
        }

        // Burn phase — requires liquid ergol
        if (this.retrogradePhase === "burn" && this.liquidErgol > 0) {
          this.angle = targetAngle;
          this.angluarVel = 0;

          if (speed <= Ship.THRUSTPOWER) {
            const thrustFactor = speed / Ship.THRUSTPOWER;
            this.vel = new Vec2(0, 0);
            this.liquidErgol -= Ship.LIQUID_ERGOL_RATE * dt * thrustFactor;
            this.retrogradeActive = false;
            this.retrogradePhase = null;
            this.status = "idle";
          } else {
            const ax = Ship.THRUSTPOWER * Math.sin(this.angle);
            const ay = -Ship.THRUSTPOWER * Math.cos(this.angle);
            this.vel = this.vel.add(new Vec2(ax, ay));
            this.status = "thrusting";
            this.liquidErgol -= Ship.LIQUID_ERGOL_RATE * dt;
          }
        }
      }
    }

    this.updateHeadingLock(dt);
    if (this.dockingMode) this.updateDockingMode(dt);

    this.liquidErgol = Math.max(
      0,
      Math.min(this.maxLiquidErgol, this.liquidErgol),
    );
    this.monergol = Math.max(0, Math.min(this.maxMonergol, this.monergol));

    this.vel = this.vel.add(this.getVelocity(dt));
    this.pos = this.pos.add(this.vel);
    this.angle += this.angluarVel;

    if (this.showPath) {
      this.predictPath(this.predictionInteration, dt);
    }
  }

  private updateHeadingLock(dt: number): void {
    if (this.headingLock === 'manual' || this.monergol <= 0 || this.retrogradeActive) return;
    let targetAngle: number;
    const bh = this.blackholes[0];
    if (this.headingLock === 'prograde' || this.headingLock === 'retrograde') {
      if (this.vel.length() < 0.0001) return;
      const pro = Math.atan2(this.vel.x, -this.vel.y);
      targetAngle = this.headingLock === 'prograde' ? pro : pro + Math.PI;
    } else {
      if (!bh) return;
      const dx = bh.pos.x - this.pos.x;
      const dy = bh.pos.y - this.pos.y;
      const rdl = Math.atan2(dx, -dy);
      targetAngle = this.headingLock === 'radial' ? rdl : rdl + Math.PI;
    }
    let diff = targetAngle - this.angle;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    if (Math.abs(diff) < 0.005) { this.angle = targetAngle; this.angluarVel = 0; return; }
    const rate = Math.sign(diff) * Math.min(Math.abs(diff), Ship.RADIALPOWER);
    this.angluarVel = rate;
    this.monergol -= (Math.abs(rate) / Ship.RADIALPOWER) * Ship.MONERGOL_RATE * dt * 0.1;
  }

  private updateDockingMode(dt: number): void {
    this.rcsForward = 0;
    this.rcsSideways = 0;
    this.status = "idle";
    const t = Ship.THRUSTPOWER * 0.2;
    const fwdX = Math.sin(this.angle);
    const fwdY = -Math.cos(this.angle);
    const rgtX = Math.cos(this.angle);
    const rgtY = Math.sin(this.angle);

    if (this.keys["ArrowUp"] && this.monergol > 0) {
      this.vel = this.vel.add(new Vec2(fwdX * t, fwdY * t));
      this.monergol -= Ship.MONERGOL_RATE * dt;
      this.rcsForward = 1;
      this.status = "thrusting";
    } else if (this.keys["ArrowDown"] && this.monergol > 0) {
      this.vel = this.vel.add(new Vec2(-fwdX * t, -fwdY * t));
      this.monergol -= Ship.MONERGOL_RATE * dt;
      this.rcsForward = -1;
    }
    if (this.keys["ArrowRight"] && this.monergol > 0) {
      this.vel = this.vel.add(new Vec2(rgtX * t, rgtY * t));
      this.monergol -= Ship.MONERGOL_RATE * dt;
      this.rcsSideways = 1;
    } else if (this.keys["ArrowLeft"] && this.monergol > 0) {
      this.vel = this.vel.add(new Vec2(-rgtX * t, -rgtY * t));
      this.monergol -= Ship.MONERGOL_RATE * dt;
      this.rcsSideways = -1;
    }
    if (this.keys["e"] && this.monergol > 0) {
      this.angluarVel += Ship.RADIALPOWER;
      this.monergol -= Ship.MONERGOL_RATE * dt;
    }
    if (this.keys["q"] && this.monergol > 0) {
      this.angluarVel -= Ship.RADIALPOWER;
      this.monergol -= Ship.MONERGOL_RATE * dt;
    }
    if (!this.keys["q"] && !this.keys["e"] && Math.abs(this.angluarVel) > 0 && this.monergol > 0) {
      const damping = Math.min(Math.abs(this.angluarVel), Ship.RADIALPOWER);
      this.angluarVel -= damping * Math.sign(this.angluarVel);
      this.monergol -= (damping / Ship.RADIALPOWER) * Ship.MONERGOL_RATE * dt;
    }
  }

  collectFuel(type: "liquid-ergol" | "monergol", amount: number): void {
    if (type === "liquid-ergol") {
      this.liquidErgol = Math.min(
        this.maxLiquidErgol,
        this.liquidErgol + amount,
      );
    } else {
      this.monergol = Math.min(this.maxMonergol, this.monergol + amount);
    }
  }

  getVelocity(dt: number, pos: Vec2 = this.pos) {
    let addedVelocities = new Vec2();

    for (let blackhole of this.blackholes) {
      const distance = pos.distance(blackhole.pos);

      const forceMagnitude =
        Galaxy.G * (blackhole.mass / distance ** 2) * Star.kGravity * Ship.MASS;

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

  predictPath(steps: number, dt: number) {
    // Adaptive sub-stepping: use many fine steps when close to a black hole
    // (where the gravitational gradient is steep), fewer steps when far away.
    // Each sub-step applies force/sub and moves position by vel/sub,
    // keeping the total impulse per stored node the same while eliminating
    // the large positional jumps that cause jagged curves near singularities.
    let pos = this.pos.clone();
    let vel = this.vel.clone();
    this.path = [];
    this.pe = null;
    this.ap = null;
    this.encounterPoint = null;
    this.escapeTrajectory = false;
    this.escapeStepIndex = -1;
    let encMinDist = Infinity;
    let encIdx = -1;

    for (let i = 0; i < steps; i++) {
      let minDist = Infinity;
      for (const bh of this.blackholes) {
        const d = pos.distance(bh.pos);
        if (d < minDist) minDist = d;
      }

      const sub =
        minDist < 0.04 ? 80 : minDist < 0.12 ? 40 : minDist < 0.3 ? 15 : 4;

      const subDt = dt / sub;
      for (let s = 0; s < sub; s++) {
        vel = vel.add(this.getVelocity(subDt, pos));
        pos = pos.add(vel.multiply(1 / sub));
      }

      this.path.push(pos.clone());

      if (this.targetRelay) {
        const relayPos = this.targetRelay.projectPosition(i, dt);
        const d = pos.distance(relayPos);
        if (d < encMinDist) { encMinDist = d; encIdx = i; }
      }

      const bh0c = this.blackholes[0];
      if (!this.escapeTrajectory && bh0c && pos.distance(bh0c.pos) > this.systemBoundaryRadius) {
        this.escapeTrajectory = true;
        this.escapeStepIndex = i;
      }
    }

    if (this.targetRelay && encIdx >= 0 && encMinDist < 0.10) {
      this.encounterPoint = { worldPos: this.path[encIdx], dist: encMinDist, timeToReach: encIdx * dt };
    }

    const bh0 = this.blackholes[0];
    if (bh0 && this.path.length > 0) {
      let peIdx = 0,
        apIdx = 0,
        minD = Infinity,
        maxD = 0;
      for (let i = 0; i < this.path.length; i++) {
        const d = this.path[i].distance(bh0.pos);
        if (d < minD) {
          minD = d;
          peIdx = i;
        }
        if (d > maxD) {
          maxD = d;
          apIdx = i;
        }
      }
      this.pe = { worldPos: this.path[peIdx], dist: minD };
      this.ap = { worldPos: this.path[apIdx], dist: maxD };
    }
  }

  drawPath(canvas: Canvas2d) {
    if (this.path.length < 2) return;

    const ctx = canvas.context;
    const total = this.path.length;
    const segmentSize = Math.max(1, Math.floor(total / 200));

    ctx.save();
    ctx.lineWidth = 2;

    for (let i = 0; i < total - 1; i += segmentSize) {
      const alpha = 1 - i / total;
      ctx.globalAlpha = alpha * 0.8;
      const escaped = this.escapeTrajectory && i >= this.escapeStepIndex;
      ctx.strokeStyle = escaped ? "#3dff7a" : `rgb(${this.pathColor.r}, ${this.pathColor.g}, ${this.pathColor.b})`;

      const from = canvas.place(this.path[i]);
      const to = canvas.place(this.path[Math.min(i + segmentSize, total - 1)]);

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }

    ctx.restore();

    if (this.pe)
      this.drawOrbitalMarker(
        canvas,
        this.pe.worldPos,
        "▼",
        "rgba(236, 100, 100, 0.75)",
      );
    if (this.ap)
      this.drawOrbitalMarker(
        canvas,
        this.ap.worldPos,
        "▲",
        "rgba(233, 214, 40, 0.75)",
      );
    if (this.encounterPoint) {
      this.drawOrbitalMarker(canvas, this.encounterPoint.worldPos, "◆", "#50b6c9");
      const s = canvas.place(this.encounterPoint.worldPos);
      const ctx = canvas.context;
      ctx.save();
      ctx.fillStyle = "#50b6c9";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.globalAlpha = 0.85;
      ctx.fillText(this.encounterPoint.dist.toFixed(3) + " wu", s.x, s.y + 10);
      ctx.restore();
    }
  }

  private drawOrbitalMarker(
    canvas: Canvas2d,
    worldPos: Vec2,
    glyph: string,
    color: string,
  ): void {
    const s = canvas.place(worldPos);
    const ctx = canvas.context;
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(glyph, s.x, s.y);
    ctx.restore();
  }
}
