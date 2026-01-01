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
      return 400;
    case MazeSize.Small:
      return 550;
    case MazeSize.Medium:
      return 650;
    case MazeSize.Large:
      return 800;
    case MazeSize.XL:
      return 900;
  }
}
