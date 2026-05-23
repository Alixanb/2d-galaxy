import type { MFDData } from "../MFD";

export interface MFDView {
  mount(container: HTMLElement): void;
  update(data: MFDData): void;
  onOSB(index: number): void;
  getLabels(): string[];
}
