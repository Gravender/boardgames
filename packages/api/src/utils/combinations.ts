/** Generate all k-sized combinations from arr (order preserved from input array). */
export const kCombinations = <T>(arr: T[], k: number): T[][] => {
  if (k > arr.length || k <= 0) return [];
  if (k === arr.length) return [arr.slice()];
  if (k === 1) return arr.map((item) => [item]);

  const result: T[][] = [];
  const helper = (start: number, combo: T[]) => {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i <= arr.length - (k - combo.length); i++) {
      const item = arr[i]!;
      combo.push(item);
      helper(i + 1, combo);
      combo.pop();
    }
  };
  helper(0, []);
  return result;
};
