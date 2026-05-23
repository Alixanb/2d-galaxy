import Galaxy from "../../systems/Galaxy";
import type { HeadingLockMode } from "../../core/GameState";
import { makeCockpitLabel } from "./CockpitUtils";

export class FlightControlsPanel {
  private root: HTMLElement;
  private galaxy: Galaxy;
  private autoStabBtn!: HTMLButtonElement;
  private retroBtn!: HTMLButtonElement;
  private pauseBtn!: HTMLButtonElement;
  private hlkBtns: { el: HTMLButtonElement; mode: HeadingLockMode; minTier: number }[] = [];
  private isPaused = false;
  private onPauseCb: (paused: boolean) => void;

  constructor(galaxy: Galaxy, onPause: (paused: boolean) => void) {
    this.galaxy = galaxy;
    this.onPauseCb = onPause;
    this.root = document.createElement("div");
    this.root.className = "autostab-section";

    this.root.appendChild(makeCockpitLabel("FLIGHT CTRL"));

    const wrap = document.createElement("div");
    wrap.className = "autostab-wrap";

    this.autoStabBtn = document.createElement("button");
    this.autoStabBtn.className = "autostab-btn";
    this.autoStabBtn.textContent = "AUTO-STAB";
    this.autoStabBtn.addEventListener("click", () => {
      const ship = this.galaxy.ship;
      if (!ship) return;
      const on = !ship.autoStab;
      ship.autoStab = on;
      this.autoStabBtn.classList.toggle("autostab-active", on);
      if (on) {
        ship.retrogradeActive = false;
        ship.retrogradePhase = null;
        this.updateRetroBtn(ship);
      }
    });

    this.retroBtn = document.createElement("button");
    this.retroBtn.className = "retro-btn";
    this.retroBtn.textContent = "RETRO BURN";
    this.retroBtn.addEventListener("click", () => {
      const ship = this.galaxy.ship;
      if (!ship) return;
      const on = !ship.retrogradeActive;
      ship.retrogradeActive = on;
      ship.retrogradePhase = on ? "align" : null;
      if (on) ship.headingLock = 'manual';
      if (on) {
        ship.autoStab = false;
        this.autoStabBtn.classList.remove("autostab-active");
      }
      this.updateRetroBtn(ship);
    });

    this.pauseBtn = document.createElement("button");
    this.pauseBtn.className = "autostab-btn";
    this.pauseBtn.textContent = "PAUSE";
    this.pauseBtn.addEventListener("click", () => {
      this.isPaused = !this.isPaused;
      this.pauseBtn.classList.toggle("autostab-active", this.isPaused);
      this.pauseBtn.textContent = this.isPaused ? "RESUME" : "PAUSE";
      this.onPauseCb(this.isPaused);
    });

    const dockBtn = document.createElement("button");
    dockBtn.className = "autostab-btn";
    dockBtn.textContent = "DOCK MODE";
    dockBtn.addEventListener("click", () => {
      const ship = this.galaxy.ship;
      if (!ship) return;
      ship.dockingMode = !ship.dockingMode;
      dockBtn.classList.toggle("autostab-active", ship.dockingMode);
    });

    wrap.appendChild(this.autoStabBtn);
    wrap.appendChild(this.retroBtn);
    wrap.appendChild(this.pauseBtn);
    wrap.appendChild(dockBtn);
    this.root.appendChild(wrap);

    const hlkDefs: { label: string; mode: HeadingLockMode; minTier: number }[] = [
      { label: 'MAN', mode: 'manual',     minTier: 0 },
      { label: 'PRO', mode: 'prograde',   minTier: 1 },
      { label: 'RET', mode: 'retrograde', minTier: 1 },
      { label: 'RDL', mode: 'radial',     minTier: 2 },
      { label: 'ANT', mode: 'anti-radial',minTier: 2 },
    ];
    const hlkRow = document.createElement('div');
    hlkRow.className = 'hlk-row';
    for (const { label, mode, minTier } of hlkDefs) {
      const btn = document.createElement('button');
      btn.className = 'hlk-btn';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        const ship = this.galaxy.ship;
        if (!ship) return;
        ship.headingLock = mode;
        if (mode !== 'manual') { ship.retrogradeActive = false; ship.retrogradePhase = null; }
      });
      hlkRow.appendChild(btn);
      this.hlkBtns.push({ el: btn, mode, minTier });
    }
    this.root.appendChild(hlkRow);
  }

  getRoot(): HTMLElement {
    return this.root;
  }

  update(): void {
    const ship = this.galaxy.ship;
    if (!ship) return;

    for (const { el, mode, minTier } of this.hlkBtns) {
      el.disabled = ship.headingLockTier < minTier;
      el.classList.toggle('hlk-active', ship.headingLock === mode);
    }

    this.updateRetroBtn(ship);
    this.autoStabBtn.classList.toggle("autostab-active", ship.autoStab);
  }

  private updateRetroBtn(ship: any): void {
    if (ship.retrogradePhase === "align") {
      this.retroBtn.classList.add("retro-active", "retro-align");
      this.retroBtn.classList.remove("retro-burn");
      this.retroBtn.textContent = "ALIGNING...";
    } else if (ship.retrogradePhase === "burn") {
      this.retroBtn.classList.add("retro-active", "retro-burn");
      this.retroBtn.classList.remove("retro-align");
      this.retroBtn.textContent = "RETRO BURN";
    } else {
      this.retroBtn.classList.remove("retro-active", "retro-align", "retro-burn");
      this.retroBtn.textContent = "RETRO BURN";
    }
  }

  setPaused(paused: boolean): void {
    this.isPaused = paused;
    this.pauseBtn.classList.toggle("autostab-active", paused);
    this.pauseBtn.textContent = paused ? "RESUME" : "PAUSE";
  }
}
