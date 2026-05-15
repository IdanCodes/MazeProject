// min is inclusive, max is exclusive
export function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

// linear interpolation between two numbers
export function lerp(a: number, b: number, alpha: number): number {
  return a + alpha * (b - a);
}

export function moveTowards(a: number, b: number, step: number): number {
  return b == a
    ? a
    : a +
        Math.min(Math.abs(step), Math.abs(b - a)) * ((b - a) / Math.abs(b - a));
}

// format a time from ms to a string representing seconds
export const formatTime = (time: number): string => (time / 1000.0).toFixed(2);

export const getRaw = (x: number): number => (x > 0 ? 1 : x < 0 ? -1 : 0);
