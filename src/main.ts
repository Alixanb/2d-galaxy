const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

class Vec2 {
  x: number;
  y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  add(vec2: Vec2) {
    return new Vec2(this.x + vec2.x, this.y + vec2.y);
  }

  sub(vec2: Vec2) {
    return new Vec2(this.x - vec2.x, this.y - vec2.y);
  }

  multiply(scalar: number): Vec2;
  multiply(vec: Vec2): Vec2;

  multiply(arg: number | Vec2) {
    if (typeof arg === "number") {
      return new Vec2(this.x * arg, this.y * arg);
    }
    return new Vec2(this.x * arg.x, this.y * arg.y);
  }

  divide(scalar: number): Vec2;
  divide(vec: Vec2): Vec2;

  divide(arg: number | Vec2) {
    if (typeof arg === "number") {
      return new Vec2(this.x / arg, this.y / arg);
    }
    return new Vec2(this.x / arg.x, this.y / arg.y);
  }

  distance(vec: Vec2) {
    return Math.sqrt((vec.x - this.x) ** 2 + (vec.y - this.y) ** 2);
  }

  length() {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }

  normalize() {
    const len = this.length();
    if (len === 0) return new Vec2(0, 0);
    return new Vec2(this.x / len, this.y / len);
  }
}

class Canvas {
  element: HTMLCanvasElement;
  dimensions: Vec2;
  grid: number;
  ratio: Vec2;
  context: CanvasRenderingContext2D;

  constructor(ref: string, grid: number = 1) {
    const element = document.querySelector<HTMLCanvasElement>(ref);
    if (!element)
      throw new Error("Unable to fetch canvas element with string " + ref);

    this.element = element;

    const devicePixelRatio = window.devicePixelRatio || 1;
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;

    this.element.width = displayWidth * devicePixelRatio;
    this.element.height = displayHeight * devicePixelRatio;

    this.element.style.width = displayWidth + "px";
    this.element.style.height = displayHeight + "px";

    this.dimensions = new Vec2(this.element.width, this.element.height);
    this.grid = grid;
    this.ratio = this.dimensions.divide(grid);

    const context = this.element.getContext("2d");
    if (!context) throw new Error("Unable to get canvas context");

    context.scale(devicePixelRatio, devicePixelRatio);

    this.context = context;
  }

  place(vec: Vec2) {
    const normalizedX =
      ((vec.x + 1) / 2) * (this.dimensions.x / window.devicePixelRatio || 1);
    const normalizedY =
      ((vec.y + 1) / 2) * (this.dimensions.y / window.devicePixelRatio || 1);
    return new Vec2(normalizedX, normalizedY);
  }

  randomPosition() {
    return new Vec2(Math.random() * 2 - 1, Math.random() * 2 - 1);
  }
}

class Star {
  static kGravity = 5000;
  static kInitVelocity = 80;
  static MAX_VELOCITY = 0.005; // Theoretical max velocity for a star, color will be calculted depending on that

  pos: Vec2;
  vel: Vec2;
  size: number;
  mass: number;
  shouldDestroy: boolean = false;

  constructor(pos: Vec2, size: number = 5, vel: Vec2 = new Vec2()) {
    this.pos = pos;
    this.vel = vel;
    this.size = size;

    this.mass = size;
  }

  update(blackholes: BlackHole[]) {
    this.pos = this.pos.add(this.vel);

    for (let blackhole of blackholes) {
      const distance = this.pos.distance(blackhole.pos);

      if (distance > blackhole.size / 600) {
        const forceMagnitude =
          Galaxy.G * (blackhole.mass / distance ** 2) * Star.kGravity;

        const directionX = (blackhole.pos.x - this.pos.x) / distance;
        const directionY = (blackhole.pos.y - this.pos.y) / distance;

        const forceVector = new Vec2(
          directionX * forceMagnitude,
          directionY * forceMagnitude
        );

        this.vel = this.vel.add(forceVector);
      } else {
        this.shouldDestroy = true;
      }
    }
  }

