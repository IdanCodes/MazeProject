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
      return 150;
    case MazeSize.Small:
      return 250;
    case MazeSize.Medium:
      return 400;
    case MazeSize.Large:
      return 500;
    case MazeSize.XL:
      return 650;
  }
}
