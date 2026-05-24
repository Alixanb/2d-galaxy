import { useRef, useImperativeHandle, useEffect } from 'preact/hooks';
import { forwardRef } from 'preact/compat';
import './StatusPanel.scss';

export interface StatusPanelRef {
  draw(vx: number, vy: number, le: number, leMax: number, mo: number, moMax: number, decay: number | null, decayMax: number | null): void;
}

function drawGauge(canvas: HTMLCanvasElement, pct: number, color: string, label: string, value: string, critical: boolean): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio;
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2 + 5 * dpr;
  const r = w * 0.35;
  const trackW = 4 * dpr;
  const START = (5 * Math.PI) / 4;
  const SWEEP = (3 * Math.PI) / 2;

  ctx.clearRect(0, 0, w, h);

  ctx.beginPath();
  ctx.arc(cx, cy, r, START, START + SWEEP);
  ctx.strokeStyle = 'rgba(236, 223, 205, 0.09)';
  ctx.lineWidth = trackW;
  ctx.lineCap = 'butt';
  ctx.stroke();

  for (let i = 0; i <= 4; i++) {
    const a = START + (i / 4) * SWEEP;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - trackW * 1.6), cy + Math.sin(a) * (r - trackW * 1.6));
    ctx.lineTo(cx + Math.cos(a) * (r + trackW * 0.6), cy + Math.sin(a) * (r + trackW * 0.6));
    ctx.strokeStyle = 'rgba(236, 223, 205, 0.18)';
    ctx.lineWidth = 1 * dpr;
    ctx.stroke();
  }

  const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 220);
  const fillColor = critical ? `rgba(236, 38, 38, ${pulse})` : color;

  if (pct > 0.004) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, START, START + SWEEP * pct);
    ctx.strokeStyle = fillColor;
    ctx.lineWidth = trackW;
    ctx.lineCap = 'round';
    ctx.stroke();

    const tipA = START + SWEEP * pct;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(tipA) * r, cy + Math.sin(tipA) * r, trackW * 0.65, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  const textPulse = critical ? pulse : 1;
  ctx.fillStyle = critical ? `rgba(236, 38, 38, ${0.6 + 0.4 * pulse})` : 'rgba(236, 223, 205, 0.92)';
  ctx.globalAlpha = textPulse;
  ctx.font = `bold ${12 * dpr}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pct < 0.005 ? '!!!' : value, cx, cy - 4 * dpr);
  ctx.globalAlpha = 1;

  ctx.fillStyle = 'rgba(236, 223, 205, 0.32)';
  ctx.font = `${7 * dpr}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy + r * 0.6);
}

export const StatusPanel = forwardRef<StatusPanelRef>((_, ref) => {
  const leRef = useRef<HTMLCanvasElement>(null);
  const moRef = useRef<HTMLCanvasElement>(null);
  const decayWrapRef = useRef<HTMLDivElement>(null);
  const decayFillRef = useRef<HTMLDivElement>(null);
  const decayTimeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const dpr = window.devicePixelRatio;
    for (const c of [leRef.current, moRef.current]) {
      if (c) { c.width = 100 * dpr; c.height = 100 * dpr; }
    }
  }, []);

  useImperativeHandle(ref, () => ({
    draw(_vx, _vy, le, leMax, mo, moMax, decay, decayMax) {
      if (!leRef.current || !moRef.current) return;
      const lePct = leMax > 0 ? Math.max(0, le / leMax) : 0;
      const moPct = moMax > 0 ? Math.max(0, mo / moMax) : 0;
      drawGauge(leRef.current, lePct, 'rgba(80, 182, 201, 0.9)', 'L-ERGOL', Math.ceil(le).toString(), lePct < 0.2);
      drawGauge(moRef.current, moPct, 'rgba(176, 111, 216, 0.9)', 'MONO', Math.ceil(mo).toString(), moPct < 0.2);
      if (!decayWrapRef.current || !decayFillRef.current || !decayTimeRef.current) return;
      if (decay === null || decayMax === null) {
        decayWrapRef.current.style.display = 'none';
      } else {
        decayWrapRef.current.style.display = 'flex';
        decayFillRef.current.style.width = `${Math.max(0, decay / decayMax) * 100}%`;
        decayTimeRef.current.textContent = `${Math.ceil(decay)}s`;
        decayFillRef.current.classList.toggle('decay-urgent', decay < 30);
      }
    },
  }));

  return (
    <div class="status-section">
      <div class="status-gauges">
        <canvas ref={leRef} style={{ width: '100px', height: '100px' }} />
        <canvas ref={moRef} style={{ width: '100px', height: '100px' }} />
      </div>
      <div ref={decayWrapRef} class="decay-wrap" style={{ display: 'none' }}>
        <span class="decay-label">TIDAL DECAY</span>
        <div class="decay-track">
          <div ref={decayFillRef} class="decay-fill" />
        </div>
        <span ref={decayTimeRef} class="decay-time" />
      </div>
    </div>
  );
});
