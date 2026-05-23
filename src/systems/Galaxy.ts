import { clamp } from "../core/Utils";
import Vec2 from "../core/Vec2";
import BlackHole from "../entities/BlackHole";
import FuelDepot from "../entities/FuelDepot";
import RelayStation from "../entities/RelayStation";
import Ship from "../entities/Ship";
import Star from "../entities/Star";
import {
  Shader,
  ShaderProgram,
  type Canvas2d,
  type CanvasWebGL,
} from "./Canvas";

// Palette colors as [r, g, b] in 0-1 range
const PALETTE = {
  cyan:   [0.314, 0.714, 0.788] as [number, number, number],
  green:  [0.424, 0.725, 0.451] as [number, number, number],
  yellow: [0.914, 0.839, 0.157] as [number, number, number],
  red:    [0.925, 0.149, 0.149] as [number, number, number],
};

function lerpColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function velocityToColor(velRatio: number): [number, number, number] {
  if (velRatio < 0.33) {
    return lerpColor(PALETTE.cyan, PALETTE.green, velRatio / 0.33);
  } else if (velRatio < 0.67) {
    return lerpColor(PALETTE.green, PALETTE.yellow, (velRatio - 0.33) / 0.34);
  } else {
    return lerpColor(PALETTE.yellow, PALETTE.red, (velRatio - 0.67) / 0.33);
  }
}

export default class Galaxy {
  static G = 6.6743e-11;

  canvas2d: Canvas2d;
  canvasWebGL: CanvasWebGL;
  stars: Star[];
  blackholes: BlackHole[];
  fuelDepots: FuelDepot[] = [];
  relayStations: RelayStation[] = [];
  ship?: Ship;
  size: number;
  shaderProgram: ShaderProgram;
  totalStarsSpawned = 0;
  onDock: (relay: RelayStation) => void = () => {};
  private dockedRelays = new Set<RelayStation>();

  constructor(
    canvas2d: Canvas2d,
    canvasWebGL: CanvasWebGL,
    blackholes: BlackHole[],
    ship?: Ship,
    nStar: number = 100,
    size: number = 0.7,
    relayCount: number = 1,
    relayOrbitRadius: number = 0.30,
    relayOrbitSpeed: number = 0.20
  ) {
    this.canvas2d = canvas2d;
    this.canvasWebGL = canvasWebGL;
    this.stars = [];
    this.blackholes = blackholes;
    this.ship = ship;

    this.size = clamp(size, 0.1, 2);

    this.createStars(nStar);

    const gl = this.canvasWebGL.context;

    const vs = new Shader(
      `attribute vec2 a_position;
       attribute float a_size;
       attribute vec3 a_color;
       varying vec3 v_color;
       void main(void) {
         gl_PointSize = a_size;
         gl_Position = vec4(a_position, 0.0, 1.0);
         v_color = a_color;
       }`,
      "vertex",
      gl
    );

    const fs = new Shader(
      `precision mediump float;
       varying vec3 v_color;
       void main(void) {
         vec2 coord = gl_PointCoord - vec2(0.5);
         float dist = length(coord);
         float alpha = smoothstep(0.5, 0.15, dist);
         gl_FragColor = vec4(v_color, alpha * 0.9);
       }`,
      "fragment",
      gl
    );

    this.shaderProgram = new ShaderProgram(gl, vs, fs);
    this.shaderProgram.compile();

    this.spawnFuelDepots();
    this.spawnRelays(relayCount, relayOrbitRadius, relayOrbitSpeed);
    if (this.ship && this.relayStations.length > 0) {
      this.ship.targetRelay = this.relayStations[0];
    }
  }

