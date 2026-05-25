import { mfdActiveViewSignal, mfdLabelsSignal, mfdOsbPressSignal } from '../core/gameSignals';
import type Galaxy from '../systems/Galaxy';
import { HomeView } from './mfd/views/HomeView';
import { VelocityView } from './mfd/views/VelocityView';
import { AttitudeView } from './mfd/views/AttitudeView';
import { TelemetryView } from './mfd/views/TelemetryView';
import { FuelView } from './mfd/views/FuelView';
import { RadarView } from './mfd/views/RadarView';
import { GuideView } from './mfd/views/GuideView';
import { ApproachView } from './mfd/views/ApproachView';
import './MFD.scss';

// Re-export MFDViewKey if something else imports it from here for some reason
export type { MFDViewKey } from '../core/gameSignals';

type LblInfo = { text: string; active?: boolean; mod?: boolean; unused?: boolean };

export function MFD({ galaxy }: { galaxy: Galaxy }) {
  const activeView = mfdActiveViewSignal.value;
  const activeLabels = mfdLabelsSignal.value;

  const onOSB = (n: number) => {
    // Hardcoded routing for specific buttons
    if (n === 1) { mfdActiveViewSignal.value = 'home'; return; }
    if (n === 4) { mfdActiveViewSignal.value = 'tel'; return; }
    if (n === 5) { mfdActiveViewSignal.value = 'fuel'; return; }
    if (n === 6) { mfdActiveViewSignal.value = 'radar'; return; }
    
    // View-specific or conditional routing
    if (n === 2 && activeView !== 'guide') { mfdActiveViewSignal.value = 'guide'; return; }
    if (n === 3 && activeView === 'home') { mfdActiveViewSignal.value = 'approach'; return; }

    // Dispatch button press to active view
    mfdOsbPressSignal.value = { btn: n, tick: mfdOsbPressSignal.value.tick + 1 };
  };

  const parse = (s: string): LblInfo => s.endsWith('*') ? { text: s.slice(0,-1), mod: true } : s === '—' ? { text:'—', unused: true } : { text: s };
  
  const lbls: LblInfo[] = activeLabels.map((lbl, i) => {
    const info = parse(lbl);
    if (i === 0) info.active = activeView === 'home';
    if (i === 3) info.active = activeView === 'tel';
    if (i === 4) info.active = activeView === 'fuel';
    if (i === 5) info.active = activeView === 'radar';
    if (i === 2 && activeView === 'approach') info.active = true;
    return info;
  });

  const osbCls = (l: LblInfo) => `mfd-osb${l.active ? ' active' : ''}${l.mod ? ' modifier-on' : ''}${l.unused ? ' unused' : ''}`;
  const lblCls = (l: LblInfo) => `mfd-lbl${l.active ? ' active' : ''}${l.mod ? ' modifier-on' : ''}${l.unused ? ' unused' : ''}`;

  return (
    <div class="mfd">
      <div class="mfd-btns-top">
        {[0,1,2].map(i => <button key={i} class={osbCls(lbls[i])} onClick={() => onOSB(i + 1)} />)}
      </div>
      <div class="mfd-labels-top">
        {[0,1,2].map(i => <span key={i} class={lblCls(lbls[i])}>{lbls[i].text}</span>)}
      </div>
      <div class="mfd-screen">
        {activeView === 'home' && <HomeView />}
        {activeView === 'vel' && <VelocityView />}
        {activeView === 'att' && <AttitudeView galaxy={galaxy} />}
        {activeView === 'tel' && <TelemetryView />}
        {activeView === 'fuel' && <FuelView />}
        {activeView === 'radar' && <RadarView galaxy={galaxy} />}
        {activeView === 'guide' && <GuideView galaxy={galaxy} />}
        {activeView === 'approach' && <ApproachView galaxy={galaxy} />}
      </div>
      <div class="mfd-labels-bottom">
        {[3,4,5].map(i => <span key={i} class={lblCls(lbls[i])}>{lbls[i].text}</span>)}
      </div>
      <div class="mfd-btns-bottom">
        {[3,4,5].map(i => <button key={i} class={osbCls(lbls[i])} onClick={() => onOSB(i + 1)} />)}
      </div>
    </div>
  );
}
