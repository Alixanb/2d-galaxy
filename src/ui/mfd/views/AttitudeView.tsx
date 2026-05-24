import { render, createRef } from 'preact';
import { signal } from '@preact/signals';
import { forwardRef, useImperativeHandle } from 'preact/compat';
import { useRef, useEffect, useState } from 'preact/hooks';
import { velSignal, headingSignal } from '../../../core/gameSignals';
const VEL_THRESHOLD = 0.00008;
import type Ship from '../../../entities/Ship';
import type Galaxy from '../../../systems/Galaxy';
import type { MFDData } from '../../MFD';
import type { MFDView } from '../MFDView';
import './AttitudeView.scss';

const distSig = signal(0);

interface AttViewRef { getLabels(): string[]; onOSB(idx: number): void; }

function drawAtt(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  vx: number, vy: number, angle: number, dist: number,
  ship: Ship | undefined, sc: { current: HTMLCanvasElement | null },
  showOrient: boolean, showVector: boolean,
): void {
  const cx = w / 2, cy = h / 2, dpr = devicePixelRatio;
  ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#030a04'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(61,255,122,0.1)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx,0); ctx.lineTo(cx,h); ctx.moveTo(0,cy); ctx.lineTo(w,cy); ctx.stroke();
  ctx.strokeStyle = 'rgba(61,255,122,0.18)';
  ctx.beginPath(); ctx.arc(cx, cy, Math.min(cx,cy)*0.84, 0, Math.PI*2); ctx.stroke();
  if (ship && showOrient) {
    if (!sc.current) {
      const spr = ship.sprites['idle'];
      const ratio = spr.height / spr.width;
      const size = Math.round(32 * dpr);
      const tmp = document.createElement('canvas');
      tmp.width = size; tmp.height = Math.round(size * ratio);
      const t = tmp.getContext('2d')!;
      t.drawImage(spr, 0, 0, size, size * ratio);
      t.globalCompositeOperation = 'source-in'; t.fillStyle = '#3dff7a'; t.fillRect(0, 0, size, size * ratio);
      sc.current = tmp;
    }
    const { width: sw, height: sh } = sc.current;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle); ctx.globalAlpha = 0.88;
    ctx.drawImage(sc.current, -sw/2, -sh/2, sw, sh); ctx.restore();
  }
  if (showVector && Math.hypot(vx, vy) > VEL_THRESHOLD) {
    const al = Math.min(cx,cy)*0.72, tip = 6*dpr;
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(Math.atan2(vy,vx));
    ctx.strokeStyle = '#3dff7a'; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.5*dpr; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(al,0); ctx.moveTo(al,0); ctx.lineTo(al-tip,-tip*.5); ctx.moveTo(al,0); ctx.lineTo(al-tip,tip*.5); ctx.stroke();
    ctx.restore();
  }
  ctx.save(); ctx.font = `${9*dpr}px "Courier New",monospace`; ctx.fillStyle = 'rgba(61,255,122,0.45)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText(`${dist.toFixed(2)} AU`, cx, h-3*dpr); ctx.restore();
}

const AttitudeViewComponent = forwardRef<AttViewRef, { galaxy: Galaxy }>(({ galaxy }, ref) => {
  const { x: vx, y: vy } = velSignal.value;
  const angle = headingSignal.value;
  const dist = distSig.value;
  const showOrient = useRef(true);
  const showVector = useRef(true);
  const [, setTick] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteCache = useRef<HTMLCanvasElement | null>(null);

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
    if (ctx) drawAtt(ctx, canvas.width, canvas.height, vx, vy, angle, dist, galaxy.ship, spriteCache, showOrient.current, showVector.current);
  });

  useImperativeHandle(ref, () => ({
    getLabels: () => ['HOME', showOrient.current ? 'ORIENT*' : 'ORIENT', showVector.current ? 'VECTOR*' : 'VECTOR', 'TEL', 'FUEL', 'RADAR'],
    onOSB(idx) {
      if (idx === 2) { showOrient.current = !showOrient.current; setTick(n => n+1); }
      if (idx === 3) { showVector.current = !showVector.current; setTick(n => n+1); }
    },
  }));

  return (
    <div class="mfd-view mfd-view-att" style="display:flex">
      <canvas ref={canvasRef} class="mfd-att-canvas" />
    </div>
  );
});

export class AttitudeView implements MFDView {
  private r = createRef<AttViewRef>();
  private galaxy: Galaxy;
  constructor(galaxy: Galaxy) { this.galaxy = galaxy; }
  mount(container: HTMLElement): void { render(<AttitudeViewComponent ref={this.r} galaxy={this.galaxy} />, container); }
  update(data: MFDData): void { distSig.value = data.dist; }
  getLabels(): string[] { return this.r.current?.getLabels() ?? ['HOME', 'ORIENT*', 'VECTOR*', 'TEL', 'FUEL', 'RADAR']; }
  onOSB(idx: number): void { this.r.current?.onOSB(idx); }
}
