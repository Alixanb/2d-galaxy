import type { GameState, UpgradeState } from '../core/GameState';
import { drawProbeDynamic } from '../sprites/probe';

type NodeDef = {
  id: string; label: string; effect: string; cost: number; level: number;
  prereqs: string[];
  done: (u: UpgradeState) => boolean;
  apply: (u: UpgradeState) => void;
};

function N(
  id: string, label: string, effect: string, cost: number, level: number,
  prereqs: string[],
  done: (u: UpgradeState) => boolean,
  apply: (u: UpgradeState) => void,
): NodeDef {
  return { id, label, effect, cost, level, prereqs, done, apply };
}

// Pure tree — each node has exactly 1 parent. Branches only split, never rejoin.
// Sequential upgrades of the same type are always ancestor→descendant.
//
// Shape: 1 → 2 → 4 → 4 → 5 → 5 → 4  (25 nodes)
//
// L0           [GYRO CORE]
// L1      [ION CELL]  [STAR TRACKER]
// L2   [FUEL I][SHELL][FLIP SEQ][FLIGHT CPU]
// L3   [ION II][COLD JETS][VEC LOCK][DEEP PLN]
// L4 [FUEL II][HULL II][MICRO JETS][NODE EDIT][HORIZ]
// L5 [ION III][FUEL III][NEUT PLATE][MONO RES][PROX HUD]
// L6  [PULSE DRV][FLUX PROBE][DUAL SCRN][BACKP CELL]

const NODES: NodeDef[] = [
  // ── L0 ────────────────────────────────────────────────────────────────────
  N('autoStab', 'GYRO CORE', 'Automated angular damping — ship holds heading without input',
    1, 0, [],
    u => u.autoStab, u => { u.autoStab = true; }),

  // ── L1 ────────────────────────────────────────────────────────────────────
  N('thrustI', 'ION CELL', '+20% main engine thrust',
    1, 1, ['autoStab'],
    u => u.thrustLevel >= 1, u => { u.thrustLevel = 1; }),

  N('progradeLock', 'STAR TRACKER', 'Locks heading to prograde (velocity direction)',
    1, 1, ['autoStab'],
    u => u.headingLockTier >= 1, u => { u.headingLockTier = 1; }),

  // ── L2 ────────────────────────────────────────────────────────────────────
  N('lErgolI', 'FUEL DEPOT I', '+100 liquid ergol capacity',
    1, 2, ['thrustI'],
    u => u.lErgolLevel >= 1, u => { u.lErgolLevel = 1; }),

  N('hullI', 'SHELL PLATE', 'Structural reinforcement — tidal shielding level 1',
    2, 2, ['thrustI'],
    u => u.hullLevel >= 1, u => { u.hullLevel = 1; }),

  N('retroBurn', 'FLIP SEQUENCER', 'Locks heading to retrograde (opposite velocity)',
    2, 2, ['progradeLock'],
    u => u.retroBurn, u => { u.retroBurn = true; }),

  N('traj500', 'FLIGHT CPU', '500-step trajectory prediction',
    1, 2, ['progradeLock'],
    u => u.trajSteps >= 500, u => { u.trajSteps = 500; }),

  // ── L3 ────────────────────────────────────────────────────────────────────
  N('thrustII', 'PLASMA INJECTOR', '+40% main engine thrust',
    1, 3, ['lErgolI'],
    u => u.thrustLevel >= 2, u => { u.thrustLevel = 2; }),

  N('rcsBoostI', 'COLD JETS', '+20% RCS authority — faster rotation and docking',
    1, 3, ['hullI'],
    u => u.rcsBoostLevel >= 1, u => { u.rcsBoostLevel = 1; }),

  N('radialLock', 'VECTOR LOCK', 'Locks heading to radial (toward black hole)',
    2, 3, ['retroBurn'],
    u => u.headingLockTier >= 2, u => { u.headingLockTier = 2; }),

  N('traj1k', 'DEEP PLANNER', '1000-step trajectory prediction',
    2, 3, ['traj500'],
    u => u.trajSteps >= 1000, u => { u.trajSteps = 1000; }),

  // ── L4 ────────────────────────────────────────────────────────────────────
  N('lErgolII', 'FUEL DEPOT II', '+150 liquid ergol capacity',
    2, 4, ['thrustII'],
    u => u.lErgolLevel >= 2, u => { u.lErgolLevel = 2; }),

  N('hullII', 'ABLATIVE COAT', 'Heat-resistant layering — tidal shielding level 2',
    2, 4, ['rcsBoostI'],
    u => u.hullLevel >= 2, u => { u.hullLevel = 2; }),

  N('rcsBoostII', 'MICRO JETS', '+40% RCS authority — precision fine control',
    2, 4, ['rcsBoostI'],
    u => u.rcsBoostLevel >= 2, u => { u.rcsBoostLevel = 2; }),

  N('maneuverNode', 'NODE EDITOR', 'Full maneuver node planning — all heading lock modes',
    3, 4, ['radialLock'],
    u => u.headingLockTier >= 3, u => { u.headingLockTier = 3; u.maneuverNode = true; }),

  N('traj5k', 'HORIZON SCAN', '5000-step trajectory prediction',
    2, 4, ['traj1k'],
    u => u.trajSteps >= 5000, u => { u.trajSteps = 5000; }),

  // ── L5 ────────────────────────────────────────────────────────────────────
  N('thrustIII', 'ARC DRIVE', '+60% main engine thrust',
    2, 5, ['lErgolII'],
    u => u.thrustLevel >= 3, u => { u.thrustLevel = 3; }),

  N('lErgolIII', 'FUEL DEPOT III', '+150 liquid ergol capacity — max reserves',
    3, 5, ['lErgolII'],
    u => u.lErgolLevel >= 3, u => { u.lErgolLevel = 3; }),

  N('hullIII', 'NEUTRON PLATE', 'Dense composite armor — tidal shielding level 3',
    3, 5, ['hullII'],
    u => u.hullLevel >= 3, u => { u.hullLevel = 3; }),

  N('monoTankII', 'MONO RESERVE', '+40 monopropellant — extended RCS endurance',
    2, 5, ['maneuverNode'],
    u => u.monoTankII, u => { u.monoTankII = true; }),

  N('approachMfd', 'PROX DISPLAY', 'Approach MFD — relative speed, range, RCS bars',
    1, 5, ['traj5k'],
    u => u.approachMfd, u => { u.approachMfd = true; }),

  // ── L6 ────────────────────────────────────────────────────────────────────
  N('thrustIV', 'PULSE DRIVE', '+80% main engine thrust — maximum output',
    3, 6, ['thrustIII'],
    u => u.thrustLevel >= 4, u => { u.thrustLevel = 4; }),

  N('tidalSensor', 'FLUX PROBE', 'Displays tidal force intensity and shield margin',
    2, 6, ['hullIII'],
    u => u.tidalSensor, u => { u.tidalSensor = true; }),

  N('secondMfd', 'DUAL SCREEN', 'Second MFD slot — display two views simultaneously',
    2, 6, ['approachMfd'],
    u => u.secondMfd, u => { u.secondMfd = true; }),

  N('emergRes', 'BACKUP CELL', 'Emergency power reserve — extends survival on low fuel',
    2, 6, ['approachMfd'],
    u => u.emergRes, u => { u.emergRes = true; }),
];

