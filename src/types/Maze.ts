import { addBorder, CellType, Grid, GridPos } from "./Grid";

export class Maze {
  public readonly width: number;
  public readonly height: number;
  private readonly grid: Grid;

  // border:
  // - finishColumn, startColumn - the column index of the start and finish rows
  // - undefined => don't create border
  constructor(
    grid: Grid,
    border:
      | { finishColumn: number; startColumn: number }
      | undefined = undefined,
  ) {
    const borderEnabled: boolean = border !== undefined;
    if (border) {
      grid = addBorder(grid);
      if (0 <= border.finishColumn && border.finishColumn < grid.width)
        grid.setCell({ row: 0, col: border.finishColumn }, CellType.Passage);

      if (0 <= border.startColumn && border.startColumn < grid.width)
        grid.setCell(
          { row: grid.height - 1, col: border.startColumn },
          CellType.Passage,
        );
    }

    this.grid = grid;
    this.width = grid.width;
    this.height = grid.height;
  }

  public getCell(pos: GridPos): CellType {
    return this.grid.getCell(pos);
  }

  public printMaze(): void {
    this.grid.printGrid();
  }

  public getMatrix() {
    return this.grid.createDuplicate();
  }
}
