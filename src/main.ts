import { loadImage } from "./core/Functions";
import Vec2 from "./core/Vec2";
import BlackHole from "./entities/BlackHole";
import Ship from "./entities/Ship";
import Star from "./entities/Star";
import { Canvas2d, CanvasWebGL } from "./systems/Canvas";
import Galaxy from "./systems/Galaxy";
import { createFloatingWindow } from "./systems/FloatingWindow";
import LandingPage from "./ui/LandingPage";
import type { SimulationConfig } from "./ui/LandingPage";
import CockpitHUD from "./ui/CockpitHUD";

const spriteThrusterOffUrl = "/assets/ship.png";
const spriteThrusterOnUrl = "/assets/ship-thrust.png";

const landing = new LandingPage();

landing.onStart = (config: SimulationConfig) => {
  startSimulation(config);
};

function buildBlackHoles(n: number, showBlackholes: boolean): BlackHole[] {
  const positions: Vec2[] = [];

  if (n === 1) {
    positions.push(new Vec2(0, 0));
  } else if (n === 2) {
    positions.push(new Vec2(-0.5, 0), new Vec2(0.5, 0));
  } else {
    // 3 black holes in a triangle
    const r = 0.45;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      positions.push(new Vec2(Math.cos(angle) * r, Math.sin(angle) * r));
    }
  }

  return positions.map((pos) => new BlackHole(pos, 10, showBlackholes));
}

function startSimulation(config: SimulationConfig) {
  const canvas2d = new Canvas2d("#canvas-2d");
  const canvasGl = new CanvasWebGL("#canvas-web-gl");

  const blackholes = buildBlackHoles(config.nBlackHoles, config.showBlackholes);

  const galaxy = new Galaxy(
    canvas2d,
    canvasGl,
    blackholes,
    undefined,
    config.nStars,
    config.galaxySize
  );

  canvas2d.enablePan();

  // Click on canvas to spawn a star at that world position
  canvas2d.element.addEventListener("click", (e) => {
    const worldPos = canvas2d.unplace(new Vec2(e.clientX, e.clientY));
    galaxy.addStarAt(worldPos);
  });

  // Spawn window (bulk add stars)
  buildSpawnWindow(galaxy);

  let SIMULATION_SPEED = config.simulationSpeed;

  const cockpit = new CockpitHUD(galaxy);

  buildSimSpeedWindow(config.simulationSpeed, () => SIMULATION_SPEED, (v) => { SIMULATION_SPEED = v; });

  let lastTime = 0;
  const UPDATE_INTERVAL_MS = 200;
  let lastUpdate = Date.now();

  const FIXED_STEP = 1 / 60;
  let accumulator = 0;

  Promise.all([loadImage(spriteThrusterOffUrl), loadImage(spriteThrusterOnUrl)])
    .then(([spriteOff, spriteOn]) => {
      let spawnPos = new Vec2(0, 0);
      let spawnVel = new Vec2(0, 0);

      if (blackholes.length === 1) {
        // Spawn on the outer rim of the galaxy
        const radius = config.galaxySize;
        const angle = Math.random() * Math.PI * 2;
        spawnPos = new Vec2(Math.cos(angle) * radius, Math.sin(angle) * radius);
        // Already in orbit
        spawnVel = Star.getVelocity(spawnPos, blackholes[0]);
      } else {
        // Multiple black holes: spawn in the middle with no velocity
        spawnPos = new Vec2(0, 0);
        spawnVel = new Vec2(0, 0);
      }

      galaxy.ship = new Ship(
        spawnPos,
        spriteOff,
        spriteOn,
        30,
        config.showPath,
        blackholes
      );
      galaxy.ship.vel = spawnVel;
    })
    .catch(console.error);

  function animate(time: number) {
    const rawDelta = (time - lastTime) / 1000;
    lastTime = time;

    accumulator += rawDelta * SIMULATION_SPEED;

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
        ship2.maxMonergol
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

function buildSimSpeedWindow(initial: number, _getSpeed: () => number, setSpeed: (v: number) => void) {
  const { panel, body } = createFloatingWindow("SIM CTRL", 220, 80, 60);
  panel.style.left = "20px";
  panel.style.top = "230px";

  const header = document.createElement("div");
  header.className = "spawn-header";

  const label = document.createElement("span");
  label.className = "stat-label";
  label.textContent = "Sim Speed";

  const valueEl = document.createElement("span");
  valueEl.className = "stat-value";
  valueEl.textContent = `${initial.toFixed(1)}×`;

  header.appendChild(label);
  header.appendChild(valueEl);

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0.1";
  slider.max = "10";
  slider.step = "0.1";
  slider.value = String(initial);
  slider.className = "cyan";
  slider.addEventListener("input", () => {
    const v = parseFloat(slider.value);
    valueEl.textContent = `${v.toFixed(1)}×`;
    setSpeed(v);
  });

  body.appendChild(header);
  body.appendChild(slider);

  panel.style.display = "block";
  document.body.appendChild(panel);
}

function buildSpawnWindow(galaxy: Galaxy) {
  const { panel, body } = createFloatingWindow("Spawn", 220, 180, 100);
  panel.style.left = "20px";
  panel.style.top = "20px";

  const header = document.createElement("div");
  header.className = "spawn-header";

  const countLabel = document.createElement("span");
  countLabel.className = "stat-label";
  countLabel.textContent = "Count";

  const countValue = document.createElement("span");
  countValue.className = "stat-value";
  countValue.textContent = "50";

  header.appendChild(countLabel);
  header.appendChild(countValue);

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "1";
  slider.max = "200";
  slider.value = "50";
  slider.className = "cyan";
  slider.addEventListener("input", () => {
    countValue.textContent = slider.value;
  });

  const addBtn = document.createElement("button");
  addBtn.className = "btn-spawn";
  addBtn.textContent = "Add Stars";
  addBtn.addEventListener("click", () => {
    galaxy.addStars(parseInt(slider.value));
  });

  const hint = document.createElement("p");
  hint.className = "spawn-hint";
  hint.textContent = "Or click anywhere on the canvas to place a star.";

  body.appendChild(header);
  body.appendChild(slider);
  body.appendChild(addBtn);
  body.appendChild(hint);

  panel.style.display = "block";
  document.body.appendChild(panel);
}
