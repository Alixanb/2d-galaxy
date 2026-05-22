import Color from "../core/Color";
import Vec2 from "../core/Vec2";
import type { Canvas2d } from "../systems/Canvas";
import Galaxy from "../systems/Galaxy";
import BlackHole from "./BlackHole";
import Star from "./Star";

export type ShipStatus = "idle" | "thrusting";
export type SpriteStatusKey<T> = {
  [key in ShipStatus]: T;
};

export default class Ship {
  static DEFAULT_THRUSTPOWER = 10e-5;
  static THRUSTPOWER = 10e-5;
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
  retrogradePhase: 'align' | 'burn' | null = null;
  path: Vec2[] = [];
  pathColor = new Color(80, 182, 201); // cyan #50b6c9
  predictionInteration: number = 1000;

  constructor(
    pos: Vec2,
    spriteIdle: HTMLImageElement,
    spriteThrusting: HTMLImageElement,
    size: number,
    showPath: boolean = false,
    blackholes: BlackHole[]
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
      height
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
    if (cosT > 1e-4)  t = Math.min(t,  (W / 2 - margin) / cosT);
    if (cosT < -1e-4) t = Math.min(t, -(W / 2 - margin) / cosT);
    if (sinT > 1e-4)  t = Math.min(t,  (H / 2 - margin) / sinT);
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
      Ship.THRUSTPOWER = Math.min(Ship.DEFAULT_THRUSTPOWER * 5, Ship.THRUSTPOWER + Ship.DEFAULT_THRUSTPOWER * 0.05);
    }
    if (this.keys["s"]) {
      Ship.THRUSTPOWER = Math.max(0, Ship.THRUSTPOWER - Ship.DEFAULT_THRUSTPOWER * 0.05);
    }
    if (this.keys["e"]) {
      Ship.RADIALPOWER = Math.min(Ship.DEFAULT_RADIALPOWER * 5, Ship.RADIALPOWER + Ship.DEFAULT_RADIALPOWER * 0.05);
    }
    if (this.keys["q"]) {
      Ship.RADIALPOWER = Math.max(0, Ship.RADIALPOWER - Ship.DEFAULT_RADIALPOWER * 0.05);
    }

    this.thrusterPct = Ship.THRUSTPOWER / Ship.DEFAULT_THRUSTPOWER;

    // RCS rotation — consumes monergol
    if (this.keys["ArrowRight"] && this.monergol > 0) {
      this.angluarVel += Ship.RADIALPOWER;
      this.monergol -= Ship.MONERGOL_RATE * dt;
    }
    if (this.keys["ArrowLeft"] && this.monergol > 0) {
      this.angluarVel -= Ship.RADIALPOWER;
      this.monergol -= Ship.MONERGOL_RATE * dt;
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

    // Auto-stab — consumes monergol only while actively damping
    if (this.autoStab && !this.keys["ArrowRight"] && !this.keys["ArrowLeft"] && !this.retrogradeActive) {
      if (this.monergol > 0 && Math.abs(this.angluarVel) > 0.00005) {
        this.angluarVel *= 0.88;
        this.monergol -= 0.5 * dt;
      } else if (Math.abs(this.angluarVel) <= 0.00005) {
        this.angluarVel = 0;
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
        if (this.retrogradePhase === 'align' && this.monergol > 0) {
          if (Math.abs(angleDiff) < 0.05) {
            this.angle = targetAngle;
            this.angluarVel = 0;
            this.retrogradePhase = 'burn';
          } else {
            this.angluarVel = Math.sign(angleDiff) * 0.04;
            this.monergol -= Ship.MONERGOL_RATE * dt;
          }
        }

        // Burn phase — requires liquid ergol
        if (this.retrogradePhase === 'burn' && this.liquidErgol > 0) {
          this.angle = targetAngle;
          this.angluarVel = 0;
          const ax = Ship.THRUSTPOWER * Math.sin(this.angle);
          const ay = -Ship.THRUSTPOWER * Math.cos(this.angle);
          this.vel = this.vel.add(new Vec2(ax, ay));
          this.status = "thrusting";
          this.liquidErgol -= Ship.LIQUID_ERGOL_RATE * dt;
        }
      }
    }

    this.liquidErgol = Math.max(0, Math.min(this.maxLiquidErgol, this.liquidErgol));
    this.monergol = Math.max(0, Math.min(this.maxMonergol, this.monergol));

    this.vel = this.vel.add(this.getVelocity(dt));
    this.pos = this.pos.add(this.vel);
    this.angle += this.angluarVel;

    if (this.showPath) {
      this.predictPath(this.predictionInteration, dt);
    }
  }

  collectFuel(type: 'liquid-ergol' | 'monergol', amount: number): void {
    if (type === 'liquid-ergol') {
      this.liquidErgol = Math.min(this.maxLiquidErgol, this.liquidErgol + amount);
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
        directionY * forceMagnitude
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

    for (let i = 0; i < steps; i++) {
      let minDist = Infinity;
      for (const bh of this.blackholes) {
        const d = pos.distance(bh.pos);
        if (d < minDist) minDist = d;
      }

      const sub = minDist < 0.04 ? 80
                : minDist < 0.12 ? 40
                : minDist < 0.30 ? 15
                : 4;

      const subDt = dt / sub;
      for (let s = 0; s < sub; s++) {
        vel = vel.add(this.getVelocity(subDt, pos));
        pos = pos.add(new Vec2(vel.x / sub, vel.y / sub));
      }

      this.path.push(pos.clone());
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
      ctx.strokeStyle = `rgb(${this.pathColor.r}, ${this.pathColor.g}, ${this.pathColor.b})`;

      const from = canvas.place(this.path[i]);
      const to = canvas.place(this.path[Math.min(i + segmentSize, total - 1)]);

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }

    ctx.restore();
  }
}
