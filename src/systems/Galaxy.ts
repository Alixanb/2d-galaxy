import { clamp } from "../core/Utils";
import BlackHole from "../entities/BlackHole";
import Ship from "../entities/Ship";
import Star from "../entities/Star";
import {
  Shader,
  ShaderProgram,
  type Canvas2d,
  type CanvasWebGL,
} from "./Canvas";

export default class Galaxy {
  static G = 6.6743e-11;

  canvas2d: Canvas2d;
  canvasWebGL: CanvasWebGL;
  stars: Star[];
  blackholes: BlackHole[];
  ship?: Ship;
  size: number;
  shaderProgram: ShaderProgram;

  constructor(
    canvas2d: Canvas2d,
    canvasWebGL: CanvasWebGL,
    blackholes: BlackHole[],
    ship?: Ship,
    nStar: number = 100,
    size: number = 0.7
  ) {
    this.canvas2d = canvas2d;
    this.canvasWebGL = canvasWebGL;
    this.stars = [];
    this.blackholes = blackholes;
    this.ship = ship;

    this.size = clamp(size, 0.1, 2);

    this.createStars(nStar);

    const gl = this.canvasWebGL.context;

    // WebGL
    const vs = new Shader(
      `attribute vec2 a_position;     
    void main(void) {
      gl_PointSize = 30.0;                   
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
    `,
      "vertex",
      gl
    );

    const fs = new Shader(
      `precision mediump float;
    
      void main(void) {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
    
        if (dist > 0.5) discard;
    
        gl_FragColor = vec4(1.0, 1.0, 1.0, 0.05); 
      }`,
      "fragment",
      gl
    );

    this.shaderProgram = new ShaderProgram(gl, vs, fs);
    this.shaderProgram.compile();
  }

  createStars(n: number) {
    for (let i = 0; i < n; i++) {
      const pos = this.canvas2d.randomCirclePosition(this.size);
      const size = Math.random() * Star.MAX_SIZE;
      const vel = Star.getVelocity(pos, this.blackholes[0]);

      this.stars.push(new Star(pos, size, vel));
    }
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
  }

  draw() {
    this.canvas2d.context.clearRect(
      0,
      0,
      this.canvas2d.dimensions.x,
      this.canvas2d.dimensions.y
    );

    // Draw stars using webGL
    this.drawStarsUsingWebGL();

    this.blackholes.forEach((b) => b.draw(this.canvas2d));
    if (this.ship) this.ship.draw(this.canvas2d);
  }

  drawStarsUsingWebGL() {
    const nStars = this.stars.length;
    const gl = this.canvasWebGL.context;
    const positions = new Float32Array(nStars * 2);

    for (let i = 0; i < nStars; i++) {
      const star = this.stars[i];
      positions[i * 2] = star.pos.x;
      positions[i * 2 + 1] = star.pos.y;
    }

    this.canvasWebGL.createBuffer(positions);
    this.shaderProgram.createLocation("a_position");

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, nStars);
  }

  drawStarsUsingCanvasApi() {
    this.stars.forEach((s) => s.draw(this.canvas2d));
  }
}
