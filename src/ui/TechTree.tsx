import { render, createRef } from 'preact';
import { forwardRef, useImperativeHandle } from 'preact/compat';
import { useState, useRef, useEffect } from 'preact/hooks';
import type { GameState, UpgradeState } from '../core/GameState';
import { drawProbeDynamic } from '../sprites/probe';
import './TechTree.scss';

type NodeDef = {
  id: string; label: string; effect: string; cost: number; level: number;
  prereqs: string[];
  done: (u: UpgradeState) => boolean;
  apply: (u: UpgradeState) => void;
};

function N(id: string, label: string, effect: string, cost: number, level: number, prereqs: string[], done: (u: UpgradeState) => boolean, apply: (u: UpgradeState) => void): NodeDef {
  return { id, label, effect, cost, level, prereqs, done, apply };
}

const NODES: NodeDef[] = [
  N('autoStab','GYRO CORE','Automated angular damping — ship holds heading without input',1,0,[],u=>u.autoStab,u=>{u.autoStab=true;}),
  N('thrustI','ION CELL','+20% main engine thrust',1,1,['autoStab'],u=>u.thrustLevel>=1,u=>{u.thrustLevel=1;}),
  N('progradeLock','STAR TRACKER','Locks heading to prograde (velocity direction)',1,1,['autoStab'],u=>u.headingLockTier>=1,u=>{u.headingLockTier=1;}),
  N('lErgolI','FUEL DEPOT I','+100 liquid ergol capacity',1,2,['thrustI'],u=>u.lErgolLevel>=1,u=>{u.lErgolLevel=1;}),
  N('hullI','SHELL PLATE','Structural reinforcement — tidal shielding level 1',2,2,['thrustI'],u=>u.hullLevel>=1,u=>{u.hullLevel=1;}),
  N('retroBurn','FLIP SEQUENCER','Locks heading to retrograde (opposite velocity)',2,2,['progradeLock'],u=>u.retroBurn,u=>{u.retroBurn=true;}),
  N('traj500','FLIGHT CPU','500-step trajectory prediction',1,2,['progradeLock'],u=>u.trajSteps>=500,u=>{u.trajSteps=500;}),
  N('thrustII','PLASMA INJECTOR','+40% main engine thrust',1,3,['lErgolI'],u=>u.thrustLevel>=2,u=>{u.thrustLevel=2;}),
  N('rcsBoostI','COLD JETS','+20% RCS authority — faster rotation and docking',1,3,['hullI'],u=>u.rcsBoostLevel>=1,u=>{u.rcsBoostLevel=1;}),
  N('radialLock','VECTOR LOCK','Locks heading to radial (toward black hole)',2,3,['retroBurn'],u=>u.headingLockTier>=2,u=>{u.headingLockTier=2;}),
  N('traj1k','DEEP PLANNER','1000-step trajectory prediction',2,3,['traj500'],u=>u.trajSteps>=1000,u=>{u.trajSteps=1000;}),
  N('lErgolII','FUEL DEPOT II','+150 liquid ergol capacity',2,4,['thrustII'],u=>u.lErgolLevel>=2,u=>{u.lErgolLevel=2;}),
  N('hullII','ABLATIVE COAT','Heat-resistant layering — tidal shielding level 2',2,4,['rcsBoostI'],u=>u.hullLevel>=2,u=>{u.hullLevel=2;}),
  N('rcsBoostII','MICRO JETS','+40% RCS authority — precision fine control',2,4,['rcsBoostI'],u=>u.rcsBoostLevel>=2,u=>{u.rcsBoostLevel=2;}),
  N('maneuverNode','NODE EDITOR','Full maneuver node planning — all heading lock modes',3,4,['radialLock'],u=>u.headingLockTier>=3,u=>{u.headingLockTier=3;u.maneuverNode=true;}),
  N('traj5k','HORIZON SCAN','5000-step trajectory prediction',2,4,['traj1k'],u=>u.trajSteps>=5000,u=>{u.trajSteps=5000;}),
  N('thrustIII','ARC DRIVE','+60% main engine thrust',2,5,['lErgolII'],u=>u.thrustLevel>=3,u=>{u.thrustLevel=3;}),
  N('lErgolIII','FUEL DEPOT III','+150 liquid ergol capacity — max reserves',3,5,['lErgolII'],u=>u.lErgolLevel>=3,u=>{u.lErgolLevel=3;}),
  N('hullIII','NEUTRON PLATE','Dense composite armor — tidal shielding level 3',3,5,['hullII'],u=>u.hullLevel>=3,u=>{u.hullLevel=3;}),
  N('monoTankII','MONO RESERVE','+40 monopropellant — extended RCS endurance',2,5,['maneuverNode'],u=>u.monoTankII,u=>{u.monoTankII=true;}),
  N('approachMfd','PROX DISPLAY','Approach MFD — relative speed, range, RCS bars',1,5,['traj5k'],u=>u.approachMfd,u=>{u.approachMfd=true;}),
  N('thrustIV','PULSE DRIVE','+80% main engine thrust — maximum output',3,6,['thrustIII'],u=>u.thrustLevel>=4,u=>{u.thrustLevel=4;}),
  N('tidalSensor','FLUX PROBE','Displays tidal force intensity and shield margin',2,6,['hullIII'],u=>u.tidalSensor,u=>{u.tidalSensor=true;}),
  N('secondMfd','DUAL SCREEN','Second MFD slot — display two views simultaneously',2,6,['approachMfd'],u=>u.secondMfd,u=>{u.secondMfd=true;}),
  N('emergRes','BACKUP CELL','Emergency power reserve — extends survival on low fuel',2,6,['approachMfd'],u=>u.emergRes,u=>{u.emergRes=true;}),
];

