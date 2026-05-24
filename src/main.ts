import { loadImage } from "./core/Functions";
import {
  type GameMode,
  type TidalRating,
  createInitialState,
  getMaxLE,
  getMaxMono,
} from "./core/GameState";
import { loadSave, saveGame } from "./core/SaveGame";
import Vec2 from "./core/Vec2";
import { SYSTEMS, type SystemConfig } from "./data/systems";
import BlackHole from "./entities/BlackHole";
import Ship from "./entities/Ship";
import Star from "./entities/Star";
import { Canvas2d, CanvasWebGL } from "./systems/Canvas";
import Galaxy from "./systems/Galaxy";
import { mountCockpitHUD, type CockpitHUDRef } from "./ui/CockpitHUD";
import type { RefObject } from "preact";
import { mountDebugPanel } from "./ui/DebugPanel";
import { mountGalaxyMap } from "./ui/GalaxyMap";
import { mountTechTree } from "./ui/TechTree";

const spriteThrusterOffUrl = "/assets/ship.png";
const spriteThrusterOnUrl = "/assets/ship-thrust.png";

const TIDAL_LEVEL: Record<TidalRating, number> = {
  None: 0,
  Low: 1,
  Medium: 2,
  High: 3,
  Extreme: 4,
};
const DECAY_TABLE = [0, 90, 30, 15, 5];

function getDecaySeconds(
  tidalRating: TidalRating,
  hullLevel: number,
): number | null {
  const gap = TIDAL_LEVEL[tidalRating] - hullLevel;
  return gap <= 0 ? null : DECAY_TABLE[Math.min(gap, 4)];
}

const params = new URLSearchParams(window.location.search);
const modeFromUrl = (params.get("mode") as GameMode) || "RELAY";
const bhFromUrl = params.get("bh") !== "false";

startSimulation(modeFromUrl, bhFromUrl);

