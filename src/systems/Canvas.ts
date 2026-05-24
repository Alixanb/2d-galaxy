import Vec2 from "../core/Vec2";

abstract class Canvas<
  Ctx extends CanvasRenderingContext2D | WebGLRenderingContext
> {
  element: HTMLCanvasElement;
  dimensions: Vec2 = new Vec2();
  ratio: number = 0;
  context!: Ctx;
  height: number;

  constructor(ref: string, height: number = 1) {
    const element = document.querySelector<HTMLCanvasElement>(ref);
    if (!element)
      throw new Error("Unable to fetch canvas element with string " + ref);

    this.element = element;
    this.height = height;
  }

  place(vec: Vec2) {
    const normalizedY =
      ((vec.y + 1) / 2) * (this.dimensions.y / window.devicePixelRatio);

    const normalizedX =
      ((vec.x + this.ratio) / (2 * this.ratio)) *
      (this.dimensions.x / window.devicePixelRatio);

    return new Vec2(normalizedX, normalizedY);
  }

  sizing() {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const rect = this.element.getBoundingClientRect();
    const displayWidth = rect.width || window.innerWidth;
    const displayHeight = rect.height || window.innerHeight;

    this.element.width = displayWidth * devicePixelRatio;
    this.element.height = displayHeight * devicePixelRatio;

    this.element.style.width = displayWidth + "px";
    this.element.style.height = displayHeight + "px";

    this.dimensions = new Vec2(this.element.width, this.element.height);
    this.ratio = this.dimensions.x / this.dimensions.y;

    this.onResize();
  }

  protected abstract onResize(): void;
}

export class Canvas2d extends Canvas<CanvasRenderingContext2D> {
  zoom: number = 1;
  camera: Vec2 = new Vec2();

  constructor(ref: string, height: number = 1) {
    super(ref, height);

    const context = this.element.getContext("2d");
    if (!context) throw new Error("Unable to get canvas context");

    this.context = context;

    window.addEventListener("resize", this.sizing.bind(this));
    requestAnimationFrame(() => this.sizing());
  }

  // Override base place() to account for camera offset
  place(vec: Vec2): Vec2 {
    const W = this.dimensions.x / window.devicePixelRatio;
    const H = this.dimensions.y / window.devicePixelRatio;
    const wx = vec.x - this.camera.x;
    const wy = vec.y - this.camera.y;
    const normalizedX = ((wx + this.ratio) / (2 * this.ratio)) * W;
    const normalizedY = ((wy + 1) / 2) * H;
    return new Vec2(normalizedX, normalizedY);
  }

  unplace(screenVec: Vec2): Vec2 {
    const W = this.dimensions.x / window.devicePixelRatio;
    const H = this.dimensions.y / window.devicePixelRatio;
    const x = (screenVec.x / W) * (2 * this.ratio) - this.ratio + this.camera.x;
    const y = (screenVec.y / H) * 2 - 1 + this.camera.y;
    return new Vec2(x, y);
  }

