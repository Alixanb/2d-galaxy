export type SimulationConfig = {
  nStars: number;
  galaxySize: number;
  simulationSpeed: number;
  nBlackHoles: number;
  showPath: boolean;
  showBlackholes: boolean;
};

export default class LandingPage {
  private el: HTMLElement;
  onStart: (config: SimulationConfig) => void = () => {};

  constructor() {
    const el = document.querySelector<HTMLElement>("#landing");
    if (!el) throw new Error("Missing #landing element");
    this.el = el;

    this.bindInputs();

    const startBtn = document.querySelector<HTMLButtonElement>("#start-btn");
    startBtn?.addEventListener("click", () => this.handleStart());
  }

  private bindInputs() {
    const bind = (id: string, displayId: string, format: (v: number) => string) => {
      const input = document.querySelector<HTMLInputElement>(id);
      const display = document.querySelector<HTMLElement>(displayId);
      if (!input || !display) return;
      const update = () => { display.textContent = format(Number(input.value)); };
      input.addEventListener("input", update);
      update();
    };

    bind("#inp-stars", "#val-stars", (v) => v.toString());
    bind("#inp-galaxy-size", "#val-galaxy-size", (v) => (v / 100).toFixed(2));
    bind("#inp-sim-speed", "#val-sim-speed", (v) => `${v}×`);
    bind("#inp-blackholes", "#val-blackholes", (v) => v.toString());
  }

  private getConfig(): SimulationConfig {
    const get = (id: string) =>
      Number(document.querySelector<HTMLInputElement>(id)?.value ?? 0);
    const getCheck = (id: string) =>
      (document.querySelector<HTMLInputElement>(id)?.checked) ?? false;

    return {
      nStars: get("#inp-stars"),
      galaxySize: get("#inp-galaxy-size") / 100,
      simulationSpeed: get("#inp-sim-speed"),
      nBlackHoles: get("#inp-blackholes"),
      showPath: getCheck("#inp-show-path"),
      showBlackholes: getCheck("#inp-show-blackholes"),
    };
  }

  private handleStart() {
    const config = this.getConfig();
    this.el.classList.add("hidden");
    this.onStart(config);
  }
}
