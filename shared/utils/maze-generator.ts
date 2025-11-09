import { getRandomInt } from "./common-helpers";
import {CellType, createRectGrid, Grid} from "../types/Grid";
import {Vector2} from "../interfaces/Vector2";

function recursiveDFS(grid: Grid, pos: Vector2): void {
  // assume pos is a valid position in the grid
  grid.setCell(pos, CellType.Passage);

  const neighbors = grid.getNeighbors(pos);
  while (neighbors.length != 0) {
    let index = getRandomInt(0, neighbors.length);
    const neighborPos = neighbors[index];
    neighbors.splice(index, 1);
    if (grid.getCell(neighborPos) != CellType.Wall) continue;

    const bridgePos: Vector2 = {
      x: (pos.x + neighborPos.x) / 2,
      y: (pos.y + neighborPos.y) / 2,
    };
    grid.setCell(bridgePos, CellType.Passage);
    recursiveDFS(grid, neighborPos);
  }
}

export function generateDFSRectGrid(width: number, height: number): Grid {
  const grid: Grid = createRectGrid(width, height);
  recursiveDFS(grid, { x: 0, y: 0 });

  return grid;
}
