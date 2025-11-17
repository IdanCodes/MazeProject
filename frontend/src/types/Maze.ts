import { CellType, Grid } from "./Grid";
import { Vector2 } from "../interfaces/Vector2";
import { generateDFSRectGrid } from "@src/utils/maze-generator";

export class Maze {
  public readonly width: number;
  public readonly height: number;
  private readonly grid: Grid;

  constructor(grid: Grid) {
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

export function generateMaze(mazeScale: number) {
  return new Maze(generateDFSRectGrid(mazeScale * 2 - 1, mazeScale * 2 - 1));
}