function startSimulation(mode: GameMode, showBlackholes: boolean) {
  const gameState = loadSave(mode) ?? createInitialState(mode);

  const canvas2d = new Canvas2d("#canvas-2d");
  const canvasGl = new CanvasWebGL("#canvas-web-gl");

  const blackholes = [new BlackHole(new Vec2(0, 0), 10, showBlackholes)];

  const galaxy = new Galaxy(
    canvas2d,
    canvasGl,
    blackholes,
    undefined,
    5000,
    0.7,
  );

  canvas2d.enablePan();

  let SIMULATION_SPEED = 1;
  let paused = false;
  let transitTargetId: string | null = null;

  const galaxyMap = mountGalaxyMap(gameState, (id) => {
    transitTargetId = id;
  });
  const techTree = mountTechTree(gameState, () => {
    if (galaxy.ship) galaxy.ship.applyUpgrades(gameState.upgrades);
    saveGame(gameState);
  });

  const uiRoot = document.getElementById('ui-root')!;
  const cockpitRef: RefObject<CockpitHUDRef> = mountCockpitHUD(
    uiRoot,
    galaxy,
    () => SIMULATION_SPEED,
    (v) => { SIMULATION_SPEED = v; },
    (p) => { paused = p; },
    () => galaxyMap.toggle(),
    () => techTree.toggle(),
  );

  galaxy.onDock = () => {
    gameState.upgrades.parts += currentConfig.partsReward;
    if (!gameState.completedSystems.includes(gameState.currentSystemId)) {
      gameState.completedSystems.push(gameState.currentSystemId);
    }
    saveGame(gameState);
    console.log(
      `Docked! +${currentConfig.partsReward} parts. Total: ${gameState.upgrades.parts}`,
    );
  };

  galaxy.onDeath = () => {
    // For now death can just be an empty function as requested.
    // console.log("Collision detected! Game Over.");
  };

  let currentConfig = SYSTEMS.find((s) => s.id === gameState.currentSystemId)!;
  let decayMax: number | null = getDecaySeconds(
    currentConfig.tidalRating,
    gameState.upgrades.hullLevel,
  );
  let decayTimer: number | null = decayMax;

  function loadSystem(cfg: SystemConfig): void {
    gameState.currentSystemId = cfg.id;
    currentConfig = cfg;
    decayMax = getDecaySeconds(cfg.tidalRating, gameState.upgrades.hullLevel);
    decayTimer = decayMax;
    galaxy.transitionToSystem(cfg);
    saveGame(gameState);
  }

  // Inject Debug UI if in dev mode
  if (import.meta.env.VITE_ENV === "dev") {
    mountDebugPanel(
      (systemId) => {
        const sys = SYSTEMS.find((s) => s.id === systemId);
        if (sys) loadSystem(sys);
      },
      () => {
        const maxLE = getMaxLE(gameState.upgrades);
        const maxMono = getMaxMono(gameState.upgrades);
        gameState.liquidErgol = maxLE;
        gameState.monergol = maxMono;
        if (galaxy.ship) {
          galaxy.ship.liquidErgol = maxLE;
          galaxy.ship.monergol = maxMono;
        }
      },
      () => {
        gameState.upgrades = {
          parts: gameState.upgrades.parts,
          thrustLevel: 4,
          autoStab: true,
          hullLevel: 3,
          lErgolLevel: 3,
          headingLockTier: 3,
          trajSteps: 5000,
          retroBurn: true,
          rcsBoostLevel: 2,
          approachMfd: true,
          emergRes: true,
          secondMfd: true,
          maneuverNode: true,
          monoTankII: true,
          tidalSensor: true,
        };
        if (galaxy.ship) galaxy.ship.applyUpgrades(gameState.upgrades);
        saveGame(gameState);
      },
      () => {
        gameState.upgrades.parts += 1000;
        saveGame(gameState);
        console.log(`Added 1000 parts. Total: ${gameState.upgrades.parts}`);
      },
    );
  }

  let lastTime = 0;
  const UPDATE_INTERVAL_MS = 200;
  let lastUpdate = Date.now();
  let lastSave = Date.now();

  const FIXED_STEP = 1 / 60;
  let accumulator = 0;

  // Handle tab visibility to auto-pause and prevent "catch-up" freeze
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      paused = true;
      cockpitRef.current?.setPaused(true);
    } else {
      // Reset lastTime to current performance.now() to avoid huge delta
      lastTime = performance.now();
      paused = false;
      cockpitRef.current?.setPaused(false);
    }
  });

  Promise.all([loadImage(spriteThrusterOffUrl), loadImage(spriteThrusterOnUrl)])
    .then(([spriteOff, spriteOn]) => {
      let spawnPos = new Vec2(0, 0);
      let spawnVel = new Vec2(0, 0);

      const radius = 0.7;
      const angle = Math.random() * Math.PI * 2;
      spawnPos = new Vec2(Math.cos(angle) * radius, Math.sin(angle) * radius);
      spawnVel = Star.getVelocity(spawnPos, blackholes[0], 2.1 * 10e1);

      const ship = new Ship(
        spawnPos,
        spriteOff,
        spriteOn,
        60,
        true,
        blackholes,
      );
      ship.vel = spawnVel;
      ship.applyUpgrades(gameState.upgrades);
      ship.liquidErgol = gameState.liquidErgol;
      ship.monergol = gameState.monergol;
      galaxy.ship = ship;
    })
    .catch(console.error);

  function animate(time: number) {
    // Clamp rawDelta to 0.1s to prevent massive catch-up loops if rAF skips many frames
    const rawDelta = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    if (!paused) accumulator += rawDelta * SIMULATION_SPEED;

    if (!paused && decayTimer !== null) {
      decayTimer -= rawDelta;
      if (decayTimer <= 0 && gameState.mode === "RELAY") {
        decayTimer = decayMax;
        const ship = galaxy.ship;
        if (ship) {
          const r = 0.7;
          const a = Math.random() * Math.PI * 2;
          ship.pos = new Vec2(Math.cos(a) * r, Math.sin(a) * r);
          ship.vel = Star.getVelocity(ship.pos, blackholes[0], 2.1 * 10e1);
        }
      }
    }

    const shipForBoundary = galaxy.ship;
    if (shipForBoundary) {
      const dist = Math.hypot(shipForBoundary.pos.x, shipForBoundary.pos.y);
      const boundary = currentConfig.systemBoundaryRadius;
      if (!galaxy.transitMode && dist > boundary) {
        galaxy.enterTransitMode();
      } else if (galaxy.transitMode && dist > boundary * 1.5) {
        const target =
          (transitTargetId
            ? SYSTEMS.find((s) => s.id === transitTargetId)
            : null) ??
          SYSTEMS[(SYSTEMS.indexOf(currentConfig) + 1) % SYSTEMS.length];
        transitTargetId = null;
        loadSystem(target);
      }
    }

    const now = Date.now();
    if (now - lastSave >= 10_000) {
      saveGame(gameState);
      lastSave = now;
    }
    if (now - lastUpdate >= UPDATE_INTERVAL_MS) {
      const activeStars = galaxy.stars.filter((s) => !s.shouldDestroy).length;
      const ship = galaxy.ship;
      const cam = canvas2d.camera;
      const distFromCam = ship
        ? Math.hypot(ship.pos.x - cam.x, ship.pos.y - cam.y)
        : 0;

      cockpitRef.current?.update({
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
        completedCount: gameState.completedSystems.length,
        systemId: gameState.currentSystemId,
        totalSystems: SYSTEMS.length,
      });

      lastUpdate = now;
    }

    // Redraw status gauges every frame for smooth pulse animation and high speed refresh
    const ship2 = galaxy.ship;
    if (ship2) {
      cockpitRef.current?.updateStatusGauges(
        ship2.vel.x,
        ship2.vel.y,
        ship2.liquidErgol,
        ship2.maxLiquidErgol,
        ship2.monergol,
        ship2.maxMonergol,
        decayTimer,
        decayMax,
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
