export enum MazeSize {
  XS,
  Small,
  Medium,
  Large,
  XL,
}

export function getMazeRenderHeight(size: MazeSize) {
  switch (size) {
    case MazeSize.XS:
      return 50;
    case MazeSize.Small:
      return 100;
    case MazeSize.Medium:
      return 150;
    case MazeSize.Large:
      return 200;
    case MazeSize.XL:
      return 250;
  }
}
