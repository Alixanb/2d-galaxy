import { render, createRef } from 'preact';
import { forwardRef, useImperativeHandle } from 'preact/compat';
import { useRef, useEffect, useState } from 'preact/hooks';
import Galaxy from '../systems/Galaxy';
import type { MFDView } from './mfd/MFDView';
import { HomeView } from './mfd/views/HomeView';
import { VelocityView } from './mfd/views/VelocityView';
import { AttitudeView } from './mfd/views/AttitudeView';
import { TelemetryView } from './mfd/views/TelemetryView';
import { FuelView } from './mfd/views/FuelView';
import { RadarView } from './mfd/views/RadarView';
import { GuideView } from './mfd/views/GuideView';
import { ApproachView } from './mfd/views/ApproachView';
import './MFD.scss';

export interface MFDData {
  vx: number; vy: number; dist: number; angularVel: number;
  starCount: number; totalStars: number; fps: number;
  liquidErgol: number; maxLiquidErgol: number;
  monergol: number; maxMonergol: number;
  isThrusting: boolean; completedCount: number;
  systemId: string; totalSystems: number;
}

export type MFDViewKey = 'home' | 'vel' | 'att' | 'tel' | 'fuel' | 'radar' | 'guide' | 'approach';
const VIEW_KEYS: MFDViewKey[] = ['home', 'vel', 'att', 'tel', 'fuel', 'radar', 'guide', 'approach'];

type LblInfo = { text: string; active?: boolean; mod?: boolean; unused?: boolean };

interface MFDRef { update(data: MFDData): void; }

const MFDComponent = forwardRef<MFDRef, { galaxy: Galaxy }>(({ galaxy }, ref) => {
  const [activeView, setActiveView] = useState<MFDViewKey>('home');
  const [, forceUpdate] = useState(0);
  const views = useRef<Record<MFDViewKey, MFDView> | null>(null);
  const guideRef = useRef<GuideView | null>(null);
  const containers = useRef<Partial<Record<MFDViewKey, HTMLDivElement>>>({});
  const activeRef = useRef(activeView);
  activeRef.current = activeView;

  useEffect(() => {
    const gv = new GuideView(galaxy);
    guideRef.current = gv;
    views.current = {
      home: new HomeView(k => setActiveView(k as MFDViewKey)),
      vel: new VelocityView(), att: new AttitudeView(galaxy),
      tel: new TelemetryView(), fuel: new FuelView(),
      radar: new RadarView(galaxy), guide: gv,
      approach: new ApproachView(galaxy),
    };
    for (const key of VIEW_KEYS) {
      const el = containers.current[key];
      if (el) views.current[key].mount(el);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    update(data) { views.current?.[activeRef.current].update(data); },
  }));

  const onOSB = (n: number) => {
    if (n === 1) { setActiveView('home'); return; }
    if (n === 2) {
      if (activeView === 'guide') { views.current?.guide.onOSB(2); forceUpdate(x => x + 1); }
      else setActiveView('guide');
      return;
    }
    if (n === 3 && activeView === 'home') { setActiveView('approach'); return; }
    if (n === 4) { setActiveView('tel'); return; }
    if (n === 5) { setActiveView('fuel'); return; }
    if (n === 6) { setActiveView('radar'); return; }
    views.current?.[activeView].onOSB(n);
    forceUpdate(x => x + 1);
  };

  const activeLabels = views.current?.[activeView]?.getLabels() ?? ['HOME','GUIDE','—','TEL','FUEL','RADAR'];
  const parse = (s: string): LblInfo => s.endsWith('*') ? { text: s.slice(0,-1), mod: true } : s === '—' ? { text:'—', unused: true } : { text: s };
  const guideTab = guideRef.current?.tab ?? 'escape';
  const lbls: LblInfo[] = [
    { ...parse(activeLabels[0] ?? 'HOME'), active: activeView === 'home' },
    activeView === 'guide' ? { text: 'APPR', mod: guideTab === 'approach' } : { text: 'GUIDE' },
    activeView === 'guide' ? { text: 'ESC', mod: guideTab === 'escape' }
      : activeView === 'home' ? { text: 'APCH' }
      : activeView === 'approach' ? { text: 'APCH', active: true }
      : parse(activeLabels[2] ?? '—'),
    { ...parse(activeLabels[3] ?? 'TEL'), active: activeView === 'tel' },
    { ...parse(activeLabels[4] ?? 'FUEL'), active: activeView === 'fuel' },
    { ...parse(activeLabels[5] ?? 'RADAR'), active: activeView === 'radar' },
  ];
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
        {VIEW_KEYS.map(key => (
          <div key={key} style={{ display: key === activeView ? 'flex' : 'none', flex: 1, overflow: 'hidden' }}
               ref={el => { if (el) containers.current[key] = el; }} />
        ))}
      </div>
      <div class="mfd-labels-bottom">
        {[3,4,5].map(i => <span key={i} class={lblCls(lbls[i])}>{lbls[i].text}</span>)}
      </div>
      <div class="mfd-btns-bottom">
        {[3,4,5].map(i => <button key={i} class={osbCls(lbls[i])} onClick={() => onOSB(i + 1)} />)}
      </div>
    </div>
  );
});

export function mountMFD(container: HTMLElement, galaxy: Galaxy): { update(data: MFDData): void } {
  const r = createRef<MFDRef>();
  render(<MFDComponent ref={r} galaxy={galaxy} />, container);
  return { update: (data) => r.current?.update(data) };
}
