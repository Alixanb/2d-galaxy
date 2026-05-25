import { useRef, useEffect } from 'preact/hooks';
import { useSignal, effect } from '@preact/signals';
import { velSignal, mfdLabelsSignal, mfdOsbPressSignal } from '../../../core/gameSignals';
import type Galaxy from '../../../systems/Galaxy';
import './RadarView.scss';

const VEL_THRESHOLD = 0.00008;

function drawRadar(ctx: CanvasRenderingContext2D, w: number, h: number, g: Galaxy, vx: number, vy: number, grid: boolean, vec: boolean): void {
  const dpr = devicePixelRatio, cx = w / 2, cy = h / 2;
  ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#030a04'; ctx.fillRect(0, 0, w, h);
  const range = g.size * 1.3, scale = Math.min(cx, cy) * 0.88 / range;
  const toS = (wx: number, wy: number): [number, number] => [cx + wx * scale, cy + wy * scale];
  if (grid) {
    ctx.strokeStyle = 'rgba(61,255,122,0.07)'; ctx.lineWidth = 1;
    for (let r = 0.25; r <= 1.25; r += 0.25) { ctx.beginPath(); ctx.arc(cx, cy, r * g.size * scale, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(61,255,122,0.18)'; ctx.lineWidth = 1;
  ctx.setLineDash([3 * dpr, 4 * dpr]);
  ctx.beginPath(); ctx.arc(cx, cy, g.size * scale, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  for (const bh of g.blackholes) {
    const [sx, sy] = toS(bh.pos.x, bh.pos.y);
    const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, 18 * dpr);
    grd.addColorStop(0, 'rgba(236,38,38,0.45)'); grd.addColorStop(1, 'rgba(236,38,38,0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(sx, sy, 18 * dpr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ec2626'; ctx.beginPath(); ctx.arc(sx, sy, 3 * dpr, 0, Math.PI * 2); ctx.fill();
  }
  const ship = g.ship;
  if (ship) {
    const [sx, sy] = toS(ship.pos.x, ship.pos.y);
    if (vec) {
      const speed = Math.hypot(vx, vy);
      if (speed > VEL_THRESHOLD) {
        const va = Math.atan2(vy, vx), len = Math.min(cx * 0.35, speed * scale * 60000) * dpr;
        ctx.strokeStyle = 'rgba(61,255,122,0.55)'; ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(va) * len, sy + Math.sin(va) * len); ctx.stroke();
      }
    }
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(ship.angle);
    const s = 5 * dpr; ctx.fillStyle = '#3dff7a';
    ctx.beginPath(); ctx.moveTo(0, -s * 1.6); ctx.lineTo(s, s); ctx.lineTo(-s, s); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.font = `${8 * dpr}px "Courier New",monospace`; ctx.fillStyle = 'rgba(61,255,122,0.3)';
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText(`±${range.toFixed(1)} AU`, w - 5 * dpr, h - 4 * dpr);
  }
}

export function RadarView({ galaxy }: { galaxy: Galaxy }) {
  const { x: vx, y: vy } = velSignal.value;
  const showGrid = useSignal(true);
  const showVector = useSignal(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    mfdLabelsSignal.value = ['HOME', showGrid.value ? 'GRID*' : 'GRID', showVector.value ? 'VECT*' : 'VECT', 'TEL', 'FUEL', 'RADAR'];
  }, [showGrid.value, showVector.value]);

  useEffect(() => {
    return effect(() => {
      const { btn, tick } = mfdOsbPressSignal.value;
      if (tick === 0) return;
      if (btn === 2) showGrid.value = !showGrid.value;
      if (btn === 3) showVector.value = !showVector.value;
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wrap = canvas.parentElement;
    if (!wrap || wrap.clientWidth === 0) return;
    const dpr = devicePixelRatio;
    const nw = Math.round(wrap.clientWidth * dpr), nh = Math.round(wrap.clientHeight * dpr);
    if (canvas.width !== nw || canvas.height !== nh) {
      canvas.width = nw; canvas.height = nh;
      canvas.style.width = `${wrap.clientWidth}px`; canvas.style.height = `${wrap.clientHeight}px`;
    }
    const ctx = canvas.getContext('2d');
    if (ctx) drawRadar(ctx, canvas.width, canvas.height, galaxy, vx, vy, showGrid.value, showVector.value);
  });

  return (
    <div class="mfd-view mfd-view-radar" style="display:flex">
      <canvas ref={canvasRef} class="mfd-radar-canvas" />
    </div>
  );
}
