import { SYSTEMS } from '../data/systems';
import type { GameState } from '../core/GameState';

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

export class GalaxyMap {
  private el: HTMLDivElement;
  private cv: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tip: HTMLDivElement;
  private gs: GameState;
  private hov: string | null = null;

  constructor(gs: GameState, onTransit: (id: string) => void) {
    this.gs = gs;
    this.el = document.createElement('div');
    this.el.className = 'gmap-overlay';
    this.el.style.display = 'none';
    this.cv = document.createElement('canvas');
    this.ctx = this.cv.getContext('2d')!;
    this.tip = document.createElement('div');
    this.tip.className = 'gmap-tip';
    this.el.append(this.cv, this.tip);
    document.body.appendChild(this.el);

    this.cv.addEventListener('mousemove', (e) => {
      const r = this.cv.getBoundingClientRect();
      const sys = this.hitTest(e.clientX - r.left, e.clientY - r.top);
      if ((sys?.id ?? null) !== this.hov) { this.hov = sys?.id ?? null; this.draw(); }
      if (sys) {
        Object.assign(this.tip.style, { display: 'block', left: `${e.clientX + 12}px`, top: `${e.clientY - 8}px` });
        this.tip.innerHTML = `<b>${sys.name}</b><br>BH: ${sys.bhCount} &middot; Tidal: ${sys.tidalRating}<br>Parts reward: +${sys.partsReward}`;
      } else {
        this.tip.style.display = 'none';
      }
    });

    this.cv.addEventListener('click', (e) => {
      const r = this.cv.getBoundingClientRect();
      const sys = this.hitTest(e.clientX - r.left, e.clientY - r.top);
      if (!sys || sys.id === this.gs.currentSystemId || !this.unlocked(sys.id)) return;
      onTransit(sys.id);
      this.close();
    });

    this.el.addEventListener('click', (e) => { if (e.target === this.el) this.close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.isOpen()) this.close(); });
    window.addEventListener('resize', () => { if (this.isOpen()) { this.resize(); this.draw(); } });
  }

  isOpen() { return this.el.style.display !== 'none'; }

  toggle() {
    if (this.isOpen()) { this.close(); return; }
    this.el.style.display = 'block';
    this.resize();
    this.draw();
  }

  private close() { this.el.style.display = 'none'; this.tip.style.display = 'none'; }

  private resize() { this.cv.width = window.innerWidth; this.cv.height = window.innerHeight; }

  private unlocked(id: string): boolean {
    if (id === this.gs.currentSystemId) return true;
    return CONNECTIONS.some(([a, b]) => {
      const other = a === id ? b : b === id ? a : null;
      return other !== null && (other === this.gs.currentSystemId || this.gs.completedSystems.includes(other));
    });
  }

  private toScreen(nx: number, ny: number): [number, number] {
    const p = 100;
    return [p + nx * (this.cv.width - p * 2), p + ny * (this.cv.height - p * 2)];
  }

  private hitTest(mx: number, my: number) {
    return SYSTEMS.find(s => { const [sx, sy] = this.toScreen(...s.mapPos); return Math.hypot(mx - sx, my - sy) <= 14; }) ?? null;
  }

  private draw() {
    const c = this.ctx, W = this.cv.width, H = this.cv.height;
    c.clearRect(0, 0, W, H);
    c.fillStyle = 'rgba(19,14,14,0.94)'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#ecdfcd'; c.font = 'bold 16px monospace'; c.fillText('GALAXY MAP', 40, 36);
    c.fillStyle = 'rgba(236,223,205,0.4)'; c.font = '11px monospace';
    c.fillText('Click adjacent system to set transit target · ESC to close', 40, 56);

    for (const [a, b] of CONNECTIONS) {
      const sa = SYSTEMS.find(s => s.id === a)!, sb = SYSTEMS.find(s => s.id === b)!;
      const [ax, ay] = this.toScreen(...sa.mapPos), [bx, by] = this.toScreen(...sb.mapPos);
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by);
      c.strokeStyle = (this.unlocked(a) && this.unlocked(b)) ? 'rgba(236,223,205,0.2)' : 'rgba(236,223,205,0.06)';
      c.lineWidth = 1; c.stroke();
    }

    for (const sys of SYSTEMS) {
      const [sx, sy] = this.toScreen(...sys.mapPos);
      const cur = sys.id === this.gs.currentSystemId;
      const done = this.gs.completedSystems.includes(sys.id);
      const ul = this.unlocked(sys.id);
      const col = TIDAL_COL[sys.tidalRating];
      const r = cur ? 11 : 8;
      c.beginPath(); c.arc(sx, sy, r, 0, Math.PI * 2);
      c.fillStyle = !ul ? 'rgba(80,80,80,0.25)' : sys.id === this.hov ? col : done ? col + '55' : 'rgba(19,14,14,0.9)';
      c.fill(); c.strokeStyle = ul ? col : '#555'; c.lineWidth = cur ? 3 : 1.5; c.stroke();
      if (cur) { c.beginPath(); c.arc(sx, sy, r + 6, 0, Math.PI * 2); c.strokeStyle = col + '44'; c.lineWidth = 1; c.stroke(); }
      c.fillStyle = ul ? '#ecdfcd' : 'rgba(236,223,205,0.3)'; c.font = '10px monospace';
      c.textAlign = 'center'; c.fillText(sys.id, sx, sy + r + 14); c.textAlign = 'left';
    }
  }
}
