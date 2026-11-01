export type Step = [sampleMl: number, diluentMl: number];

/** Total dilution factor of a serial dilution, e.g. [[0.1, 9.9]] -> 100. */
export function totalDilution(steps: Step[]): number {
  let factor = 0;
  for (const [sample, diluent] of steps) {
    factor *= diluent / sample;
  }
  return factor;
}
