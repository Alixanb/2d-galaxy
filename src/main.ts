import { loadImage } from "./core/Functions";
import Vec2 from "./core/Vec2";
import BlackHole from "./entities/BlackHole";
import Ship from "./entities/Ship";
import Star from "./entities/Star";
import { Canvas2d, CanvasWebGL } from "./systems/Canvas";
import Galaxy from "./systems/Galaxy";
import LandingPage from "./ui/LandingPage";
import CockpitHUD from "./ui/CockpitHUD";
import { type GameMode, type TidalRating, createInitialState } from "./core/GameState";
import { SYSTEMS } from "./data/systems";

const spriteThrusterOffUrl = "/assets/ship.png";
const spriteThrusterOnUrl = "/assets/ship-thrust.png";

const TIDAL_LEVEL: Record<TidalRating, number> = { None: 0, Low: 1, Medium: 2, High: 3, Extreme: 4 };
const DECAY_TABLE = [0, 300, 90, 30, 15];

function getDecaySeconds(tidalRating: TidalRating, hullLevel: number): number | null {
  const gap = TIDAL_LEVEL[tidalRating] - hullLevel;
  return gap <= 0 ? null : DECAY_TABLE[Math.min(gap, 4)];
}

const landing = new LandingPage();

landing.onStart = (mode, showBlackholes) => {
  startSimulation(mode, showBlackholes);
};

function startSimulation(mode: GameMode, showBlackholes: boolean) {
  const gameState = createInitialState(mode);

  const canvas2d = new Canvas2d("#canvas-2d");
  const canvasGl = new CanvasWebGL("#canvas-web-gl");

  const blackholes = [new BlackHole(new Vec2(0, 0), 10, showBlackholes)];

  const galaxy = new Galaxy(canvas2d, canvasGl, blackholes, undefined, 5000, 0.7);

  canvas2d.enablePan();

  let SIMULATION_SPEED = 1;
  let paused = false;

  const cockpit = new CockpitHUD(
    galaxy,
    () => SIMULATION_SPEED,
    (v) => { SIMULATION_SPEED = v; },
    (p) => { paused = p; }
  );

  galaxy.onDock = () => {
    const config = SYSTEMS.find(s => s.id === gameState.currentSystemId);
    if (!config) return;
    gameState.upgrades.parts += config.partsReward;
    if (!gameState.completedSystems.includes(gameState.currentSystemId)) {
      gameState.completedSystems.push(gameState.currentSystemId);
    }
    console.log(`Docked! +${config.partsReward} parts. Total: ${gameState.upgrades.parts}`);
  };

  const config = SYSTEMS.find(s => s.id === gameState.currentSystemId)!;
  const initialDecay = getDecaySeconds(config.tidalRating, gameState.upgrades.hullLevel);
  let decayTimer: number | null = initialDecay;

  let lastTime = 0;
  const UPDATE_INTERVAL_MS = 200;
  let lastUpdate = Date.now();

  const FIXED_STEP = 1 / 60;
  let accumulator = 0;

  Promise.all([loadImage(spriteThrusterOffUrl), loadImage(spriteThrusterOnUrl)])
    .then(([spriteOff, spriteOn]) => {
      let spawnPos = new Vec2(0, 0);
      let spawnVel = new Vec2(0, 0);

      const radius = 0.7;
      const angle = Math.random() * Math.PI * 2;
      spawnPos = new Vec2(Math.cos(angle) * radius, Math.sin(angle) * radius);
      spawnVel = Star.getVelocity(spawnPos, blackholes[0], 2.1 * 10e1);

      const ship = new Ship(spawnPos, spriteOff, spriteOn, 30, true, blackholes);
      ship.vel = spawnVel;
      galaxy.ship = ship;
    })
    .catch(console.error);

  function animate(time: number) {
    const rawDelta = (time - lastTime) / 1000;
    lastTime = time;

    if (!paused) accumulator += rawDelta * SIMULATION_SPEED;

    if (!paused && decayTimer !== null) {
      decayTimer -= rawDelta;
      if (decayTimer <= 0 && gameState.mode === 'RELAY') {
        decayTimer = initialDecay;
        const ship = galaxy.ship;
        if (ship) {
          const r = 0.7;
          const a = Math.random() * Math.PI * 2;
          ship.pos = new Vec2(Math.cos(a) * r, Math.sin(a) * r);
          ship.vel = Star.getVelocity(ship.pos, blackholes[0], 2.1 * 10e1);
        }
      }
    }

    const now = Date.now();
    if (now - lastUpdate >= UPDATE_INTERVAL_MS) {
      const activeStars = galaxy.stars.filter((s) => !s.shouldDestroy).length;
      const ship = galaxy.ship;
      const cam = canvas2d.camera;
      const distFromCam = ship ? Math.hypot(ship.pos.x - cam.x, ship.pos.y - cam.y) : 0;

      cockpit.update({
        fps: Math.round(1 / rawDelta),
        starCount: activeStars,
        totalStars: galaxy.totalStarsSpawned,
        vx: ship?.vel?.x ?? 0,
        vy: ship?.vel?.y ?? 0,
        dist: distFromCam,
        angularVel: ship?.angluarVel ?? 0,
        liquidErgol: ship?.liquidErgol ?? 0,
        maxLiquidErgol: ship?.maxLiquidErgol ?? 500,
        monergol: ship?.monergol ?? 0,
        maxMonergol: ship?.maxMonergol ?? 100,
        isThrusting: ship?.status === "thrusting",
      });

      lastUpdate = now;
    }

    // Redraw status gauges every frame for smooth pulse animation and high speed refresh
    const ship2 = galaxy.ship;
    if (ship2) {
      cockpit.updateStatusGauges(
        ship2.vel.x,
        ship2.vel.y,
        ship2.liquidErgol,
        ship2.maxLiquidErgol,
        ship2.monergol,
        ship2.maxMonergol,
        decayTimer,
        initialDecay
      );
    }

    while (accumulator >= FIXED_STEP) {
      galaxy.update(FIXED_STEP);
      accumulator -= FIXED_STEP;
    }

    galaxy.draw();
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

