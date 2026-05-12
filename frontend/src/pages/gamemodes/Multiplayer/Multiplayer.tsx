import PrimaryButton from "@src/components/buttons/PrimaryButton";
import { ErrorLabel } from "@src/components/ErrorLabel";
import GameInstance, { GameInstanceHandle } from "@src/components/GameInstance";
import PageTitle from "@src/components/PageTitle";
import { GameMsgType, ResponseCode } from "@src/constants/game-msg-type";
import { useGameNetworkHandler } from "@src/hooks/useNetworkHandler";
import { usePassedState } from "@src/hooks/usePassedState";
import {
  roomIsFull,
  GameRoomInfo,
  isRoomInfo,
} from "@src/interfaces/GameRoomInfo";
import { PlayerInfo } from "@src/interfaces/PlayerInfo";
import { equalVec, Vector2, ZERO_VEC } from "@src/interfaces/Vector2";
import { Maze } from "@src/types/Maze";
import { MazeSize } from "@src/types/maze-size";
import { PassedState, SetStateFunc } from "@src/types/passed-state";
import clsx from "clsx";
import { JSX, useEffect, useMemo, useRef, useState } from "react";
import { PlayerRole } from "@src/constants/PlayerRole";
import { GameOptions, MazeDifficulty } from "@src/interfaces/GameOptions";
import { useNetworkContext } from "@src/contexts/NetworkContext";
import { RedirectButton } from "@src/components/buttons/RedirectButton";
import { RoutePath } from "@src/constants/route-path";
import GameView from "./GameView";
import RoomsView from "./RoomsView";

export default function Multiplayer({
  playerName,
}: {
  playerName: string;
}): JSX.Element {
  const [currentRoom, setCurrentRoom] = useState<GameRoomInfo | undefined>(
    undefined,
  ); // undefined -> in lobby

  const { onMessage, onResponse, disconnect, isConnected, sendMessage } =
    useNetworkContext();

  useEffect(() => {
    const callerId = "Multiplayer.useEffect";
    onMessage(callerId, GameMsgType.JOIN_ROOM, (msg) => {
      const data = msg.data;
      if (!data || !isRoomInfo(data))
        return console.error(
          "Join room failed! No room info provided.\nMsg:",
          msg,
        );
      setCurrentRoom(data);
    });
  }, []);

  function leaveRoom() {
    sendMessage(GameMsgType.LEAVE_ROOM);
    setCurrentRoom(undefined);
  }

  return (
    <>
      <PageTitle text="Multiplayer" />
      {isConnected && !currentRoom && (
        <>
          <p className="text-3xl">Name: {playerName}</p>
          <RoomsView callerId={"Multiplayer.RoomsView"} />
        </>
      )}
      {isConnected && currentRoom && (
        <GameView
          callerId={"Multiplayer.GameView"}
          playerName={playerName}
          leaveRoom={leaveRoom}
        />
      )}
    </>
  );
}
