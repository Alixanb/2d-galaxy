import { render, createRef } from 'preact';
import { forwardRef, useImperativeHandle } from 'preact/compat';
import { useState, useRef, useEffect } from 'preact/hooks';
import { SYSTEMS, type SystemConfig } from '../data/systems';
import type { GameState } from '../core/GameState';
import './GalaxyMap.scss';

const CONNECTIONS: [string, string][] = [
  ['SOL-0','ECHO-1'],['SOL-0','DRIFT-2'],
  ['ECHO-1','VOID-4'],['ECHO-1','TWIN-I'],
  ['DRIFT-2','VOID-4'],
  ['VOID-4','TWIN-I'],['VOID-4','TIDE-5'],
  ['TWIN-I','TIDE-5'],['TWIN-I','TWIN-II'],
  ['TIDE-5','TWIN-II'],['TIDE-5','DEEP-8'],
  ['TWIN-II','TRIAD-I'],
  ['DEEP-8','SINGULARITY'],
];

const TIDAL_COL: Record<string, string> = {
  None:'#6cb973', Low:'#e9d628', Medium:'#f5a623', High:'#ec2626', Extreme:'#c026ec',
};

export interface GalaxyMapRef { toggle(): void; }

function toScreen(mapPos: [number, number], W: number, H: number): [number, number] {
  const p = 100;
  return [p + mapPos[0] * (W - p * 2), p + mapPos[1] * (H - p * 2)];
}

function hitTest(mx: number, my: number, W: number, H: number): SystemConfig | null {
  return SYSTEMS.find(s => { const [sx, sy] = toScreen(s.mapPos, W, H); return Math.hypot(mx - sx, my - sy) <= 14; }) ?? null;
}

function isUnlocked(id: string, gs: GameState): boolean {
  if (id === gs.currentSystemId) return true;
  return CONNECTIONS.some(([a, b]) => {
    const other = a === id ? b : b === id ? a : null;
    return other !== null && (other === gs.currentSystemId || gs.completedSystems.includes(other));
  });
}

function drawMap(cv: HTMLCanvasElement, gs: GameState, hov: string | null) {
  const c = cv.getContext('2d')!;
  const W = cv.width, H = cv.height;
  c.clearRect(0, 0, W, H);
  c.fillStyle = 'rgba(19,14,14,0.94)'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#ecdfcd'; c.font = 'bold 16px monospace'; c.fillText('GALAXY MAP', 40, 36);
  c.fillStyle = 'rgba(236,223,205,0.4)'; c.font = '11px monospace';
  c.fillText('Click adjacent system to set transit target · ESC to close', 40, 56);
  for (const [a, b] of CONNECTIONS) {
    const sa = SYSTEMS.find(s => s.id === a)!, sb = SYSTEMS.find(s => s.id === b)!;
    const [ax, ay] = toScreen(sa.mapPos, W, H), [bx, by] = toScreen(sb.mapPos, W, H);
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by);
    c.strokeStyle = (isUnlocked(a, gs) && isUnlocked(b, gs)) ? 'rgba(236,223,205,0.2)' : 'rgba(236,223,205,0.06)';
    c.lineWidth = 1; c.stroke();
  }
  for (const sys of SYSTEMS) {
    const [sx, sy] = toScreen(sys.mapPos, W, H);
    const cur = sys.id === gs.currentSystemId;
    const done = gs.completedSystems.includes(sys.id);
    const ul = isUnlocked(sys.id, gs);
    const col = TIDAL_COL[sys.tidalRating];
    const r = cur ? 11 : 8;
    c.beginPath(); c.arc(sx, sy, r, 0, Math.PI * 2);
    c.fillStyle = !ul ? 'rgba(80,80,80,0.25)' : sys.id === hov ? col : done ? col + '55' : 'rgba(19,14,14,0.9)';
    c.fill(); c.strokeStyle = ul ? col : '#555'; c.lineWidth = cur ? 3 : 1.5; c.stroke();
    if (cur) { c.beginPath(); c.arc(sx, sy, r + 6, 0, Math.PI * 2); c.strokeStyle = col + '44'; c.lineWidth = 1; c.stroke(); }
    c.fillStyle = ul ? '#ecdfcd' : 'rgba(236,223,205,0.3)'; c.font = '10px monospace';
    c.textAlign = 'center'; c.fillText(sys.id, sx, sy + r + 14); c.textAlign = 'left';
  }
}

const GalaxyMapComponent = forwardRef<GalaxyMapRef, { gs: GameState; onTransit: (id: string) => void }>(
  ({ gs, onTransit }, ref) => {
    const [visible, setVisible] = useState(false);
    const [hov, setHov] = useState<string | null>(null);
    const [tip, setTip] = useState<{ x: number; y: number; sys: SystemConfig } | null>(null);
    const cvRef = useRef<HTMLCanvasElement>(null);

    useImperativeHandle(ref, () => ({ toggle: () => setVisible(v => !v) }));

    useEffect(() => {
      if (!visible || !cvRef.current) return;
      const cv = cvRef.current;
      cv.width = window.innerWidth; cv.height = window.innerHeight;
      drawMap(cv, gs, hov);
      const onResize = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; drawMap(cv, gs, hov); };
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setVisible(false); };
      window.addEventListener('resize', onResize);
      document.addEventListener('keydown', onKey);
      return () => { window.removeEventListener('resize', onResize); document.removeEventListener('keydown', onKey); };
    }, [visible, hov, gs]);

    const onMouseMove = (e: MouseEvent) => {
      const cv = cvRef.current!;
      const r = cv.getBoundingClientRect();
      const sys = hitTest(e.clientX - r.left, e.clientY - r.top, cv.width, cv.height);
      setHov(sys?.id ?? null);
      setTip(sys ? { x: e.clientX + 12, y: e.clientY - 8, sys } : null);
    };

    const onClickCanvas = (e: MouseEvent) => {
      const cv = cvRef.current!;
      const r = cv.getBoundingClientRect();
      const sys = hitTest(e.clientX - r.left, e.clientY - r.top, cv.width, cv.height);
      if (!sys || sys.id === gs.currentSystemId || !isUnlocked(sys.id, gs)) return;
      onTransit(sys.id); setVisible(false);
    };

    if (!visible) return null;

    return (
      <div class="gmap-overlay" onClick={e => { if (e.target === e.currentTarget) setVisible(false); }}>
        <canvas ref={cvRef} onMouseMove={onMouseMove} onClick={onClickCanvas} />
        {tip && (
          <div class="gmap-tip" style={{ display: 'block', left: `${tip.x}px`, top: `${tip.y}px` }}>
            <b>{tip.sys.name}</b><br />BH: {tip.sys.bhCount} &middot; Tidal: {tip.sys.tidalRating}<br />Parts: +{tip.sys.partsReward}
          </div>
        )}
      </div>
    );
  }
);

export function mountGalaxyMap(gs: GameState, onTransit: (id: string) => void) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const r = createRef<GalaxyMapRef>();
  render(<GalaxyMapComponent ref={r} gs={gs} onTransit={onTransit} />, el);
  return { toggle: () => r.current?.toggle() };
}
