import React, { useState } from "react";
import useAnimationUpdate from "../hooks/useAnimationUpdate";
import { GridPos } from "@shared/types/Grid";

function GameManager({ fps = 30 }: { fps?: number }) {
  const [playerPos, setPlayerPos] = useState<GridPos>();
  useAnimationUpdate(fps, () => {});

  return <div></div>;
}

export default GameManager;