const TREE_W  = 640;
const ROW_H   = 92;
const TOP_PAD = 36;
const TREE_H  = 7 * ROW_H + TOP_PAD + 48;

export class TechTree {
  private el: HTMLDivElement;
  private gs: GameState;
  private partsEl: HTMLElement;
  private treeArea: HTMLDivElement;
  private treeCanvas: HTMLCanvasElement;
  private tooltip: HTMLDivElement;
  private onUpgrade: () => void;
  private previewCanvas: HTMLCanvasElement;

  constructor(gs: GameState, onUpgrade: () => void) {
    this.gs = gs;
    this.onUpgrade = onUpgrade;

    this.el = document.createElement('div');
    this.el.className = 'tech-overlay';
    this.el.style.display = 'none';

    // Global tooltip
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'node-tooltip';
    this.el.appendChild(this.tooltip);

    const inner = document.createElement('div');
    inner.className = 'tech-inner';

    const left = document.createElement('div');
    left.className = 'tech-left';

    const hdr = document.createElement('div');
    hdr.className = 'tech-header';
    const title = document.createElement('span');
    title.textContent = 'TECH TREE';
    this.partsEl = document.createElement('span');
    this.partsEl.className = 'tech-parts';
    hdr.append(title, this.partsEl);

    this.treeArea = document.createElement('div');
    this.treeArea.className = 'tech-tree-area';

    this.treeCanvas = document.createElement('canvas');
    this.treeCanvas.className = 'tree-lines';
    this.treeCanvas.width = TREE_W;
    this.treeCanvas.height = TREE_H;
    this.treeArea.appendChild(this.treeCanvas);

    left.append(hdr, this.treeArea);

    const preview = document.createElement('div');
    preview.className = 'tech-preview';

    const previewTitle = document.createElement('div');
    previewTitle.className = 'preview-title';
    previewTitle.textContent = 'SHIP PREVIEW';

    this.previewCanvas = document.createElement('canvas');
    this.previewCanvas.className = 'preview-canvas';
    this.previewCanvas.width = 220;
    this.previewCanvas.height = 220;

    preview.append(previewTitle, this.previewCanvas);
    inner.append(left, preview);
    this.el.appendChild(inner);
    document.body.appendChild(this.el);

    this.el.addEventListener('click', (e) => { if (e.target === this.el) this.close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.isOpen()) this.close(); });
  }

  isOpen() { return this.el.style.display !== 'none'; }

  toggle() {
    if (this.isOpen()) { this.close(); return; }
    this.el.style.display = 'flex';
    this.render();
  }

  private close() { this.el.style.display = 'none'; }

  private isDone(id: string) { return NODES.find(n => n.id === id)!.done(this.gs.upgrades); }

  private refreshPreview() {
    const u = this.gs.upgrades;
    const ctx = this.previewCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, 220, 220);
    drawProbeDynamic(ctx, 0, 220, {
      hull:     u.hullLevel,
      thrust:   Math.min(u.thrustLevel, 3),
      ergol:    Math.min(u.lErgolLevel, 2),
      rcs:      u.rcsBoostLevel,
      avionics: Math.min(u.headingLockTier, 2),
    });
  }

  private nodePos(node: NodeDef, levels: NodeDef[][]): { cx: number; cy: number } {
    const levelNodes = levels[node.level];
    const colIdx = levelNodes.indexOf(node);
    const cx = (colIdx + 0.5) / levelNodes.length * TREE_W;
    const cy = TOP_PAD + node.level * ROW_H + ROW_H / 2;
    return { cx, cy };
  }

  private render() {
    const u = this.gs.upgrades;
    this.partsEl.textContent = `${u.parts} parts`;

    Array.from(this.treeArea.children).forEach(c => { if (c !== this.treeCanvas) c.remove(); });

    const levels: NodeDef[][] = Array.from({ length: 7 }, () => []);
    for (const node of NODES) levels[node.level].push(node);

    const pos = new Map<string, { cx: number; cy: number }>();

    for (const node of NODES) {
      const done = node.done(u);
      const prereqsMet = node.prereqs.every(p => this.isDone(p));
      const available = !done && prereqsMet;
      const canBuy = available && u.parts >= node.cost;

      const { cx, cy } = this.nodePos(node, levels);
      pos.set(node.id, { cx, cy });

      const el = document.createElement('div');
      el.className = 'tech-node'
        + (done ? ' tech-done' : available ? ' tech-available' + (canBuy ? '' : ' tech-no-parts') : '');
      el.style.left = cx + 'px';
      el.style.top = cy + 'px';

      const info = document.createElement('span');
      info.className = 'node-info';
      info.textContent = 'i';
      info.addEventListener('mouseenter', (e) => {
        this.tooltip.textContent = node.effect;
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = (e.clientX + 12) + 'px';
        this.tooltip.style.top = (e.clientY - 8) + 'px';
        e.stopPropagation();
      });
      info.addEventListener('mouseleave', () => { this.tooltip.style.display = 'none'; });

      el.innerHTML = `<div class="tech-name">${node.label}</div><div class="tech-cost">${done ? '✓' : node.cost + 'p'}</div>`;
      el.appendChild(info);

      if (canBuy) {
        el.addEventListener('click', (e) => {
          if ((e.target as HTMLElement).classList.contains('node-info')) return;
          u.parts -= node.cost;
          node.apply(u);
          this.onUpgrade();
          this.render();
          this.refreshPreview();
        });
      }

      this.treeArea.appendChild(el);
    }

    // Connector lines
    const ctx = this.treeCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, TREE_W, TREE_H);
    ctx.lineWidth = 1.5;

    for (const node of NODES) {
      const childP = pos.get(node.id)!;
      const childDone = node.done(u);
      const childAvail = node.prereqs.every(p => this.isDone(p));

      for (const pid of node.prereqs) {
        const parentP = pos.get(pid)!;
        const parentDone = this.isDone(pid);

        ctx.strokeStyle = (childDone && parentDone)
          ? 'rgba(108, 185, 115, 0.4)'
          : childAvail
            ? 'rgba(80, 182, 201, 0.35)'
            : 'rgba(255, 255, 255, 0.07)';

        ctx.beginPath();
        ctx.moveTo(parentP.cx, parentP.cy);
        ctx.bezierCurveTo(
          parentP.cx, parentP.cy + ROW_H * 0.45,
          childP.cx,  childP.cy  - ROW_H * 0.45,
          childP.cx,  childP.cy,
        );
        ctx.stroke();
      }
    }

    this.refreshPreview();
  }
}
