import { clamp } from "../core/Utils";
import Vec2 from "../core/Vec2";
import BlackHole from "../entities/BlackHole";
import RelayStation from "../entities/RelayStation";
import Ship from "../entities/Ship";
import Star from "../entities/Star";
import type { SystemConfig } from "../data/systems";
import type { Canvas2d, CanvasWebGL } from "./Canvas";
import { StarRenderer } from "./galaxy/StarRenderer";
import { EntityManager } from "./galaxy/EntityManager";
import { GalaxyPhysics } from "./galaxy/GalaxyPhysics";

const RATING_TO_LEVEL = {
  None: 0, Low: 1, Medium: 2, High: 3, Extreme: 4
} as const;

export default class Galaxy {
  static G = 6.6743e-11;

  canvas2d: Canvas2d;
  canvasWebGL: CanvasWebGL;
  blackholes: BlackHole[];
  ship?: Ship;
  size: number;
  transitMode = false;
  onDock: (relay: RelayStation) => void = () => {};
  onDeath: () => void = () => {};

  private entityManager: EntityManager;
  private starRenderer: StarRenderer;
  private physics: GalaxyPhysics;
  private dockedRelays = new Set<RelayStation>();
  private bhTargetMasses: number[] = [];
  private gravityFadeTimer = 2;

  constructor(
    canvas2d: Canvas2d,
    canvasWebGL: CanvasWebGL,
    blackholes: BlackHole[],
    ship?: Ship,
    nStar: number = 100,
    size: number = 0.7,
    relayCount: number = 1,
    relayOrbitRadius: number = 0.30
  ) {
    this.canvas2d = canvas2d;
    this.canvasWebGL = canvasWebGL;
    this.blackholes = blackholes;
    this.ship = ship;
    this.size = clamp(size, 0.1, 2);

    this.entityManager = new EntityManager();
    this.starRenderer = new StarRenderer(this.canvasWebGL.context, this.canvasWebGL, this.canvas2d);
    this.physics = new GalaxyPhysics();

    this.entityManager.createStars(nStar, this.size, this.canvas2d, this.blackholes);
    this.entityManager.spawnFuelDepots(this.blackholes);
    this.entityManager.spawnRelays(this.blackholes, relayCount, relayOrbitRadius);
    
    if (this.ship && this.entityManager.relayStations.length > 0) {
      this.ship.targetRelay = this.entityManager.relayStations[0];
    }
  }

  // Exposed getters for external systems
  get stars() { return this.entityManager.stars; }
  set stars(val: Star[]) { this.entityManager.stars = val; }
  get fuelDepots() { return this.entityManager.fuelDepots; }
  get relayStations() { return this.entityManager.relayStations; }
  set relayStations(val: RelayStation[]) { this.entityManager.relayStations = val; }
  get totalStarsSpawned() { return this.entityManager.totalStarsSpawned; }

  addStarAt(worldPos: Vec2) {
    this.entityManager.addStarAt(worldPos, this.blackholes);
  }

  addStars(n: number) {
    this.entityManager.createStars(n, this.size, this.canvas2d, this.blackholes);
  }

  enterTransitMode(): void {
    this.transitMode = true;
    for (const bh of this.blackholes) bh.mass = 0;
    this.entityManager.stars = this.entityManager.stars.filter((_, i) => i % 10 === 0);
  }

  transitionToSystem(config: SystemConfig): void {
    this.blackholes.length = 0;
    this.bhTargetMasses = [];
    for (let i = 0; i < config.bhCount; i++) {
      const bh = new BlackHole(new Vec2(0, 0), config.bhMass, true);
      this.bhTargetMasses.push(bh.mass);
      bh.mass = 0;
      this.blackholes.push(bh);
    }
    for (let i = 0; i < this.blackholes.length; i++) this.blackholes[i].mass = this.bhTargetMasses[i];
    
    this.entityManager.stars = [];
    this.addStars(5000);
    for (const bh of this.blackholes) bh.mass = 0;
    
    this.entityManager.relayStations = [];
    this.dockedRelays = new Set();
    this.entityManager.spawnRelays(this.blackholes, config.relayCount, config.relayOrbitRadius, RATING_TO_LEVEL[config.tidalRating as keyof typeof RATING_TO_LEVEL]);
    
    if (this.ship && this.entityManager.relayStations.length > 0) {
      this.ship.targetRelay = this.entityManager.relayStations[0];
    }
    if (this.ship) {
      const tmp = new BlackHole(new Vec2(0, 0), config.bhMass, false);
      const angle = Math.random() * Math.PI * 2;
      const r = config.relayOrbitRadius * 2;
      this.ship.pos = new Vec2(Math.cos(angle) * r, Math.sin(angle) * r);
      this.ship.vel = Star.getVelocity(this.ship.pos, tmp, 2.1 * 10e1);
    }
    this.gravityFadeTimer = 0;
    this.transitMode = false;
  }

  update(dt: number) {
    if (this.gravityFadeTimer < 2) {
      this.gravityFadeTimer = Math.min(this.gravityFadeTimer + dt, 2);
      const t = this.gravityFadeTimer / 2;
      for (let i = 0; i < this.blackholes.length; i++) {
        this.blackholes[i].mass = t * this.bhTargetMasses[i];
      }
    }

    if (this.ship) this.ship.update(dt);

    this.entityManager.stars = this.entityManager.stars.filter((star) => !star.shouldDestroy);
    Star.MAX_VELOCITY = this.physics.updateStars(this.entityManager.stars, this.blackholes, dt);

    this.physics.updateEntities(dt, this.ship, this.entityManager.fuelDepots, this.entityManager.relayStations, this.dockedRelays, (relay) => this.onDock(relay), () => this.onDeath());
    this.entityManager.fuelDepots = this.entityManager.fuelDepots.filter(d => !d.collected);
  }

  draw() {
    const ctx = this.canvas2d.context;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas2d.element.width, this.canvas2d.element.height);
    ctx.restore();

    this.starRenderer.draw(this.entityManager.stars);

    this.blackholes.forEach((b) => b.draw(this.canvas2d));
    for (const depot of this.entityManager.fuelDepots) {
      depot.draw(this.canvas2d, this.ship?.pos);
    }
    for (const relay of this.entityManager.relayStations) relay.draw(this.canvas2d);
    if (this.ship) this.ship.draw(this.canvas2d);
  }
}
