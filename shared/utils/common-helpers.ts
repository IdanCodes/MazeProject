// min is inclusive, max is exclusive
export function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
}

export const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);
