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
      return 350;
    case MazeSize.Small:
      return 400;
    case MazeSize.Medium:
      return 550;
    case MazeSize.Large:
      return 650;
    case MazeSize.XL:
      return 800;
  }
}
