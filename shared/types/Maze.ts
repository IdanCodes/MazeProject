import { addBorder, CellType, Grid } from "./Grid";
import {Vector2} from "../interfaces/Vector2";

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
        grid.setCell({ x: border.finishColumn, y: 0 }, CellType.Passage);

      if (0 <= border.startColumn && border.startColumn < grid.width)
        grid.setCell(
          { x: border.startColumn, y: grid.height - 1 },
          CellType.Passage,
        );
    }

    this.grid = grid;
    this.width = grid.width;
    this.height = grid.height;
  }

  public getCell(pos: Vector2): CellType {
    return this.grid.getCell(pos);
  }

  public printMaze(): void {
    this.grid.printGrid();
  }

  public getMatrix() {
    return this.grid.createDuplicate();
  }

  // clamp a position to this maze's bounds
  public clamp(pos: Vector2): Vector2 {
      return this.grid.clamp(pos);
  }

  public inBounds(pos: Vector2): boolean {
      return this.grid.inBounds(pos);
  }
}
