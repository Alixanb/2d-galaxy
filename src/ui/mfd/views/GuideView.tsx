import { useEffect } from 'preact/hooks';
import { useSignal, effect } from '@preact/signals';
import { velSignal, distanceSignal, mfdLabelsSignal, mfdOsbPressSignal } from '../../../core/gameSignals';
import type Galaxy from '../../../systems/Galaxy';
import type RelayStation from '../../../entities/RelayStation';
import './GuideView.scss';

type Step = { label: string; check: (g: Galaxy) => boolean; value: (g: Galaxy) => string };

const rv = (r: RelayStation) => ({ vx: -r.orbitSpeed * r.orbitRadius * Math.sin(r.orbitAngle), vy: r.orbitSpeed * r.orbitRadius * Math.cos(r.orbitAngle) });
const na = (a: number) => ((a % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;

const APPROACH_STEPS: Step[] = [
  { label: 'Pe ESTABLISHED', check: g => (g.ship?.pe?.dist ?? 0) > 0.03, value: g => `Pe ${((g.ship?.pe?.dist ?? 0) * 100).toFixed(1)} AU  (>3.0)` },
  { label: 'Ap MATCH ORBIT', check: g => { const s=g.ship,r=g.relayStations[0]; return !(!s||!r)&&Math.abs((s.ap?.dist??0)-r.orbitRadius)/r.orbitRadius<0.15; }, value: g => `Ap ${((g.ship?.ap?.dist??0)*100).toFixed(1)} / orbit ${((g.relayStations[0]?.orbitRadius??0)*100).toFixed(1)} AU` },
  { label: 'ENCOUNTER LOCK', check: g => (g.ship?.encounterPoint?.dist??Infinity)<0.08, value: g => `◆ dist ${((g.ship?.encounterPoint?.dist??999)*100).toFixed(1)} AU  (<8.0)` },
  { label: 'REL SPEED LOW', check: g => { const s=g.ship,r=g.relayStations[0]; if(!s||!r) return false; const v=rv(r); return Math.hypot(s.vel.x-v.vx,s.vel.y-v.vy)<0.005; }, value: g => { const s=g.ship,r=g.relayStations[0]; if(!s||!r) return '—'; const v=rv(r); return `rel ${(Math.hypot(s.vel.x-v.vx,s.vel.y-v.vy)*1000).toFixed(1)} m/s  (<5)`; } },
  { label: 'DOCK APPROACH', check: g => { const s=g.ship,r=g.relayStations[0]; return !(!s||!r)&&(s.dockingMode||Math.hypot(s.pos.x-r.pos.x,s.pos.y-r.pos.y)<0.05); }, value: g => { const s=g.ship,r=g.relayStations[0]; if(!s||!r) return '—'; return `range ${(Math.hypot(s.pos.x-r.pos.x,s.pos.y-r.pos.y)*100).toFixed(1)} AU  dock ${s.dockingMode?'ON':'OFF'}`; } },
];

const ESCAPE_STEPS: Step[] = [
  { label: 'ALIGN PROGRADE', check: g => { const s=g.ship; if(!s||s.vel.length()<0.0001) return false; return Math.abs(na(s.angle-Math.atan2(s.vel.x,-s.vel.y)))<Math.PI/18; }, value: g => { const s=g.ship; if(!s) return '—'; return `hdg err ${(na(s.angle-Math.atan2(s.vel.x,-s.vel.y))*180/Math.PI).toFixed(1)}°  (<10°)`; } },
  { label: 'ESCAPE BURN', check: g => g.ship?.escapeTrajectory ?? false, value: g => `traj: ${g.ship?.escapeTrajectory?'ESCAPE ✓':'BOUND'}` },
  { label: 'CUT ENGINES', check: g => (g.ship?.escapeTrajectory??false)&&g.ship?.status!=='thrusting', value: g => `engines: ${g.ship?.status==='thrusting'?'ACTIVE':'CUT ✓'}` },
  { label: 'COAST BOUNDARY', check: g => { const s=g.ship; return !!s&&(s.escapeTrajectory??false)&&s.status!=='thrusting'&&Math.hypot(s.pos.x,s.pos.y)>g.size*0.75; }, value: g => { const s=g.ship; if(!s) return '—'; return `dist ${(Math.hypot(s.pos.x,s.pos.y)/g.size*100).toFixed(0)}% of boundary`; } },
];

export function GuideView({ galaxy }: { galaxy: Galaxy }) {
  velSignal.value;
  distanceSignal.value;

  const tab = useSignal<'approach' | 'escape'>('escape');
  const manualTab = useSignal(false);

  // Auto-switch tab if not manually overridden
  if (!manualTab.value) {
    const newTab = (galaxy.ship?.encounterPoint?.dist ?? Infinity) < 0.15 ? 'approach' : 'escape';
    if (tab.value !== newTab) tab.value = newTab;
  }

  useEffect(() => {
    mfdLabelsSignal.value = ['HOME', tab.value === 'approach' ? 'APPR*' : 'APPR', tab.value === 'escape' ? 'ESC*' : 'ESC', 'TEL', 'FUEL', 'RADAR'];
  }, [tab.value]);

  useEffect(() => {
    return effect(() => {
      const { btn, tick } = mfdOsbPressSignal.value;
      if (tick === 0) return;
      if (btn === 2) { tab.value = 'approach'; manualTab.value = true; }
      if (btn === 3) { tab.value = 'escape'; manualTab.value = true; }
    });
  }, []);

  const steps = tab.value === 'approach' ? APPROACH_STEPS : ESCAPE_STEPS;
  let active = -1;
  const rows = steps.map((s, i) => {
    const done = s.check(galaxy);
    if (!done && active === -1) active = i;
    return { done, label: s.label, idx: i };
  });
  const statusText = active >= 0 ? steps[active].value(galaxy) : 'SEQUENCE COMPLETE';

  return (
    <div class="mfd-view mfd-view-guide" style="padding:8px 10px;gap:4px;">
      <div class="mfd-header" style="padding:0 0 4px">{tab.value === 'approach' ? 'APPROACH' : 'ESCAPE'}</div>
      {rows.map(({ done, label, idx }) => (
        <div key={idx} style={{ fontFamily: "'Courier New',monospace", fontSize: '9px', letterSpacing: '.06em', padding: '3px 0', whiteSpace: 'nowrap', color: done ? 'rgba(61,255,122,0.35)' : idx === active ? '#3dff7a' : 'rgba(61,255,122,0.25)', textDecoration: done ? 'line-through' : 'none' }}>
          {done ? '✓' : idx === active ? '►' : '\xa0'} {label}
        </div>
      ))}
      <div style="font-family:'Courier New',monospace;font-size:8px;color:#50b6c9;margin-top:6px;letter-spacing:.04em;white-space:nowrap;overflow:hidden;">{statusText}</div>
    </div>
  );
}
