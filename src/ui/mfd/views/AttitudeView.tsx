import { useRef, useEffect } from 'preact/hooks';
import { useSignal, effect } from '@preact/signals';
import { velSignal, headingSignal, distanceSignal, mfdLabelsSignal, mfdOsbPressSignal } from '../../../core/gameSignals';
const VEL_THRESHOLD = 0.00008;
import type Ship from '../../../entities/Ship';
import type Galaxy from '../../../systems/Galaxy';
import './AttitudeView.scss';

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

export function AttitudeView({ galaxy }: { galaxy: Galaxy }) {
  const { x: vx, y: vy } = velSignal.value;
  const angle = headingSignal.value;
  const dist = distanceSignal.value;
  const showOrient = useSignal(true);
  const showVector = useSignal(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteCache = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    mfdLabelsSignal.value = ['HOME', showOrient.value ? 'ORIENT*' : 'ORIENT', showVector.value ? 'VECTOR*' : 'VECTOR', 'TEL', 'FUEL', 'RADAR'];
  }, [showOrient.value, showVector.value]);

  useEffect(() => {
    return effect(() => {
      const { btn, tick } = mfdOsbPressSignal.value;
      if (tick === 0) return;
      if (btn === 2) showOrient.value = !showOrient.value;
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
    if (ctx) drawAtt(ctx, canvas.width, canvas.height, vx, vy, angle, dist, galaxy.ship, spriteCache, showOrient.value, showVector.value);
  });

  return (
    <div class="mfd-view mfd-view-att" style="display:flex">
      <canvas ref={canvasRef} class="mfd-att-canvas" />
    </div>
  );
}
