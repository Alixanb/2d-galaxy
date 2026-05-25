import { useRef, useEffect } from 'preact/hooks';
import { useSignal, effect } from '@preact/signals';
import { leSignal, moSignal, leMaxSignal, moMaxSignal, mfdLabelsSignal, mfdOsbPressSignal } from '../../../core/gameSignals';
import './FuelView.scss';

export function FuelView() {
  const le = leSignal.value, leMax = leMaxSignal.value;
  const mo = moSignal.value, moMax = moMaxSignal.value;
  const showRate = useSignal(true);
  const showEst = useSignal(true);

  const s = useRef({
    lastLE: le, lastMO: mo, lastTime: performance.now(),
    leSmoothed: 0, moSmoothed: 0,
  });

  const now = performance.now();
  const dt = (now - s.current.lastTime) / 1000;
  if (dt > 0.05 && (le !== s.current.lastLE || mo !== s.current.lastMO)) {
    s.current.leSmoothed = s.current.leSmoothed * 0.88 + Math.max(0, (s.current.lastLE - le) / dt) * 0.12;
    s.current.moSmoothed = s.current.moSmoothed * 0.88 + Math.max(0, (s.current.lastMO - mo) / dt) * 0.12;
    s.current.lastLE = le;
    s.current.lastMO = mo;
    s.current.lastTime = now;
  }

  const eta = (fuel: number, rate: number) => {
    if (rate < 0.05) return '∞';
    const secs = fuel / rate;
    if (secs > 3600) return `${Math.floor(secs / 3600)}h${Math.floor((secs % 3600) / 60)}m`;
    return secs > 60 ? `${Math.floor(secs / 60)}m${Math.floor(secs % 60)}s` : `${Math.floor(secs)}s`;
  };

  const lePct = leMax > 0 ? le / leMax : 0;
  const moPct = moMax > 0 ? mo / moMax : 0;
  const leEta = eta(le, s.current.leSmoothed);
  const moEta = eta(mo, s.current.moSmoothed);

  useEffect(() => {
    mfdLabelsSignal.value = ['HOME', showRate.value ? 'RATE*' : 'RATE', showEst.value ? 'EST*' : 'EST', 'TEL', 'FUEL', 'RADAR'];
  }, [showRate.value, showEst.value]);

  useEffect(() => {
    return effect(() => {
      const { btn, tick } = mfdOsbPressSignal.value;
      if (tick === 0) return;
      if (btn === 2) showRate.value = !showRate.value;
      if (btn === 3) showEst.value = !showEst.value;
    });
  }, []);

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
      {showRate.value && (<>
        <div class="mfd-sep" />
        <div class="mfd-row"><span class="mfd-label">LE/S</span><span class="mfd-val">{s.current.leSmoothed.toFixed(1)}</span><span class="mfd-unit">u/s</span></div>
        <div class="mfd-row"><span class="mfd-label">MO/S</span><span class="mfd-val">{s.current.moSmoothed.toFixed(1)}</span><span class="mfd-unit">u/s</span></div>
      </>)}
      {showEst.value && (<>
        <div class="mfd-sep" />
        <div class="mfd-row"><span class="mfd-label">LE ETA</span><span class="mfd-val">{leEta}</span></div>
        <div class="mfd-row"><span class="mfd-label">MO ETA</span><span class="mfd-val">{moEta}</span></div>
      </>)}
    </div>
  );
}
