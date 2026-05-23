import type { GameMode } from '../core/GameState';

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
  onStart: (mode: GameMode, showBlackholes: boolean) => void = () => {};

  constructor() {
    const el = document.querySelector<HTMLElement>('#landing');
    if (!el) throw new Error('Missing #landing element');
    this.el = el;

    for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) {
      btn.addEventListener('click', () => {
        const mode = btn.dataset['mode'] as GameMode;
        const showBH = document.querySelector<HTMLInputElement>('#inp-show-blackholes')?.checked ?? true;
        this.el.classList.add('hidden');
        this.onStart(mode, showBH);
      });
    }
  }
}