  private spawnRelays(count: number, orbitRadius: number, orbitSpeed: number): void {
    const bh = this.blackholes[0];
    if (!bh) return;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      this.relayStations.push(new RelayStation(bh.pos, orbitRadius, angle, orbitSpeed));
    }
  }

  private spawnFuelDepots(): void {
    if (this.blackholes.length === 0) return;

    // 5 liquid ergol depots (restores 20% of max tank each)
    for (let i = 0; i < 5; i++) {
      const bh = this.blackholes[i % this.blackholes.length];
      const radius = 0.12 + Math.random() * 0.28;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.15 + Math.random() * 0.10;
      this.fuelDepots.push(new FuelDepot(bh.pos, radius, angle, 'liquid-ergol', 100, speed));
    }

    // 8 monergol depots (restores 25% of max tank each)
    for (let i = 0; i < 8; i++) {
      const bh = this.blackholes[i % this.blackholes.length];
      const radius = 0.08 + Math.random() * 0.22;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.30 + Math.random() * 0.20;
      this.fuelDepots.push(new FuelDepot(bh.pos, radius, angle, 'monergol', 25, speed));
    }
  }

  createStars(n: number) {
    for (let i = 0; i < n; i++) {
      const pos = this.canvas2d.randomCirclePosition(this.size);
      const size = Math.random() * Star.MAX_SIZE;
      const vel = this.blackholes.length > 0 
        ? Star.getVelocity(pos, this.blackholes[0])
        : new Vec2(0, 0);

      this.stars.push(new Star(pos, size, vel));
    }
    this.totalStarsSpawned += n;
  }

  addStarAt(worldPos: Vec2) {
    const size = Math.random() * Star.MAX_SIZE;
    const vel = this.blackholes.length > 0
      ? Star.getVelocity(worldPos, this.blackholes[0])
      : new Vec2(0, 0);
    this.stars.push(new Star(worldPos, size, vel));
    this.totalStarsSpawned += 1;
  }

  addStars(n: number) {
    this.createStars(n);
  }

  update(dt: number) {
    if (this.ship) {
      this.ship.update(dt);
    }

    this.stars = this.stars.filter((star) => !star.shouldDestroy);

    let maxVel = 0;

    for (let star of this.stars) {
      star.update(this.blackholes, dt);
      if (star.vel.length() > maxVel) {
        maxVel = star.vel.length();
      }
    }

    Star.MAX_VELOCITY = maxVel;

    // Update fuel depots and collect if ship is close enough
    for (const depot of this.fuelDepots) {
      depot.update(dt);
      if (this.ship && this.ship.pos.distance(depot.pos) < depot.collectRadius) {
        this.ship.collectFuel(depot.type, depot.amount);
        depot.collected = true;
      }
    }
    this.fuelDepots = this.fuelDepots.filter(d => !d.collected);
    for (const relay of this.relayStations) {
      relay.update(dt);
      if (this.ship && !this.dockedRelays.has(relay)) {
        const dist = this.ship.pos.distance(relay.pos);
        const relVelX = -Math.sin(relay.orbitAngle) * relay.orbitRadius * relay.orbitSpeed;
        const relVelY = Math.cos(relay.orbitAngle) * relay.orbitRadius * relay.orbitSpeed;
        const relSpeed = Math.hypot(this.ship.vel.x - relVelX, this.ship.vel.y - relVelY);
        if (dist < relay.completionRadius && relSpeed < 0.0002) {
          this.dockedRelays.add(relay);
          this.onDock(relay);
        }
      }
    }
  }

  draw() {
    // Reset transform before clearing so the full physical canvas is wiped,
    // not just a transformed sub-region (which leaves trails at the edges).
    const ctx = this.canvas2d.context;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas2d.element.width, this.canvas2d.element.height);
    ctx.restore();

    this.drawStarsUsingWebGL();

    this.blackholes.forEach((b) => b.draw(this.canvas2d));
    for (const depot of this.fuelDepots) {
      depot.draw(this.canvas2d, this.ship?.pos);
    }
    for (const relay of this.relayStations) relay.draw(this.canvas2d);
    if (this.ship) this.ship.draw(this.canvas2d);
  }

  drawStarsUsingWebGL() {
    const nStars = this.stars.length;
    const gl = this.canvasWebGL.context;

    // 6 floats per star: x, y, size, r, g, b
    const FLOATS_PER_STAR = 6;
    const data = new Float32Array(nStars * FLOATS_PER_STAR);

    for (let i = 0; i < nStars; i++) {
      const star = this.stars[i];
      const velRatio = clamp(star.vel.length() / Star.MAX_VELOCITY, 0, 1);
      const [r, g, b] = velocityToColor(velRatio);

      const ratio = this.canvas2d.ratio;
      const cam = this.canvas2d.camera;
      const base = i * FLOATS_PER_STAR;
      // Convert world coords to WebGL clip space:
      // x: world [-ratio, +ratio] → clip [-1, +1]  → divide by ratio
      // y: Canvas2D has y=+1 at bottom; WebGL clip has y=+1 at top → negate
      data[base]     = (star.pos.x - cam.x) / ratio;
      data[base + 1] = -(star.pos.y - cam.y);
      data[base + 2] = Math.max(3.0, star.size * 5);
      data[base + 3] = r;
      data[base + 4] = g;
      data[base + 5] = b;
    }

    const program = this.shaderProgram.program;
    if (!program) return;

    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

    const BYTES = Float32Array.BYTES_PER_ELEMENT;
    const stride = FLOATS_PER_STAR * BYTES;

    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, stride, 0);

    const sizeLoc = gl.getAttribLocation(program, "a_size");
    gl.enableVertexAttribArray(sizeLoc);
    gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, stride, 2 * BYTES);

    const colorLoc = gl.getAttribLocation(program, "a_color");
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, stride, 3 * BYTES);

    // Use normal alpha compositing so colored dots don't wash out to white
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, nStars);

    // Restore additive blending (CanvasWebGL default)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    gl.deleteBuffer(buffer);
  }
}
