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
      return 100;
    case MazeSize.Small:
      return 200;
    case MazeSize.Medium:
      return 300;
    case MazeSize.Large:
      return 400;
    case MazeSize.XL:
      return 500;
  }
}
