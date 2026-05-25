import { useEffect } from 'preact/hooks';
import { mfdActiveViewSignal, mfdLabelsSignal, type MFDViewKey } from '../../../core/gameSignals';
import './HomeView.scss';

const ITEMS: { label: string; key: MFDViewKey }[] = [
  { label: 'VELOCITY', key: 'vel' },
  { label: 'ATTITUDE', key: 'att' },
  { label: 'TELEMETRY', key: 'tel' },
  { label: 'ERGOL SYS', key: 'fuel' },
  { label: 'RADAR NAV', key: 'radar' },
];

export function HomeView() {
  useEffect(() => {
    mfdLabelsSignal.value = ['HOME', 'GUIDE', 'APCH', 'TEL', 'FUEL', 'RADAR'];
  }, []);

  return (
    <div class="mfd-view mfd-view-home" style="display:flex">
      <div class="mfd-home-row">
        {ITEMS.slice(0, 2).map(({ label, key }) => (
          <div key={key} class="mfd-home-item" onClick={() => mfdActiveViewSignal.value = key}>{label}</div>
        ))}
      </div>
      <div class="mfd-home-row">
        {ITEMS.slice(2).map(({ label, key }) => (
          <div key={key} class="mfd-home-item" onClick={() => mfdActiveViewSignal.value = key}>{label}</div>
        ))}
      </div>
    </div>
  );
}
