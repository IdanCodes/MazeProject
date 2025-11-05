import {GridPos} from "./GridPos";
import {clamp} from "../utils/common-helpers";

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

  public getCell(pos: GridPos): CellType {
    return this.matrix[pos.row][pos.col];
  }

  public setCell(pos: GridPos, cell: CellType): void {
    this.matrix[pos.row][pos.col] = cell;
  }

  // get neighbors on the grid (+-2, +-2)
  public getNeighbors(pos: GridPos): GridPos[] {
    const result: GridPos[] = [];

    const upRow = pos.row - 2;
    const rightCol = pos.col + 2;
    const downRow = pos.row + 2;
    const leftCol = pos.col - 2;

    // check up
    if (upRow >= 0) result.push({ row: upRow, col: pos.col });

    // check right
    if (rightCol < this.width) result.push({ row: pos.row, col: rightCol });

    // check down
    if (downRow < this.height) result.push({ row: downRow, col: pos.col });

    // check left
    if (leftCol >= 0) result.push({ row: pos.row, col: leftCol });

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
  public clamp(pos: GridPos): GridPos {
    return {
      row: clamp(pos.row, 0, this.height - 1),
      col: clamp(pos.col, 0, this.width - 1),
    };
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

// adds a wall border to a duplicate of the srcGrid and returns it
export function addBorder(srcGrid: Grid): Grid {
  const resultGrid = createRectGrid(srcGrid.width + 2, srcGrid.height + 2);

  for (let i = 1; i < resultGrid.height - 1; i++) {
    // copy row
    for (let j = 1; j < resultGrid.width - 1; j++) {
      resultGrid.setCell(
        { row: i, col: j },
        srcGrid.getCell({ row: i - 1, col: j - 1 }),
      );
    }
  }

  return resultGrid;
}

