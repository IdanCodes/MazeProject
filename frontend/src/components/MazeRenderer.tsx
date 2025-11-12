import React, { JSX } from "react";
import clsx from "clsx";
import { getMazeRenderHeight, MazeSize } from "../types/maze-size";
import { CellType } from "../types/Grid";
import { Maze } from "../types/Maze";

function MatrixCell({
  cell,
  cellScale,
}: {
  cell: CellType;
  cellScale: number;
}): JSX.Element {
  return (
    <div
      style={{
        width: `${0.25 * cellScale}rem`,
        height: `${0.25 * cellScale}rem`,
        borderWidth: "0.5qpx",
      }}
      className={clsx(
        ``,
        cell == CellType.Passage &&
          "bg-white hover:bg-purple-300/90 active:bg-purple-600/80",
        cell == CellType.Wall &&
          "bg-black hover:bg-purple-800/80 active:bg-purple-700/90",
      )}
    ></div>
  );
}

function MatrixRow({
  row,
  rowIndex,
  cellScale,
  width,
}: {
  row: CellType[];
  rowIndex: number;
  width: number;
  cellScale: number;
}) {
  return (
    <div
      key={rowIndex}
      style={{ width: `${0.25 * width}rem` }}
      className={`flex flex-row justify-between`}
    >
      {row.map((cell, colIndex) => (
        <MatrixCell
          key={`${rowIndex},${colIndex}`}
          cell={cell}
          cellScale={cellScale}
        />
      ))}
    </div>
  );
}

function MazeRenderer({
  maze,
  size,
  cellSpacing = 0,
}: {
  maze: Maze;
  size: MazeSize;
  cellSpacing?: number;
}) {
  const matrix = maze.getMatrix();
  const cellScale = getMazeRenderHeight(size) / maze.height;
  const rowWidth: number = (cellScale + cellSpacing) * maze.width;

  // return <canvas></canvas>;

  return (
    <div className="flex justify-center">
      <div className={`flex flex-col justify-between`}>
        {matrix.map((row, rowIndex) => (
          <MatrixRow
            key={rowIndex}
            row={row}
            rowIndex={rowIndex}
            cellScale={cellScale}
            width={rowWidth}
          />
        ))}
      </div>
    </div>
  );
}

export default MazeRenderer;