  draw(canvas: Canvas) {
    const screenPos = canvas.place(this.pos);

    const glow = canvas.context.createRadialGradient(
      screenPos.x,
      screenPos.y,
      0,
      screenPos.x,
      screenPos.y,
      this.size
    );
    glow.addColorStop(0, Star.getColor(this.vel));
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");

    canvas.context.fillStyle = glow;
    canvas.context.beginPath();
    canvas.context.arc(screenPos.x, screenPos.y, this.size, 0, Math.PI * 2);
    canvas.context.fill();
  }

  static getColor(vel: Vec2): string {
    const COLOR_MULTIPLICATOR = 1;

    const value = clamp(
      Math.round(
        (vel.length() / this.MAX_VELOCITY) * 255 * COLOR_MULTIPLICATOR
      ),
      0,
      255
    );
    const hex = value.toString(16).padStart(2, "0");
    return `#${hex + hex + hex}`;
  }

  static getVelocity(pos: Vec2, blackhole: BlackHole) {
    const M = blackhole.mass;
    const randFactor = 0.1;

    const rVec = pos.sub(blackhole.pos);
    const r = rVec.length();
    if (r === 0) return new Vec2(0, 0);

    const speed = Math.sqrt((Galaxy.G * M) / r) * Star.kInitVelocity;
    const delta = (Math.random() * 2 - 1) * randFactor;
    const finalSpeed = speed * (1 + delta);

    const tangent = new Vec2(-rVec.y, rVec.x).normalize();

    return tangent.multiply(finalSpeed);
  }
}

class BlackHole extends Star {
  static SIZE_MASS_RATIO = 10;
  mass: number;

  constructor(pos: Vec2 = new Vec2(), size: number = 10) {
    super(pos);

    this.size = size;
    this.mass = size / BlackHole.SIZE_MASS_RATIO;
  }

