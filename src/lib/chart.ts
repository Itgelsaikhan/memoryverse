/** "Nice" axis ticks (1, 2, 2.5, 5 × 10ⁿ steps) that always enclose [min, max]. */
export function niceTicks(min: number, max: number, count = 5) {
  const span = max - min || 1;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? step0;
  // Ticks always enclose the data: floor below the minimum, ceil above the maximum
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let i = 0; start + i * step <= end + step * 0.001; i++) ticks.push(Number((start + i * step).toFixed(10)));
  return ticks;
}
