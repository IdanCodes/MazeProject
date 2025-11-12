import { clamp } from "../utils/common-helpers";
import { Vector2 } from "../interfaces/Vector2";

/**
 * Type of cell
 */
export enum CellType {
  Wall,
  Passage,
}

export function getCellChar(cell: CellType): string {
  const wallChar = "\u25FC";
  const passageChar = "\u25FD";
  return cell == CellType.Wall ? wallChar : passageChar;
}

export class Grid {
  private _width: number = 0;
  private _height: number = 0;
  private readonly matrix: CellType[][];

  private set width(value: number) {
    this._width = value;
  }

  private set height(value: number) {
    this._height = value;
  }

  public get width(): number {
    return this._width;
  }

  public get height(): number {
    return this._height;
  }

  constructor(matrix: CellType[][]) {
    this.matrix = [];
    this.height = matrix.length;
    this.width = matrix[0].length;

    for (let i = 0; i < this.height; i++) {
      this.matrix.push([]);
      for (let j = 0; j < this.width; j++) this.matrix[i].push(matrix[i][j]);
    }
  }

  public getCell(pos: Vector2): CellType {
    return this.matrix[pos.y][pos.x];
  }

  public setCell(pos: Vector2, cell: CellType): void {
    this.matrix[pos.y][pos.x] = cell;
  }

  // get neighbors on the grid (+-2, +-2)
  public getNeighbors(pos: Vector2): Vector2[] {
    const result: Vector2[] = [];

    const upRow = pos.y - 2;
    const rightCol = pos.x + 2;
    const downRow = pos.y + 2;
    const leftCol = pos.x - 2;

    // check up
    if (upRow >= 0) result.push({ x: pos.x, y: upRow });

    // check right
    if (rightCol < this.width) result.push({ x: rightCol, y: pos.y });

    // check down
    if (downRow < this.height) result.push({ x: pos.x, y: downRow });

    // check left
    if (leftCol >= 0) result.push({ x: leftCol, y: pos.y });

    return result;
  }

  public printGrid(): void {
    let str = "";
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++)
        str += getCellChar(this.matrix[i][j]);
      str += "\n";
    }

    console.log(str);
  }

  public createDuplicate() {
    const resultMat = createMatrix(this.width, this.height);
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) resultMat[i][j] = this.matrix[i][j];
    }

    return resultMat;
  }

  // clamp a position into this grid
  public clamp(pos: Vector2): Vector2 {
    return {
      x: clamp(pos.x, 0, this.width - 1),
      y: clamp(pos.y, 0, this.height - 1),
    };
  }

  public inBounds(pos: Vector2): boolean {
    return (
      pos.y >= 0 && pos.y < this.height && pos.x >= 0 && pos.x < this.width
    );
  }
}

export const createGrid = (
  size: number,
  cellType: CellType = CellType.Wall,
): Grid => createRectGrid(size, size, cellType);

export function createRectGrid(
  width: number,
  height: number,
  cellType: CellType = CellType.Wall,
): Grid {
  width = width | 1; // force odd
  height = height | 1; // force odd
  return new Grid(createMatrix(width, height, cellType));
}

// create a matrix
export function createMatrix(
  width: number,
  height: number,
  cellType: CellType = CellType.Wall,
): CellType[][] {
  return Array.from({ length: height }, () => Array(width).fill(cellType));
}