  draw(canvas: Canvas) {
    const screenPos = canvas.place(this.pos);
    const ctx = canvas.context;

    const eventHorizonRadius = this.size;
    const glowRadius = eventHorizonRadius * 1.5;

    ctx.save();

    const outerGlow = ctx.createRadialGradient(
      screenPos.x,
      screenPos.y,
      eventHorizonRadius,
      screenPos.x,
      screenPos.y,
      glowRadius
    );
    outerGlow.addColorStop(0, "rgb(255, 255, 255)");
    outerGlow.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(0, 0, 0, 1)";
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, eventHorizonRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class Galaxy {
  static G = 6.6743e-11;

  canvas: Canvas;
  stars: Star[];
  blackholes: BlackHole[];
  ship?: Ship;

  constructor(
    canvas: Canvas,
    blackholes: BlackHole[],
    ship?: Ship,
    nStar: number = 100
  ) {
    this.canvas = canvas;
    this.stars = [];
    this.blackholes = blackholes;
    this.ship = ship;

    this.createStars(nStar);
  }

  createStars(n: number) {
    for (let i = 0; i < n; i++) {
      const pos = this.canvas.randomPosition().multiply(2);
      const size = Math.random() * 5;
      const vel = Star.getVelocity(pos, this.blackholes[0]);

      this.stars.push(new Star(pos, size, vel));
    }
  }

  update() {
    if (this.ship) {
      this.ship.update(this.blackholes);
    }

    this.stars = this.stars.filter((star) => !star.shouldDestroy);

    let maxVel = 0;

    for (let star of this.stars) {
      star.update(this.blackholes);
      if (star.vel.length() > maxVel) {
        maxVel = star.vel.length();
      }
    }

    Star.MAX_VELOCITY = maxVel;
  }

  draw() {
    this.canvas.context.clearRect(
      0,
      0,
      this.canvas.dimensions.x,
      this.canvas.dimensions.y
    );

    this.stars.forEach((s) => s.draw(this.canvas));
    this.blackholes.forEach((b) => b.draw(this.canvas));
    if (this.ship) this.ship.draw(this.canvas, this.blackholes[0].pos);
  }
}

type ShipStatus = "idle" | "thrusting";

type ShipSprite = {
  [key in ShipStatus]: HTMLImageElement;
};

class Ship {
  static THRUSTPOWER = 0.0001;
  static RADIALPOWER = 0.002;
  static MASS = 3;

  size: number;
  pos: Vec2;
  vel: Vec2 = new Vec2();

  keys: { [key: string]: boolean } = {};
  sprites: ShipSprite;
  status: ShipStatus = "idle";
  angle: number = 0; // en radian
  angluarVel: number = 0;
  spriteWidthRatio: number;

  constructor(
    pos: Vec2,
    spriteThrusterOff: HTMLImageElement,
    spriteThrusterOn: HTMLImageElement,
    size: number
  ) {
    this.pos = pos;

    this.sprites = {
      idle: spriteThrusterOff,
      thrusting: spriteThrusterOn,
    };
    this.size = size;

    this.spriteWidthRatio = spriteThrusterOff.height / spriteThrusterOff.width;

    document.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
    });

    document.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });
  }

  draw(canvas: Canvas, bhPos: Vec2) {
    const screenPos = canvas.place(this.pos);

    canvas.context.save();
    canvas.context.globalAlpha = clamp(this.pos.distance(bhPos) * -1, 0.3, 1);

    canvas.context.translate(
      screenPos.x + this.size / 2,
      screenPos.y + (this.size * this.spriteWidthRatio) / 2
    );
    canvas.context.rotate(this.angle);

    canvas.context.drawImage(
      this.sprites[this.status],
      -this.size / 2,
      -this.size / 2,
      this.size,
      this.size * this.spriteWidthRatio
    );

    canvas.context.restore();
  }

  update(blackholes: BlackHole[]) {
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

    for (let blackhole of blackholes) {
      const distance = this.pos.distance(blackhole.pos);

      const forceMagnitude =
        Galaxy.G * (blackhole.mass / distance ** 2) * Star.kGravity * Ship.MASS;

      const directionX = (blackhole.pos.x - this.pos.x) / distance;
      const directionY = (blackhole.pos.y - this.pos.y) / distance;

      const forceVector = new Vec2(
        directionX * forceMagnitude,
        directionY * forceMagnitude
      );

      this.vel = this.vel.add(forceVector);
    }

    this.pos = this.pos.add(this.vel);
    this.angle += this.angluarVel;
  }
}

const fps = 60;
const interval = 1000 / fps;
let lastTime = 0;

function animate(time: number) {
  requestAnimationFrame(animate);

  const delta = time - lastTime;
  if (delta >= interval) {
    lastTime = time - (delta % interval);

    galaxy.update();
    galaxy.draw();
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
  });
}

const spriteThrusterOffUrl = "../public/ship.png";
const spriteThrusterOnUrl = "../public/ship-thrust.png";

const gargantua = new BlackHole(new Vec2(0, 0), 50);
// const gargantua2 = new BlackHole(new Vec2(0.5, 0), 50)
let discovery = undefined;
const canvas = new Canvas("#app");
const galaxy = new Galaxy(canvas, [gargantua], discovery, 50000);

Promise.all([loadImage(spriteThrusterOffUrl), loadImage(spriteThrusterOnUrl)])
  .then(([spriteThrusterOff, spriteThrusterOn]) => {
    console.log(
      "Both images are ready!",
      spriteThrusterOffUrl,
      spriteThrusterOnUrl
    );

    galaxy.ship = new Ship(
      new Vec2(0.8, 0.8),
      spriteThrusterOff,
      spriteThrusterOn,
      50
    );
  })
  .catch((err) => {
    console.error("Failed to load one or more images", err);
  });

requestAnimationFrame(animate);