  enablePan() {
    let panning = false;
    let lastX = 0, lastY = 0;

    this.element.addEventListener("mousedown", (e) => {
      if (e.button === 2) {
        panning = true;
        lastX = e.clientX;
        lastY = e.clientY;
        e.preventDefault();
      }
    });

    document.addEventListener("mousemove", (e) => {
      if (!panning) return;
      const W = this.dimensions.x / devicePixelRatio;
      const H = this.dimensions.y / devicePixelRatio;
      this.camera.x -= (e.clientX - lastX) / W * (2 * this.ratio);
      this.camera.y -= (e.clientY - lastY) / H * 2;
      lastX = e.clientX;
      lastY = e.clientY;
    });

    document.addEventListener("mouseup", (e) => {
      if (e.button === 2) panning = false;
    });

    this.element.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  randomPosition() {
    return new Vec2(Math.random() * 2 - 1, Math.random() * 2 - 1);
  }

  randomCirclePosition(radius: number = 1) {
    const theta = Math.random() * (Math.PI * 2);
    const u = Math.random();
    const r = Math.sqrt(u) ** 2 * radius;

    return new Vec2(Math.sin(theta) * r, Math.cos(theta) * r);
  }

  protected onResize(): void {
    this.context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
}

export class CanvasWebGL extends Canvas<WebGLRenderingContext> {
  shaders: Shader[] = [];
  buffer: WebGLBuffer | null = null;

  constructor(ref: string, height: number = 1) {
    super(ref, height);

    const context = this.element.getContext("webgl");
    if (!context) throw new Error("Unable to get canvas context");

    this.context = context;

    this.context.enable(this.context.BLEND);
    this.context.blendFunc(this.context.SRC_ALPHA, this.context.ONE);

    window.addEventListener("resize", this.sizing.bind(this));
    requestAnimationFrame(() => this.sizing());
  }

  newShader(source: string, type: ShaderType) {
    const shader = this.compileShader(source, type);
    this.shaders.push(shader);
    return shader;
  }

  compileShaders(type: ShaderType | "all" = "all") {
    let shadersToUse = this.shaders;
    if (type !== "all") {
      shadersToUse = this.shaders.filter((s) => s.type === type);
    }
    return new ShaderProgram(this.context, ...shadersToUse);
  }

  compileShader(source: string, type: ShaderType) {
    return new Shader(source, type, this.context);
  }

  createBuffer(data: BufferSource) {
    this.buffer = this.context.createBuffer();
    this.context.bindBuffer(this.context.ARRAY_BUFFER, this.buffer);
    this.context.bufferData(
      this.context.ARRAY_BUFFER,
      data,
      this.context.STATIC_DRAW
    );
  }

  protected onResize(): void {
    this.context.viewport(0, 0, this.element.width, this.element.height);
  }
}

export class ShaderProgram {
  program: WebGLProgram;
  gl: WebGLRenderingContext;
  position?: number;
  shaders: Shader[];

  constructor(gl: WebGLRenderingContext, ...shaders: Shader[]) {
    this.gl = gl;
    this.program = this.gl.createProgram();
    if (!this.program) throw new Error("Unable to create WebGLProgram");

    this.shaders = shaders;
  }

  compile() {
    if (!this.shaders.length)
      throw new Error("Impossible to compile shaders since there isn't any");

    for (let shader of this.shaders) {
      this.gl.attachShader(this.program, shader.shader);
    }

    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      const info = this.gl.getProgramInfoLog(this.program);
      throw new Error("Program linking failed:\n" + info);
    }

    this.gl.useProgram(this.program);
  }

  createLocation(location: string) {
    this.position = this.gl.getAttribLocation(this.program, location);
    this.gl.enableVertexAttribArray(this.position);
    this.gl.vertexAttribPointer(this.position, 2, this.gl.FLOAT, false, 0, 0);
  }
}

type ShaderType = "fragment" | "vertex";
export class Shader {
  static shaderTypeGL: Record<ShaderType, "FRAGMENT_SHADER" | "VERTEX_SHADER"> =
    {
      fragment: "FRAGMENT_SHADER",
      vertex: "VERTEX_SHADER",
    };

  source: string;
  shader!: WebGLShader;
  type: ShaderType;
  gl: WebGLRenderingContext;

  constructor(source: string, type: ShaderType, gl: WebGLRenderingContext) {
    this.source = source;
    this.type = type;
    this.gl = gl;

    this.compile();
  }

  compile() {
    const typeGL = this.gl[Shader.shaderTypeGL[this.type]];

    const shader = this.gl.createShader(typeGL);
    if (!shader) throw new Error("Unable to compile shader ; \n" + this.source);

    this.shader = shader;

    this.gl.shaderSource(this.shader, this.source);
    this.gl.compileShader(this.shader);

    if (!this.gl.getShaderParameter(this.shader, this.gl.COMPILE_STATUS)) {
      const info = this.gl.getShaderInfoLog(this.shader);
      throw new Error(
        "Shader compilation failed:\n" + info + "\nSource:\n" + this.source
      );
    }
  }
}
