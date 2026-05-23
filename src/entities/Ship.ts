import Vec2 from "../core/Vec2";
import type { Canvas2d } from "../systems/Canvas";
import type { HeadingLockMode, UpgradeState } from "../core/GameState";
import { getMaxLE, getMaxMono, getThrustFactor, getRCSFactor } from "../core/GameState";
import BlackHole from "./BlackHole";
import RelayStation from "./RelayStation";
import { ShipNavigator } from "./ship/ShipNavigator";
import { ShipControls } from "./ship/ShipControls";
import { ShipRenderer } from "./ship/ShipRenderer";

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
  targetRelay?: RelayStation;
  systemBoundaryRadius: number = 1.0;
  headingLock: HeadingLockMode = 'manual';
  headingLockTier: 0 | 1 | 2 | 3 = 2;
  dockingMode: boolean = false;
  rcsForward: number = 0;
  rcsSideways: number = 0;

  private navigator: ShipNavigator;
  private controls: ShipControls;
  private renderer: ShipRenderer;

  constructor(
    pos: Vec2,
    spriteIdle: HTMLImageElement,
    spriteThrusting: HTMLImageElement,
    size: number,
    showPath: boolean = false,
    blackholes: BlackHole[],
  ) {
    this.pos = pos;
    this.sprites = { idle: spriteIdle, thrusting: spriteThrusting };
    this.size = size;
    this.showPath = showPath;
    this.blackholes = blackholes;

    this.spritesWidthRatio["idle"] = spriteIdle.height / spriteIdle.width;
    this.spritesWidthRatio["thrusting"] = spriteThrusting.height / spriteThrusting.width;

    this.navigator = new ShipNavigator(this);
    this.controls = new ShipControls(this);
    this.renderer = new ShipRenderer(this, this.navigator);
  }

  get path() { return this.navigator.path; }
  get pe() { return this.navigator.pe; }
  get ap() { return this.navigator.ap; }
  get encounterPoint() { return this.navigator.encounterPoint; }
  get escapeTrajectory() { return this.navigator.escapeTrajectory; }
  get escapeStepIndex() { return this.navigator.escapeStepIndex; }

  draw(canvas: Canvas2d) {
    this.renderer.draw(canvas);
  }

  update(dt: number) {
    this.updateThrustPower();
    
    if (!this.dockingMode) {
      this.updateRadialPower();
      this.handleStandardInput(dt);
    }

    this.applyAutoStab(dt);
    this.handleRetrograde(dt);
    this.updateHeadingLock(dt);
    
    if (this.dockingMode) {
      this.updateDockingMode(dt);
    }

    this.clampResources();
    this.applyPhysics(dt);

    if (this.showPath) {
      this.navigator.predictPath(dt, this.pos, this.vel, this.blackholes, this.targetRelay, this.systemBoundaryRadius);
    }
  }

  private updateThrustPower() {
    if (this.controls.isPressed("z")) {
      Ship.THRUSTPOWER = Math.min(Ship.DEFAULT_THRUSTPOWER * 5, Ship.THRUSTPOWER + Ship.DEFAULT_THRUSTPOWER * 0.05);
    }
    if (this.controls.isPressed("s")) {
      Ship.THRUSTPOWER = Math.max(0, Ship.THRUSTPOWER - Ship.DEFAULT_THRUSTPOWER * 0.05);
    }
    this.thrusterPct = Ship.THRUSTPOWER / Ship.DEFAULT_THRUSTPOWER;
  }

  private updateRadialPower() {
    if (this.controls.isPressed("e")) {
      Ship.RADIALPOWER = Math.min(Ship.DEFAULT_RADIALPOWER * 5, Ship.RADIALPOWER + Ship.DEFAULT_RADIALPOWER * 0.05);
    }
    if (this.controls.isPressed("q")) {
      Ship.RADIALPOWER = Math.max(0, Ship.RADIALPOWER - Ship.DEFAULT_RADIALPOWER * 0.05);
    }
  }

  private handleStandardInput(dt: number) {
    if (this.controls.isPressed("ArrowRight") && this.monergol > 0 && Ship.RADIALPOWER > 0) {
      this.angluarVel += Ship.RADIALPOWER;
      this.monergol -= Ship.MONERGOL_RATE * dt;
      this.headingLock = 'manual';
    }
    if (this.controls.isPressed("ArrowLeft") && this.monergol > 0 && Ship.RADIALPOWER > 0) {
      this.angluarVel -= Ship.RADIALPOWER;
      this.monergol -= Ship.MONERGOL_RATE * dt;
      this.headingLock = 'manual';
    }

    if (this.controls.isPressed("ArrowUp") && this.liquidErgol > 0) {
      this.status = "thrusting";
      const ax = Ship.THRUSTPOWER * Math.sin(this.angle);
      const ay = -Ship.THRUSTPOWER * Math.cos(this.angle);
      this.vel = this.vel.add(new Vec2(ax, ay));
      this.liquidErgol -= Ship.LIQUID_ERGOL_RATE * dt;
    } else {
      this.status = "idle";
    }
  }

  private applyAutoStab(dt: number) {
    if (this.autoStab && !this.dockingMode && !this.controls.isPressed("ArrowRight") && !this.controls.isPressed("ArrowLeft") && !this.retrogradeActive && this.headingLock === 'manual') {
      if (this.monergol > 0 && Math.abs(this.angluarVel) > 0) {
        const safeRad = Math.max(Ship.RADIALPOWER, Ship.DEFAULT_RADIALPOWER * 0.1);
        const damping = Math.min(Math.abs(this.angluarVel), safeRad);
        this.angluarVel -= damping * Math.sign(this.angluarVel);
        this.monergol -= Ship.MONERGOL_RATE * dt;
      }
    }
  }

  private handleRetrograde(dt: number) {
    if (!this.retrogradeActive) return;
    
    const speed = this.vel.length();
    if (speed < 0.000025) {
      this.retrogradeActive = false;
      this.retrogradePhase = null;
      this.vel = new Vec2(0, 0);
      return;
    }

    const targetAngle = Math.atan2(-this.vel.x, this.vel.y);
    let angleDiff = targetAngle - this.angle;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    if (this.retrogradePhase === "align" && this.monergol > 0 && Ship.RADIALPOWER > 0) {
      if (Math.abs(angleDiff) < 0.05) {
        this.angle = targetAngle;
        this.angluarVel = 0;
        this.retrogradePhase = "burn";
      } else {
        this.angluarVel = Math.sign(angleDiff) * Math.min(0.1, Ship.RADIALPOWER * 20);
        this.monergol -= Ship.MONERGOL_RATE * dt * 2;
      }
    }

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

  private updateHeadingLock(dt: number): void {
    if (this.headingLock === 'manual' || this.monergol <= 0 || this.retrogradeActive || Ship.RADIALPOWER <= 0) return;
    
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
    
    if (Math.abs(diff) < 0.01) { 
      this.angle = targetAngle; 
      this.angluarVel = 0; 
      return; 
    }
    
    const maxSpeed = Math.max(Ship.RADIALPOWER, Ship.DEFAULT_RADIALPOWER) * 20;
    const rate = Math.sign(diff) * Math.min(Math.abs(diff), maxSpeed);
    
    this.angluarVel = rate;
    this.monergol -= Ship.MONERGOL_RATE * dt;
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

    if (this.controls.isPressed("ArrowUp") && this.monergol > 0) {
      this.vel = this.vel.add(new Vec2(fwdX * t, fwdY * t));
      this.monergol -= Ship.MONERGOL_RATE * dt;
      this.rcsForward = 1;
      this.status = "thrusting";
    } else if (this.controls.isPressed("ArrowDown") && this.monergol > 0) {
      this.vel = this.vel.add(new Vec2(-fwdX * t, -fwdY * t));
      this.monergol -= Ship.MONERGOL_RATE * dt;
      this.rcsForward = -1;
    }
    
    if (this.controls.isPressed("ArrowRight") && this.monergol > 0) {
      this.vel = this.vel.add(new Vec2(rgtX * t, rgtY * t));
      this.monergol -= Ship.MONERGOL_RATE * dt;
      this.rcsSideways = 1;
    } else if (this.controls.isPressed("ArrowLeft") && this.monergol > 0) {
      this.vel = this.vel.add(new Vec2(-rgtX * t, -rgtY * t));
      this.monergol -= Ship.MONERGOL_RATE * dt;
      this.rcsSideways = -1;
    }

    const rotRate = Math.max(Ship.RADIALPOWER, Ship.DEFAULT_RADIALPOWER) * 8;
    if (this.controls.isPressed("e") && this.monergol > 0 && Ship.RADIALPOWER > 0) {
      this.angluarVel = rotRate;
      this.monergol -= Ship.MONERGOL_RATE * dt;
      this.headingLock = 'manual';
    }
    if (this.controls.isPressed("q") && this.monergol > 0 && Ship.RADIALPOWER > 0) {
      this.angluarVel = -rotRate;
      this.monergol -= Ship.MONERGOL_RATE * dt;
      this.headingLock = 'manual';
    }
    
    if (this.headingLock === 'manual' && !this.controls.isPressed("q") && !this.controls.isPressed("e") && Math.abs(this.angluarVel) > 0 && this.monergol > 0) {
      const safeRad = Math.max(Ship.RADIALPOWER, Ship.DEFAULT_RADIALPOWER * 0.1);
      const damping = Math.min(Math.abs(this.angluarVel), safeRad);
      this.angluarVel -= damping * Math.sign(this.angluarVel);
      this.monergol -= Ship.MONERGOL_RATE * dt;
    }
  }

  applyUpgrades(u: UpgradeState): void {
    this.maxLiquidErgol = getMaxLE(u);
    this.maxMonergol = getMaxMono(u);
    this.autoStab = u.autoStab;
    this.headingLockTier = u.headingLockTier;
    Ship.THRUSTPOWER = Ship.DEFAULT_THRUSTPOWER * getThrustFactor(u) * 5;
    Ship.RADIALPOWER = Ship.DEFAULT_RADIALPOWER * (getRCSFactor(u) / 0.4);
  }

  collectFuel(type: "liquid-ergol" | "monergol", amount: number): void {
    if (type === "liquid-ergol") {
      this.liquidErgol = Math.min(this.maxLiquidErgol, this.liquidErgol + amount);
    } else {
      this.monergol = Math.min(this.maxMonergol, this.monergol + amount);
    }
  }

  private clampResources() {
    this.liquidErgol = Math.max(0, Math.min(this.maxLiquidErgol, this.liquidErgol));
    this.monergol = Math.max(0, Math.min(this.maxMonergol, this.monergol));
  }

  private applyPhysics(dt: number) {
    this.vel = this.vel.add(this.navigator.getGravityVelocity(dt, this.pos, this.blackholes));
    this.pos = this.pos.add(this.vel);
    this.angle += this.angluarVel;
    while (this.angle > Math.PI) this.angle -= 2 * Math.PI;
    while (this.angle < -Math.PI) this.angle += 2 * Math.PI;
  }
}
