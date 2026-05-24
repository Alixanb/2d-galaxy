import { render, createRef } from 'preact';
import { forwardRef, useImperativeHandle } from 'preact/compat';
import { useRef, useEffect, useState } from 'preact/hooks';
import { fpsSignal, starCountSignal, totalStarsSignal } from '../../../core/gameSignals';
import type { MFDData } from '../../MFD';
import type { MFDView } from '../MFDView';
import './TelemetryView.scss';

const MAX_PTS = 120;

interface TelViewRef { getLabels(): string[]; onOSB(idx: number): void; }

function drawChart(ctx: CanvasRenderingContext2D, data: number[], w: number, h: number): void {
  const chartMax = Math.max(...data, 1);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#030a04'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(236,223,205,0.1)'; ctx.lineWidth = 1;
  for (let i = 1; i <= 3; i++) {
    const y = Math.round((h / 4) * i);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  if (data.length < 2) return;
  const sx = w / (MAX_PTS - 1);
  const py = (v: number) => h - (v / chartMax) * h * 0.85 - h * 0.05;
  ctx.beginPath();
  data.forEach((v, i) => { const x = (i + MAX_PTS - data.length) * sx; i === 0 ? ctx.moveTo(x, py(v)) : ctx.lineTo(x, py(v)); });
  ctx.lineTo((MAX_PTS - 1) * sx, h); ctx.lineTo((MAX_PTS - data.length) * sx, h); ctx.closePath();
  ctx.fillStyle = 'rgba(61,255,122,0.08)'; ctx.fill();
  ctx.beginPath(); ctx.strokeStyle = '#3dff7a'; ctx.lineWidth = 1.5 * devicePixelRatio; ctx.lineJoin = 'round';
  data.forEach((v, i) => { const x = (i + MAX_PTS - data.length) * sx; i === 0 ? ctx.moveTo(x, py(v)) : ctx.lineTo(x, py(v)); });
  ctx.stroke();
}

const TelemetryViewComponent = forwardRef<TelViewRef>((_, ref) => {
  const fps = fpsSignal.value;
  const starCount = starCountSignal.value;
  const total = totalStarsSignal.value;
  const showFPS = useRef(true);
  const showChart = useRef(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartData = useRef<number[]>([]);
  const prevCount = useRef(-1);
  const [, setTick] = useState(0);

  if (starCount !== prevCount.current) {
    prevCount.current = starCount;
    chartData.current = [...chartData.current.slice(-(MAX_PTS - 1)), starCount];
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !showChart.current) return;
    const wrap = canvas.parentElement;
    if (!wrap || wrap.clientWidth === 0) return;
    const dpr = devicePixelRatio;
    const nw = Math.round(wrap.clientWidth * dpr);
    const nh = Math.round(wrap.clientHeight * dpr);
    if (canvas.width !== nw || canvas.height !== nh) { canvas.width = nw; canvas.height = nh; }
    const ctx = canvas.getContext('2d');
    if (ctx) drawChart(ctx, chartData.current, canvas.width, canvas.height);
  });

  useImperativeHandle(ref, () => ({
    getLabels: () => ['HOME', showFPS.current ? 'FPS*' : 'FPS', showChart.current ? 'CHART*' : 'CHART', 'TEL', 'FUEL', 'RADAR'],
    onOSB(idx) {
      if (idx === 2) { showFPS.current = !showFPS.current; setTick(n => n + 1); }
      if (idx === 3) { showChart.current = !showChart.current; setTick(n => n + 1); }
    },
  }));

  return (
    <div class="mfd-view mfd-view-tel" style="display:flex">
      <div class="mfd-header">TELEMETRY</div>
      <div class="mfd-sep" />
      <div class="mfd-row"><span class="mfd-label">ALIVE</span><span class="mfd-val">{starCount}</span></div>
      <div class="mfd-row"><span class="mfd-label">TOTAL</span><span class="mfd-val">{total}</span></div>
      {showFPS.current && <div class="mfd-row"><span class="mfd-label">FPS</span><span class="mfd-val">{fps}</span></div>}
      <div class="mfd-sep" />
      {showChart.current && <div class="mfd-chart-wrap"><canvas ref={canvasRef} /></div>}
    </div>
  );
});

export class TelemetryView implements MFDView {
  private r = createRef<TelViewRef>();

  mount(container: HTMLElement): void {
    render(<TelemetryViewComponent ref={this.r} />, container);
  }

  update(data: MFDData): void {
    fpsSignal.value = data.fps;
    starCountSignal.value = data.starCount;
    totalStarsSignal.value = data.totalStars;
  }

  getLabels(): string[] {
    return this.r.current?.getLabels() ?? ['HOME', 'FPS*', 'CHART*', 'TEL', 'FUEL', 'RADAR'];
  }

  onOSB(idx: number): void { this.r.current?.onOSB(idx); }
}
