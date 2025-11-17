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
      return 250;
    case MazeSize.Small:
      return 400;
    case MazeSize.Medium:
      return 500;
    case MazeSize.Large:
      return 550;
    case MazeSize.XL:
      return 625;
  }
}
