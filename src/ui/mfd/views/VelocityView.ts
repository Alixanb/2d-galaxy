import type { MFDData } from "../../MFD";
import type { MFDView } from "../MFDView";
import { makeMFDHeader, makeSep, makeVelRow, makeDataRow, SCALE, VEL_THRESHOLD } from "../MFDUtils";

export class VelocityView implements MFDView {
  private container!: HTMLElement;
  private velArrowX!: HTMLElement;
  private velArrowY!: HTMLElement;
  private velValueX!: HTMLElement;
  private velValueY!: HTMLElement;
  private velMag!: HTMLElement;
  private velSpd!: HTMLElement;
  private velAngRow!: HTMLElement;
  private velAngValue!: HTMLElement;

  private flags = {
    showAngVel: false
  };

  mount(container: HTMLElement): void {
    this.container = document.createElement("div");
    this.container.className = "mfd-view mfd-view-vel";
    
    this.container.appendChild(makeMFDHeader("VELOCITY"));
    this.container.appendChild(makeSep());

    const rx = makeVelRow("VX");
    this.velArrowX = rx.arrow; this.velValueX = rx.value;
    this.container.appendChild(rx.el);

    const ry = makeVelRow("VY");
    this.velArrowY = ry.arrow; this.velValueY = ry.value;
    this.container.appendChild(ry.el);

    this.container.appendChild(makeSep());

    const magRow = makeDataRow("|V|");
    this.velMag = magRow.value;
    this.container.appendChild(magRow.el);

    const spdRow = document.createElement("div");
    spdRow.className = "mfd-row";
    const spdLbl = document.createElement("span");
    spdLbl.className = "mfd-label";
    spdLbl.textContent = "SPD";
    const spdUnit = document.createElement("span");
    spdUnit.className = "mfd-unit";
    spdUnit.textContent = "m/s";
    this.velSpd = document.createElement("span");
    this.velSpd.className = "mfd-val mfd-val-spd";
    this.velSpd.textContent = "0.0";
    
    spdRow.appendChild(spdLbl);
    spdRow.appendChild(spdUnit);
    spdRow.appendChild(this.velSpd);
    this.container.appendChild(spdRow);

    this.velAngRow = document.createElement("div");
    this.velAngRow.className = "mfd-row";
    this.velAngRow.style.display = "none";
    const angLbl = document.createElement("span");
    angLbl.className = "mfd-label";
    angLbl.textContent = "ω RAD";
    this.velAngValue = document.createElement("span");
    this.velAngValue.className = "mfd-val";
    this.velAngValue.textContent = "0.000";
    
    this.velAngRow.appendChild(angLbl);
    this.velAngRow.appendChild(this.velAngValue);
    this.container.appendChild(this.velAngRow);

    container.appendChild(this.container);
  }

  update(data: MFDData): void {
    const { vx, vy, angularVel } = data;
    const fmt = (v: number) => (Math.abs(v) * SCALE).toFixed(2);
    const speed = Math.hypot(vx, vy);

    this.velArrowX.textContent = vx > VEL_THRESHOLD ? "→" : vx < -VEL_THRESHOLD ? "←" : "·";
    this.velArrowY.textContent = vy > VEL_THRESHOLD ? "↓" : vy < -VEL_THRESHOLD ? "↑" : "·";
    this.velValueX.textContent = fmt(vx);
    this.velValueY.textContent = fmt(vy);
    this.velMag.textContent = (speed * SCALE).toFixed(2);
    this.velSpd.textContent = (speed * SCALE).toFixed(1);

    this.velValueX.style.opacity = Math.abs(vx) < VEL_THRESHOLD ? "0.35" : "1";
    this.velValueY.style.opacity = Math.abs(vy) < VEL_THRESHOLD ? "0.35" : "1";
    this.velMag.style.opacity = speed < VEL_THRESHOLD ? "0.35" : "1";

    if (this.flags.showAngVel) {
      this.velAngValue.textContent = (angularVel * 1000).toFixed(3);
    }
  }

  onOSB(index: number): void {
    if (index === 2) {
      this.flags.showAngVel = !this.flags.showAngVel;
      this.velAngRow.style.display = this.flags.showAngVel ? "flex" : "none";
    }
  }

  getLabels(): string[] {
    return ["HOME", this.flags.showAngVel ? "ANG VEL*" : "ANG VEL", "—", "TEL", "FUEL", "RADAR"];
  }
}
