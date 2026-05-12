import PageTitle from "@src/components/PageTitle";
import { GameMsgType } from "@src/constants/game-msg-type";
import { GameRoomInfo, isRoomInfo } from "@src/interfaces/GameRoomInfo";
import { JSX, useEffect, useState } from "react";
import { useNetworkContext } from "@src/contexts/NetworkContext";
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

  const { onMessage, sendMessage } = useNetworkContext();

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
      {!currentRoom ? (
        <>
          <p className="text-3xl">Name: {playerName}</p>
          <RoomsView callerId={"Multiplayer.RoomsView"} />
        </>
      ) : (
        <GameView
          callerId={"Multiplayer.GameView"}
          playerName={playerName}
          leaveRoom={leaveRoom}
        />
      )}
    </>
  );
}
