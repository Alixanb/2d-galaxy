import { render, createRef } from 'preact';
import { signal } from '@preact/signals';
import { forwardRef, useImperativeHandle } from 'preact/compat';
import { useRef, useState } from 'preact/hooks';
import { leSignal, moSignal, leMaxSignal, moMaxSignal } from '../../../core/gameSignals';
import type { MFDData } from '../../MFD';
import type { MFDView } from '../MFDView';
import './FuelView.scss';

const leRateSig = signal(0);
const moRateSig = signal(0);
const leEtaSig = signal('∞');
const moEtaSig = signal('∞');

interface FuelRef { getLabels(): string[]; onOSB(idx: number): void; }

const FuelViewComponent = forwardRef<FuelRef>((_, ref) => {
  const le = leSignal.value, leMax = leMaxSignal.value;
  const mo = moSignal.value, moMax = moMaxSignal.value;
  const leRate = leRateSig.value, moRate = moRateSig.value;
  const leEta = leEtaSig.value, moEta = moEtaSig.value;
  const showRate = useRef(true);
  const showEst = useRef(true);
  const [, setTick] = useState(0);
  const lePct = leMax > 0 ? le / leMax : 0;
  const moPct = moMax > 0 ? mo / moMax : 0;

  useImperativeHandle(ref, () => ({
    getLabels: () => ['HOME', showRate.current ? 'RATE*' : 'RATE', showEst.current ? 'EST*' : 'EST', 'TEL', 'FUEL', 'RADAR'],
    onOSB(idx) {
      if (idx === 2) { showRate.current = !showRate.current; setTick(n => n + 1); }
      if (idx === 3) { showEst.current = !showEst.current; setTick(n => n + 1); }
    },
  }));

  return (
    <div class="mfd-view mfd-view-fuel">
      <div class="mfd-header">ERGOL SYS</div>
      <div class="mfd-sep" />
      <div class="mfd-fuel-row">
        <div class="mfd-row"><span class="mfd-label">L-ERGOL</span><span class="mfd-val mfd-fuel-amount">{Math.ceil(le)}/{leMax}</span></div>
        <div class="mfd-fuel-bar-wrap"><div class={`mfd-fuel-bar-fill mfd-fuel-le${lePct < 0.2 ? ' mfd-fuel-critical' : ''}`} style={{ width: `${lePct * 100}%` }} /></div>
      </div>
      <div class="mfd-fuel-row">
        <div class="mfd-row"><span class="mfd-label">MONERGOL</span><span class="mfd-val mfd-fuel-amount">{Math.ceil(mo)}/{moMax}</span></div>
        <div class="mfd-fuel-bar-wrap"><div class={`mfd-fuel-bar-fill mfd-fuel-mo${moPct < 0.2 ? ' mfd-fuel-critical' : ''}`} style={{ width: `${moPct * 100}%` }} /></div>
      </div>
      {showRate.current && (<>
        <div class="mfd-sep" />
        <div class="mfd-row"><span class="mfd-label">LE/S</span><span class="mfd-val">{leRate.toFixed(1)}</span><span class="mfd-unit">u/s</span></div>
        <div class="mfd-row"><span class="mfd-label">MO/S</span><span class="mfd-val">{moRate.toFixed(1)}</span><span class="mfd-unit">u/s</span></div>
      </>)}
      {showEst.current && (<>
        <div class="mfd-sep" />
        <div class="mfd-row"><span class="mfd-label">LE ETA</span><span class="mfd-val">{leEta}</span></div>
        <div class="mfd-row"><span class="mfd-label">MO ETA</span><span class="mfd-val">{moEta}</span></div>
      </>)}
    </div>
  );
});

export class FuelView implements MFDView {
  private r = createRef<FuelRef>();
  private leSmoothed = 0;
  private moSmoothed = 0;
  private lastLE = -1;
  private lastMO = -1;
  private lastTime = 0;

  mount(container: HTMLElement): void { render(<FuelViewComponent ref={this.r} />, container); }

  update(data: MFDData): void {
    const now = performance.now();
    if (this.lastLE >= 0) {
      const dt = (now - this.lastTime) / 1000;
      if (dt > 0.05) {
        this.leSmoothed = this.leSmoothed * 0.88 + Math.max(0, (this.lastLE - data.liquidErgol) / dt) * 0.12;
        this.moSmoothed = this.moSmoothed * 0.88 + Math.max(0, (this.lastMO - data.monergol) / dt) * 0.12;
      }
    }
    this.lastLE = data.liquidErgol; this.lastMO = data.monergol; this.lastTime = now;
    leSignal.value = data.liquidErgol; leMaxSignal.value = data.maxLiquidErgol;
    moSignal.value = data.monergol; moMaxSignal.value = data.maxMonergol;
    leRateSig.value = this.leSmoothed; moRateSig.value = this.moSmoothed;
    const eta = (fuel: number, rate: number) => {
      if (rate < 0.05) return '∞';
      const s = fuel / rate;
      if (s > 3600) return `${Math.floor(s / 3600)}h${Math.floor((s % 3600) / 60)}m`;
      return s > 60 ? `${Math.floor(s / 60)}m${Math.floor(s % 60)}s` : `${Math.floor(s)}s`;
    };
    leEtaSig.value = eta(data.liquidErgol, this.leSmoothed);
    moEtaSig.value = eta(data.monergol, this.moSmoothed);
  }

  getLabels(): string[] { return this.r.current?.getLabels() ?? ['HOME', 'RATE*', 'EST*', 'TEL', 'FUEL', 'RADAR']; }
  onOSB(idx: number): void { this.r.current?.onOSB(idx); }
}
