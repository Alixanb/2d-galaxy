import { render, createRef } from 'preact';
import { forwardRef, useImperativeHandle } from 'preact/compat';
import type { MFDData, MFDViewKey } from '../../MFD';
import type { MFDView } from '../MFDView';
import './HomeView.scss';

interface HomeViewRef { getLabels(): string[]; onOSB(idx: number): void; }

const ITEMS: { label: string; key: MFDViewKey }[] = [
  { label: 'VELOCITY', key: 'vel' },
  { label: 'ATTITUDE', key: 'att' },
  { label: 'TELEMETRY', key: 'tel' },
  { label: 'ERGOL SYS', key: 'fuel' },
  { label: 'RADAR NAV', key: 'radar' },
];

const HomeViewComponent = forwardRef<HomeViewRef, { setView: (key: MFDViewKey) => void }>(
  ({ setView }, ref) => {
    useImperativeHandle(ref, () => ({
      getLabels: () => ['HOME', 'VEL', 'ATT', 'TEL', 'FUEL', 'RADAR'],
      onOSB: () => {},
    }));
    return (
      <div class="mfd-view mfd-view-home" style="display:flex">
        <div class="mfd-home-row">
          {ITEMS.slice(0, 2).map(({ label, key }) => (
            <div key={key} class="mfd-home-item" onClick={() => setView(key)}>{label}</div>
          ))}
        </div>
        <div class="mfd-home-row">
          {ITEMS.slice(2).map(({ label, key }) => (
            <div key={key} class="mfd-home-item" onClick={() => setView(key)}>{label}</div>
          ))}
        </div>
      </div>
    );
  }
);

export class HomeView implements MFDView {
  private r = createRef<HomeViewRef>();
  private setViewCb: (key: MFDViewKey) => void;
  constructor(setViewCb: (key: MFDViewKey) => void) { this.setViewCb = setViewCb; }

  mount(container: HTMLElement): void {
    render(<HomeViewComponent ref={this.r} setView={this.setViewCb} />, container);
  }

  update(_data: MFDData): void {}

  getLabels(): string[] {
    return this.r.current?.getLabels() ?? ['HOME', 'VEL', 'ATT', 'TEL', 'FUEL', 'RADAR'];
  }

  onOSB(_idx: number): void {}
}
