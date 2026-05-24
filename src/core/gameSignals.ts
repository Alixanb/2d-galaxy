import { signal } from "@preact/signals";

export const speedSignal = signal<number>(0);
export const leSignal = signal<number>(0);
export const leMaxSignal = signal<number>(500);
export const moSignal = signal<number>(0);
export const moMaxSignal = signal<number>(100);
export const decaySecondsSignal = signal<number | null>(null);
export const decayMaxSignal = signal<number | null>(null);

export const headingSignal = signal<number>(0);
export const velSignal = signal<{ x: number; y: number }>({ x: 0, y: 0 });
export const posSignal = signal<{ x: number; y: number }>({ x: 0, y: 0 });
export const bhAltSignal = signal<number>(0);

export const systemIdSignal = signal<string>("SOL-0");
export const elapsedSignal = signal<number>(0);
export const progressSignal = signal<number>(0);

export const fpsSignal = signal<number>(0);
export const starCountSignal = signal<number>(0);
export const totalStarsSignal = signal<number>(0);
