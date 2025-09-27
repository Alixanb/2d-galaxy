export function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

export function interpolate(min: number, max: number, coefficient: number) {
  if (coefficient < 0 || coefficient > 1)
    throw new Error("coefficient must be between 0 and 1");
  return min * (1 - coefficient) + max * coefficient;
}

export function benchmark(
  fn: (...args: any[]) => void,
  iteration = 100,
  ...args: any[]
) {
  const start = performance.now();

  for (let i = 0; i < iteration; i++) {
    fn(...args);
  }

  const end = performance.now();
  const diff = end - start;
  console.log(
    `Function takes on average ${(diff / iteration).toFixed(
      4
    )}ms to execute \n ${diff.toFixed(
      4
    )}ms in total, for ${iteration} executions.`
  );
  return diff;
}
