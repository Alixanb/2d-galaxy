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
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;
    console.log(displayWidth, displayHeight, devicePixelRatio);

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

  constructor(ref: string, height: number = 1) {
    super(ref, height);

    const context = this.element.getContext("2d");
    if (!context) throw new Error("Unable to get canvas context");

    this.context = context;

    window.addEventListener("resize", this.sizing.bind(this));
    this.sizing();
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
    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.context.translate(this.element.width / 2, this.element.height / 2);
    this.context.scale(
      (devicePixelRatio * this.zoom) / 2,
      (devicePixelRatio * this.zoom) / 2
    );
    this.context.translate(-this.element.width / 2, -this.element.height / 2);

    this.context.scale(devicePixelRatio, devicePixelRatio);
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

    window.addEventListener("resize", this.sizing.bind(this));
    this.sizing();
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