const TREE_W = 640, ROW_H = 92, TOP_PAD = 36, TREE_H = 7 * ROW_H + TOP_PAD + 48;

const LEVELS: NodeDef[][] = Array.from({ length: 7 }, () => []);
for (const node of NODES) LEVELS[node.level].push(node);

const NODE_POS = new Map(NODES.map(node => {
  const li = LEVELS[node.level].indexOf(node);
  return [node.id, { cx: (li + 0.5) / LEVELS[node.level].length * TREE_W, cy: TOP_PAD + node.level * ROW_H + ROW_H / 2 }];
}));

function drawLines(cv: HTMLCanvasElement, u: UpgradeState) {
  const ctx = cv.getContext('2d')!;
  ctx.clearRect(0, 0, TREE_W, TREE_H); ctx.lineWidth = 1.5;
  for (const node of NODES) {
    const cp = NODE_POS.get(node.id)!;
    const cdone = node.done(u), cavail = node.prereqs.every(p => NODES.find(n => n.id === p)!.done(u));
    for (const pid of node.prereqs) {
      const pp = NODE_POS.get(pid)!;
      const pdone = NODES.find(n => n.id === pid)!.done(u);
      ctx.strokeStyle = cdone && pdone ? 'rgba(108,185,115,0.4)' : cavail ? 'rgba(80,182,201,0.35)' : 'rgba(255,255,255,0.07)';
      ctx.beginPath(); ctx.moveTo(pp.cx, pp.cy);
      ctx.bezierCurveTo(pp.cx, pp.cy + ROW_H * 0.45, cp.cx, cp.cy - ROW_H * 0.45, cp.cx, cp.cy);
      ctx.stroke();
    }
  }
}

function drawPreview(cv: HTMLCanvasElement, u: UpgradeState) {
  const ctx = cv.getContext('2d')!;
  ctx.clearRect(0, 0, 220, 220);
  drawProbeDynamic(ctx, 0, 220, { hull: u.hullLevel, thrust: Math.min(u.thrustLevel, 3), ergol: Math.min(u.lErgolLevel, 2), rcs: u.rcsBoostLevel, avionics: Math.min(u.headingLockTier, 2) });
}

export interface TechTreeRef { toggle(): void; }

const TechTreeComponent = forwardRef<TechTreeRef, { gs: GameState; onUpgrade: () => void }>(
  ({ gs, onUpgrade }, ref) => {
    const [visible, setVisible] = useState(false);
    const [, bump] = useState(0);
    const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
    const linesCv = useRef<HTMLCanvasElement>(null);
    const previewCv = useRef<HTMLCanvasElement>(null);

    useImperativeHandle(ref, () => ({ toggle: () => setVisible(v => !v) }));

    useEffect(() => {
      if (!visible) return;
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setVisible(false); };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }, [visible]);

    useEffect(() => {
      if (!linesCv.current || !previewCv.current) return;
      drawLines(linesCv.current, gs.upgrades);
      drawPreview(previewCv.current, gs.upgrades);
    });

    if (!visible) return null;

    const u = gs.upgrades;
    return (
      <div class="tech-overlay" onClick={e => { if (e.target === e.currentTarget) setVisible(false); }}>
        {tip && <div class="node-tooltip" style={{ display: 'block', left: `${tip.x}px`, top: `${tip.y}px` }}>{tip.text}</div>}
        <div class="tech-inner">
          <div class="tech-left">
            <div class="tech-header"><span>TECH TREE</span><span class="tech-parts">{u.parts} parts</span></div>
            <div class="tech-tree-area">
              <canvas ref={linesCv} class="tree-lines" width={TREE_W} height={TREE_H} />
              {NODES.map(node => {
                const done = node.done(u);
                const prereqsMet = node.prereqs.every(p => NODES.find(n => n.id === p)!.done(u));
                const available = !done && prereqsMet;
                const canBuy = available && u.parts >= node.cost;
                const { cx, cy } = NODE_POS.get(node.id)!;
                return (
                  <div key={node.id}
                    class={`tech-node${done ? ' tech-done' : available ? ` tech-available${canBuy ? '' : ' tech-no-parts'}` : ''}`}
                    style={{ left: `${cx}px`, top: `${cy}px` }}
                    onClick={canBuy ? e => { if ((e.target as HTMLElement).classList.contains('node-info')) return; u.parts -= node.cost; node.apply(u); onUpgrade(); bump(x => x + 1); } : undefined}
                  >
                    <div class="tech-name">{node.label}</div>
                    <div class="tech-cost">{done ? '✓' : `${node.cost}p`}</div>
                    <span class="node-info"
                      onMouseEnter={e => { setTip({ x: e.clientX + 12, y: e.clientY - 8, text: node.effect }); e.stopPropagation(); }}
                      onMouseLeave={() => setTip(null)}>i</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div class="tech-preview">
            <div class="preview-title">SHIP PREVIEW</div>
            <canvas ref={previewCv} class="preview-canvas" width={220} height={220} />
          </div>
        </div>
      </div>
    );
  }
);

export function mountTechTree(gs: GameState, onUpgrade: () => void) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const r = createRef<TechTreeRef>();
  render(<TechTreeComponent ref={r} gs={gs} onUpgrade={onUpgrade} />, el);
  return { toggle: () => r.current?.toggle() };
}
