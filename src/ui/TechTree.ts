import type { GameState, UpgradeState } from '../core/GameState';

type Col = 'left' | 'right' | 'cross';
type NodeDef = {
  id: string; label: string; cost: number; col: Col;
  prereqs: string[];
  done: (u: UpgradeState) => boolean;
  apply: (u: UpgradeState) => void;
};

function N(id: string, label: string, cost: number, col: Col, prereqs: string[], done: (u: UpgradeState) => boolean, apply: (u: UpgradeState) => void): NodeDef {
  return { id, label, cost, col, prereqs, done, apply };
}

const NODES: NodeDef[] = [
  N('thrustI',      'THRUST I',      1, 'left',  [],                          u => u.thrustLevel >= 1,     u => { u.thrustLevel = 1; }),
  N('autoStab',     'AUTO-STAB',     1, 'right', [],                          u => u.autoStab,              u => { u.autoStab = true; }),
  N('hullI',        'HULL I',        2, 'cross', ['thrustI','autoStab'],      u => u.hullLevel >= 1,       u => { u.hullLevel = 1; }),
  N('lErgolI',      'L-ERGOL I',     1, 'left',  ['hullI'],                   u => u.lErgolLevel >= 1,     u => { u.lErgolLevel = 1; }),
  N('progradeLock', 'PROGRADE LOCK', 1, 'right', ['hullI'],                   u => u.headingLockTier >= 1, u => { u.headingLockTier = 1; }),
  N('traj500',      'TRAJ 500',      1, 'cross', ['lErgolI','progradeLock'],  u => u.trajSteps >= 500,     u => { u.trajSteps = 500; }),
  N('thrustII',     'THRUST II',     1, 'left',  ['traj500'],                 u => u.thrustLevel >= 2,     u => { u.thrustLevel = 2; }),
  N('retroBurn',    'RETRO BURN',    2, 'right', ['traj500'],                 u => u.retroBurn,             u => { u.retroBurn = true; }),
  N('hullII',       'HULL II',       2, 'cross', ['thrustII','retroBurn'],    u => u.hullLevel >= 2,       u => { u.hullLevel = 2; }),
  N('rcsBoostI',    'RCS BOOST I',   1, 'left',  ['hullII'],                  u => u.rcsBoostLevel >= 1,   u => { u.rcsBoostLevel = 1; }),
  N('approachMfd',  'APPROACH MFD',  1, 'right', ['hullII'],                  u => u.approachMfd,           u => { u.approachMfd = true; }),
  N('traj1k',       'TRAJ 1K',       2, 'cross', ['rcsBoostI','approachMfd'],u => u.trajSteps >= 1000,    u => { u.trajSteps = 1000; }),
  N('lErgolII',     'L-ERGOL II',    2, 'left',  ['traj1k'],                  u => u.lErgolLevel >= 2,     u => { u.lErgolLevel = 2; }),
  N('radialLock',   'RADIAL LOCK',   2, 'right', ['traj1k'],                  u => u.headingLockTier >= 2, u => { u.headingLockTier = 2; }),
  N('emergRes',     'EMERG RES',     2, 'cross', ['lErgolII','radialLock'],   u => u.emergRes,              u => { u.emergRes = true; }),
  N('thrustIII',    'THRUST III',    2, 'left',  ['emergRes'],                u => u.thrustLevel >= 3,     u => { u.thrustLevel = 3; }),
  N('secondMfd',    '2ND MFD SLOT',  2, 'right', ['emergRes'],                u => u.secondMfd,             u => { u.secondMfd = true; }),
  N('hullIII',      'HULL III',      3, 'cross', ['thrustIII','secondMfd'],   u => u.hullLevel >= 3,       u => { u.hullLevel = 3; }),
  N('rcsBoostII',   'RCS BOOST II',  2, 'left',  ['hullIII'],                 u => u.rcsBoostLevel >= 2,   u => { u.rcsBoostLevel = 2; }),
  N('maneuverNode', 'MANEUVER NODE', 3, 'right', ['hullIII'],                 u => u.headingLockTier >= 3, u => { u.headingLockTier = 3; u.maneuverNode = true; }),
  N('traj5k',       'TRAJ 5K',       2, 'cross', ['rcsBoostII','maneuverNode'],u => u.trajSteps >= 5000,  u => { u.trajSteps = 5000; }),
  N('monoTankII',   'MONO TANK II',  2, 'left',  ['traj5k'],                  u => u.monoTankII,            u => { u.monoTankII = true; }),
  N('tidalSensor',  'TIDAL SENSOR',  2, 'right', ['traj5k'],                  u => u.tidalSensor,           u => { u.tidalSensor = true; }),
  N('thrustIV',     'THRUST IV',     3, 'left',  ['monoTankII'],              u => u.thrustLevel >= 4,     u => { u.thrustLevel = 4; }),
  N('lErgolIII',    'L-ERGOL III',   3, 'right', ['tidalSensor'],             u => u.lErgolLevel >= 3,     u => { u.lErgolLevel = 3; }),
];

export class TechTree {
  private el: HTMLDivElement;
  private gs: GameState;
  private partsEl: HTMLElement;
  private gridEl: HTMLDivElement;
  private onUpgrade: () => void;

  constructor(gs: GameState, onUpgrade: () => void) {
    this.gs = gs;
    this.onUpgrade = onUpgrade;

    this.el = document.createElement('div');
    this.el.className = 'tech-overlay';
    this.el.style.display = 'none';

    const inner = document.createElement('div');
    inner.className = 'tech-inner';

    const hdr = document.createElement('div');
    hdr.className = 'tech-header';
    const title = document.createElement('span');
    title.textContent = 'TECH TREE';
    this.partsEl = document.createElement('span');
    this.partsEl.className = 'tech-parts';
    hdr.append(title, this.partsEl);

    this.gridEl = document.createElement('div');
    this.gridEl.className = 'tech-grid';

    inner.append(hdr, this.gridEl);
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

  private render() {
    const u = this.gs.upgrades;
    this.partsEl.textContent = `${u.parts} parts`;
    this.gridEl.innerHTML = '';

    for (const node of NODES) {
      const done = node.done(u);
      const prereqsMet = node.prereqs.every(p => this.isDone(p));
      const available = !done && prereqsMet;
      const canBuy = available && u.parts >= node.cost;

      const el = document.createElement('div');
      el.className = 'tech-node'
        + (node.col === 'cross' ? ' tech-cross' : '')
        + (done ? ' tech-done' : available ? ' tech-available' + (canBuy ? '' : ' tech-no-parts') : '');

      el.innerHTML = `<div class="tech-name">${node.label}</div><div class="tech-cost">${done ? '✓' : node.cost + 'p'}</div>`;

      if (canBuy) {
        el.addEventListener('click', () => {
          u.parts -= node.cost;
          node.apply(u);
          this.onUpgrade();
          this.render();
        });
      }

      this.gridEl.appendChild(el);
    }
  }
}
