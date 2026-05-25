import { useEffect } from 'preact/hooks';
import { velSignal, mfdLabelsSignal } from '../../../core/gameSignals';
import type Galaxy from '../../../systems/Galaxy';
import type RelayStation from '../../../entities/RelayStation';
import './ApproachView.scss';

const bar = (v: number): string => {
  const w = 9, p = Math.round(Math.max(-1, Math.min(1, v)) * w / 2 + w / 2);
  return '[' + Array.from({ length: w + 1 }, (_, i) => i === p ? '●' : '═').join('') + ']';
};

const relV = (r: RelayStation) => ({
  x: -r.orbitSpeed * r.orbitRadius * Math.sin(r.orbitAngle),
  y:  r.orbitSpeed * r.orbitRadius * Math.cos(r.orbitAngle),
});

type Row = { label: string; val: string };

export function ApproachView({ galaxy }: { galaxy: Galaxy }) {
  // Read velSignal just to trigger reactivity every 200ms
  velSignal.value;

  useEffect(() => {
    mfdLabelsSignal.value = ['HOME', 'GUIDE', '—', 'TEL', 'FUEL', 'RADAR'];
  }, []);

  const ship = galaxy.ship;
  const r = galaxy.relayStations[0];
  let rows: Row[] = [
    { label: 'REL SPD', val: '—' }, { label: 'RANGE', val: '—' }, { label: 'CLOSING', val: '—' },
    { label: 'FWD / AFT', val: '—' }, { label: 'L / R', val: '—' }, { label: 'DOCK MODE', val: '—' },
  ];

  if (ship && r) {
    const rv = relV(r);
    const rrx = ship.vel.x - rv.x, rry = ship.vel.y - rv.y;
    const relSpd = Math.hypot(rrx, rry);
    const dx = r.pos.x - ship.pos.x, dy = r.pos.y - ship.pos.y;
    const range = Math.hypot(dx, dy);
    const closing = range > 0 ? -(rrx * dx / range + rry * dy / range) : 0;
    rows = [
      { label: 'REL SPD', val: `${(relSpd * 1000).toFixed(2)} m/s` },
      { label: 'RANGE', val: `${(range * 100).toFixed(2)} AU` },
      { label: 'CLOSING', val: `${closing >= 0 ? '+' : ''}${(closing * 1000).toFixed(2)} m/s` },
      { label: 'FWD / AFT', val: bar(ship.rcsForward) },
      { label: 'L / R', val: bar(ship.rcsSideways) },
      { label: 'DOCK MODE', val: ship.dockingMode ? 'ON' : 'OFF' },
    ];
  }

  return (
    <div class="mfd-view" style="flex-direction:column;padding:8px 10px;gap:3px;font-family:'Courier New',monospace;font-size:9px;letter-spacing:.05em;">
      <div class="mfd-header" style="padding:0 0 6px">APPROACH</div>
      {rows.map(({ label, val }) => (
        <div key={label} style="display:flex;justify-content:space-between;padding:2px 0;">
          <span style="color:rgba(61,255,122,0.5)">{label}</span>
          <span style="color:#3dff7a">{val}</span>
        </div>
      ))}
    </div>
  );
}
