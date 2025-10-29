import "./index.css";
import { generateDFSRectGrid } from "./utils/mazeGenerator";
import { ChangeEvent, useState } from "react";
import MazeRenderer, { MazeSize } from "./components/MazeRenderer";
import { Maze } from "./types/Maze";
import { createRectGrid } from "./types/Grid";
import { getRandomInt } from "./utils/generalUtils";

function App() {
  const [mazeSize, setMazeSize] = useState({
    size: 5,
    scale: "Small",
    mazeSize: MazeSize.Small,
  });
  const [currMaze, setCurrMaze] = useState(new Maze(createRectGrid(5, 5)));

  function handleSizeChange(e: ChangeEvent<HTMLInputElement>) {
    e.preventDefault();

    if (Number(e.target.value) <= 0) return;

    setMazeSize((s) => ({
      ...s,
      [e.target.name]: e.target.value,
    }));
  }

  function strToSize(s: string): MazeSize {
    switch (s) {
      case "XS":
        return MazeSize.XS;
      case "Small":
        return MazeSize.Small;
      case "Medium":
        return MazeSize.Medium;
      case "Large":
        return MazeSize.Large;
      case "XL":
        return MazeSize.XL;
      default:
        return MazeSize.Medium;
    }
  }

  function handleUpdateMazeSize(e: ChangeEvent<HTMLSelectElement>) {
    setMazeSize((s) => ({ ...s, mazeSize: strToSize(e.target.value) }));
  }

  function generateMaze() {
    const grid = generateDFSRectGrid(
      mazeSize.size * 2 - 1,
      mazeSize.size * 2 - 1,
    );

    const border = {
      finishColumn: getRandomInt(1, mazeSize.size) * 2 - 1,
      startColumn: getRandomInt(1, mazeSize.size) * 2 - 1,
    };
    const maze = new Maze(grid, border);
    setCurrMaze(maze);
  }

  return (
    <>
      <div>
        <div className="flex flex-row">
          <p className="text-3xl">Size:</p>
          <input
            type="number"
            name="size"
            className="border-2 text-3xl"
            value={mazeSize.size}
            onChange={handleSizeChange}
          />
          <select
            id="mazeSizes"
            name="mazeSize"
            size={6}
            onChange={handleUpdateMazeSize}
          >
            <option value="XS">XS</option>
            <option value="Small">Small</option>
            <option value="Medium">Medium</option>
            <option value="Large">Large</option>
            <option value="XL">XL</option>
          </select>
        </div>
        <br />
        <button onClick={generateMaze} className="bg-gray-500 text-3xl">
          Generate maze
        </button>

        <MazeRenderer maze={currMaze} size={mazeSize.mazeSize} />
      </div>
    </>
  );
}

export default App;
