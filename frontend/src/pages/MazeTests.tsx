import React, { ChangeEvent, useState } from "react";
import { MazeSize } from "../types/maze-size";
import GameManager from "../components/GameManager";

function MazeTests() {
  const [mazeSize, setMazeSize] = useState({
    size: 5,
    scale: "Small",
    mazeSize: MazeSize.Small,
  });
  const [genFlag, setGenFlag] = useState<boolean>(true);

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

  return (
    <>
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
      <button onClick={() => setGenFlag(true)} className="bg-gray-500 text-3xl">
        Generate maze
      </button>

      <GameManager
        mazeSize={mazeSize.mazeSize}
        mazeScale={mazeSize.size}
        genFlag={{ flag: genFlag, setFlag: setGenFlag }}
      />
    </>
  );
}

export default MazeTests;
