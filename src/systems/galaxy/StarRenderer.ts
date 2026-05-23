import { clamp } from "../../core/Utils";
import Star from "../../entities/Star";
import { Shader, ShaderProgram, type Canvas2d, type CanvasWebGL } from "../Canvas";

export const PALETTE = {
  cyan:   [0.314, 0.714, 0.788] as [number, number, number],
  green:  [0.424, 0.725, 0.451] as [number, number, number],
  yellow: [0.914, 0.839, 0.157] as [number, number, number],
  red:    [0.925, 0.149, 0.149] as [number, number, number],
};

export function lerpColor(
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

export function velocityToColor(velRatio: number): [number, number, number] {
  if (velRatio < 0.33) {
    return lerpColor(PALETTE.cyan, PALETTE.green, velRatio / 0.33);
  } else if (velRatio < 0.67) {
    return lerpColor(PALETTE.green, PALETTE.yellow, (velRatio - 0.33) / 0.34);
  } else {
    return lerpColor(PALETTE.yellow, PALETTE.red, (velRatio - 0.67) / 0.33);
  }
}

export class StarRenderer {
  private shaderProgram: ShaderProgram;
  private canvasWebGL: CanvasWebGL;
  private canvas2d: Canvas2d;

  constructor(gl: WebGLRenderingContext, canvasWebGL: CanvasWebGL, canvas2d: Canvas2d) {
    this.canvasWebGL = canvasWebGL;
    this.canvas2d = canvas2d;

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
  }

  draw(stars: Star[]) {
    const nStars = stars.length;
    const gl = this.canvasWebGL.context;
    const FLOATS_PER_STAR = 6;
    const data = new Float32Array(nStars * FLOATS_PER_STAR);

    for (let i = 0; i < nStars; i++) {
      const star = stars[i];
      const velRatio = clamp(star.vel.length() / Star.MAX_VELOCITY, 0, 1);
      const [r, g, b] = velocityToColor(velRatio);

      const ratio = this.canvas2d.ratio;
      const cam = this.canvas2d.camera;
      const base = i * FLOATS_PER_STAR;
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

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, nStars);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.deleteBuffer(buffer);
  }
}
