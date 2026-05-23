import type { MFDData } from "../../MFD";
import type { MFDView } from "../MFDView";
import { makeMFDHeader, makeSep } from "../MFDUtils";

export class FuelView implements MFDView {
  private container!: HTMLElement;
  private fuelLeFill!: HTMLElement;
  private fuelLeAmount!: HTMLElement;
  private fuelMoFill!: HTMLElement;
  private fuelMoAmount!: HTMLElement;
  private fuelRateWrap!: HTMLElement;
  private fuelLeRateEl!: HTMLElement;
  private fuelMoRateEl!: HTMLElement;
  private fuelEstWrap!: HTMLElement;
  private fuelLeEstEl!: HTMLElement;
  private fuelMoEstEl!: HTMLElement;

  private leRateSmoothed = 0;
  private moRateSmoothed = 0;
  private lastFuelLE = -1;
  private lastFuelMO = -1;
  private lastFuelTime = 0;

  private flags = {
    showRate: true,
    showEst: true
  };

  mount(container: HTMLElement): void {
    this.container = document.createElement("div");
    this.container.className = "mfd-view mfd-view-fuel";
    
    this.container.appendChild(makeMFDHeader("ERGOL SYS"));
    this.container.appendChild(makeSep());

    const leBar = this.makeFuelBarRow("L-ERGOL", "mfd-fuel-le");
    this.fuelLeFill = leBar.fill; this.fuelLeAmount = leBar.amount;
    this.container.appendChild(leBar.el);

    const moBar = this.makeFuelBarRow("MONERGOL", "mfd-fuel-mo");
    this.fuelMoFill = moBar.fill; this.fuelMoAmount = moBar.amount;
    this.container.appendChild(moBar.el);

    this.container.appendChild(makeSep());

    this.fuelRateWrap = document.createElement("div");
    const leRateRow = document.createElement("div");
    leRateRow.className = "mfd-row";
    leRateRow.appendChild(Object.assign(document.createElement("span"), { className: "mfd-label", textContent: "LE/S" }));
    this.fuelLeRateEl = Object.assign(document.createElement("span"), { className: "mfd-val", textContent: "0.0" });
    leRateRow.appendChild(this.fuelLeRateEl);
    leRateRow.appendChild(Object.assign(document.createElement("span"), { className: "mfd-unit", textContent: "u/s" }));
    
    const moRateRow = document.createElement("div");
    moRateRow.className = "mfd-row";
    moRateRow.appendChild(Object.assign(document.createElement("span"), { className: "mfd-label", textContent: "MO/S" }));
    this.fuelMoRateEl = Object.assign(document.createElement("span"), { className: "mfd-val", textContent: "0.0" });
    moRateRow.appendChild(this.fuelMoRateEl);
    moRateRow.appendChild(Object.assign(document.createElement("span"), { className: "mfd-unit", textContent: "u/s" }));
    
    this.fuelRateWrap.appendChild(leRateRow);
    this.fuelRateWrap.appendChild(moRateRow);
    this.container.appendChild(this.fuelRateWrap);

    this.container.appendChild(makeSep());

    this.fuelEstWrap = document.createElement("div");
    const leEstRow = document.createElement("div");
    leEstRow.className = "mfd-row";
    leEstRow.appendChild(Object.assign(document.createElement("span"), { className: "mfd-label", textContent: "LE ETA" }));
    this.fuelLeEstEl = Object.assign(document.createElement("span"), { className: "mfd-val", textContent: "—" });
    leEstRow.appendChild(this.fuelLeEstEl);
    
    const moEstRow = document.createElement("div");
    moEstRow.className = "mfd-row";
    moEstRow.appendChild(Object.assign(document.createElement("span"), { className: "mfd-label", textContent: "MO ETA" }));
    this.fuelMoEstEl = Object.assign(document.createElement("span"), { className: "mfd-val", textContent: "—" });
    moEstRow.appendChild(this.fuelMoEstEl);
    
    this.fuelEstWrap.appendChild(leEstRow);
    this.fuelEstWrap.appendChild(moEstRow);
    this.container.appendChild(this.fuelEstWrap);

    container.appendChild(this.container);
  }

