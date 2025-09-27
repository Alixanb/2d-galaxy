import Color from "../core/Color";
import { benchmark } from "../core/Utils";
import Vec2 from "../core/Vec2";
import Canvas from "../systems/Canvas";
import Galaxy from "../systems/Galaxy";
import BlackHole from "./BlackHole";
import Star from "./Star";

type PathElement = {
  pos: Vec2;
  color: Color;
};

export type ShipStatus = "idle" | "thrusting";
export type SpriteStatusKey<T> = {
  [key in ShipStatus]: T;
};

export default class Ship {
  static THRUSTPOWER = 10e-5;
  static RADIALPOWER = 0.002;
  static MASS = 3;

  size: number;
  pos: Vec2;
  vel: Vec2 = new Vec2();

  keys: { [key: string]: boolean } = {};
  blackholes: BlackHole[];
  sprites: SpriteStatusKey<HTMLImageElement>;
  status: ShipStatus = "idle";
  angle: number = 0; // en radian
  angluarVel: number = 0;
  spritesWidthRatio: SpriteStatusKey<number> = { idle: 0, thrusting: 0 }; // ratio [idle, thrusting]
  showPath: boolean;
  path: Vec2[] = [];
  pathColor = new Color(30, 255, 117);
  predictionInteration: number = 3000;

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
    });

    document.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });
  }

  draw(canvas: Canvas) {
    const screenPos = canvas.place(this.pos);

    const width = this.size;
    const height = this.size * this.spritesWidthRatio[this.status];

    canvas.context.save();
    canvas.context.translate(screenPos.x, screenPos.y - height);
    canvas.context.rotate(this.angle);

    canvas.context.drawImage(
      this.sprites[this.status],
      -width / 2,
      -height / 2,
      width,
      height
    );

    canvas.context.restore();
    this.drawPath(canvas);
  }

  update(dt: number) {
    if (this.keys["ArrowRight"]) {
      this.angluarVel += Ship.RADIALPOWER;
    }
    if (this.keys["ArrowLeft"]) this.angluarVel -= Ship.RADIALPOWER;

    if (this.keys["ArrowUp"]) {
      this.status = "thrusting";

      const ax = Ship.THRUSTPOWER * Math.sin(this.angle);
      const ay = -Ship.THRUSTPOWER * Math.cos(this.angle);

      this.vel = this.vel.add(new Vec2(ax, ay));
    } else {
      this.status = "idle";
    }

    this.vel = this.vel.add(this.getVelocity(dt));
    this.pos = this.pos.add(this.vel);
    this.angle += this.angluarVel;

    this.predictPath(this.predictionInteration, dt);
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

      if (
        directionX * forceMagnitude > 0.2 ||
        directionY * forceMagnitude > 0.2
      ) {
        console.log(directionX * forceMagnitude, directionY * forceMagnitude);
      }

      addedVelocities = addedVelocities.add(forceVector);
    }

    return addedVelocities.multiply(dt);
  }

  predictPath(steps: number, dt: number) {
    let pos = this.pos.clone();
    let vel = this.vel.clone();
    this.path = [];

    for (let i = 0; i < steps; i++) {
      const force = this.getVelocity(dt, pos);

      vel = vel.add(force);
      pos = pos.add(vel);

      this.path.push(pos.clone());
    }
  }

  drawPath(canvas: Canvas) {
    const initPos = canvas.place(this.path[0]);

    canvas.context.beginPath();
    canvas.context.moveTo(initPos.x, initPos.y);
    for (let point of this.path) {
      const pos = canvas.place(point);
      canvas.context.lineTo(pos.x, pos.y);
    }
    canvas.context.strokeStyle = this.pathColor.getRGBA();
    canvas.context.lineWidth = 4;
    canvas.context.stroke();

    benchmark(this.predictPath.bind(this), 10000);
  }
}