  update(data: MFDData): void {
    const now = performance.now();
    if (this.lastFuelLE >= 0) {
      const dt = (now - this.lastFuelTime) / 1000;
      if (dt > 0.05) {
        const leRate = (this.lastFuelLE - data.liquidErgol) / dt;
        const moRate = (this.lastFuelMO - data.monergol) / dt;
        this.leRateSmoothed = this.leRateSmoothed * 0.88 + Math.max(0, leRate) * 0.12;
        this.moRateSmoothed = this.moRateSmoothed * 0.88 + Math.max(0, moRate) * 0.12;
      }
    }
    this.lastFuelLE = data.liquidErgol;
    this.lastFuelMO = data.monergol;
    this.lastFuelTime = now;

    const { liquidErgol, maxLiquidErgol, monergol, maxMonergol } = data;

    const lePct = maxLiquidErgol > 0 ? liquidErgol / maxLiquidErgol : 0;
    const moPct = maxMonergol    > 0 ? monergol    / maxMonergol    : 0;

    this.fuelLeFill.style.width = `${lePct * 100}%`;
    this.fuelLeAmount.textContent = `${Math.ceil(liquidErgol)}/${maxLiquidErgol}`;
    this.fuelLeFill.classList.toggle("mfd-fuel-critical", lePct < 0.2);

    this.fuelMoFill.style.width = `${moPct * 100}%`;
    this.fuelMoAmount.textContent = `${Math.ceil(monergol)}/${maxMonergol}`;
    this.fuelMoFill.classList.toggle("mfd-fuel-critical", moPct < 0.2);

    if (this.flags.showRate) {
      this.fuelLeRateEl.textContent = this.leRateSmoothed.toFixed(1);
      this.fuelMoRateEl.textContent = this.moRateSmoothed.toFixed(1);
    }

    if (this.flags.showEst) {
      const eta = (fuel: number, rate: number) => {
        if (rate < 0.05) return "∞";
        const s = fuel / rate;
        if (s > 3600) return `${Math.floor(s / 3600)}h${Math.floor((s % 3600) / 60)}m`;
        if (s > 60)   return `${Math.floor(s / 60)}m${Math.floor(s % 60)}s`;
        return `${Math.floor(s)}s`;
      };
      this.fuelLeEstEl.textContent = eta(liquidErgol, this.leRateSmoothed);
      this.fuelMoEstEl.textContent = eta(monergol,    this.moRateSmoothed);
    }
  }

  private makeFuelBarRow(label: string, colorClass: string): { el: HTMLElement; fill: HTMLElement; amount: HTMLElement } {
    const el = document.createElement("div");
    el.className = "mfd-fuel-row";

    const headerRow = document.createElement("div");
    headerRow.className = "mfd-row";
    headerRow.appendChild(Object.assign(document.createElement("span"), { className: "mfd-label", textContent: label }));
    const amount = Object.assign(document.createElement("span"), { className: "mfd-val mfd-fuel-amount", textContent: "—" });
    headerRow.appendChild(amount);
    el.appendChild(headerRow);

    const barWrap = document.createElement("div");
    barWrap.className = "mfd-fuel-bar-wrap";
    const fill = document.createElement("div");
    fill.className = `mfd-fuel-bar-fill ${colorClass}`;
    fill.style.width = "100%";
    barWrap.appendChild(fill);
    el.appendChild(barWrap);

    return { el, fill, amount };
  }

  onOSB(index: number): void {
    if (index === 2) {
      this.flags.showRate = !this.flags.showRate;
      this.fuelRateWrap.style.display = this.flags.showRate ? "block" : "none";
    }
    if (index === 3) {
      this.flags.showEst = !this.flags.showEst;
      this.fuelEstWrap.style.display = this.flags.showEst ? "block" : "none";
    }
  }

  getLabels(): string[] {
    return [
      "HOME",
      this.flags.showRate ? "RATE*" : "RATE",
      this.flags.showEst ? "EST*" : "EST",
      "TEL", "FUEL", "RADAR"
    ];
  }
}
