import {
  equalVec,
  parseVector2,
  Vector2,
  ZERO_VEC,
} from "@src/interfaces/Vector2";
import {
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  GameMsgType,
  ResponseCode as ResponseCode,
} from "@src/constants/game-msg-type";
import { CellType, Grid } from "@src/types/Grid";
import { Maze } from "@src/types/Maze";
import useAnimationUpdate from "@src/hooks/useAnimationUpdate";
import { useMazePlayerSocket } from "@src/hooks/useMazePlayerSocket";
import {
  isPlayerInfo,
  parsePlayerInfo,
  PlayerInfo,
} from "@src/interfaces/PlayerInfo";
import { PlayerRole } from "@src/constants/PlayerRole";

// const SERVER_PORT = 8080;
// const SERVER_IP = "127.0.0.1";
// export const SERVER_WS_URL: string = `ws://${SERVER_IP}:${SERVER_PORT}`;

export interface NetworkMessage {
  msgType: GameMsgType;
  source: string;
  data: any | undefined;
}

export interface ServerResponse {
  code: ResponseCode;
  responseTo: GameMsgType;
  data: any | undefined;
}

export function useNetworkHandler(
  localPlayer: PlayerInfo,
  canvasSize: { width: number; height: number },
  setMaze: (maze: Maze) => void,
  setPlayerRole: (action: SetStateAction<PlayerRole>) => void,
  sendMessage: (msgType: GameMsgType, data?: any | undefined) => void,
  onStartGame: (startTime: number) => void,
  onFinishMaze: (place: number, timeMs: number) => void, // local player reaches end of maze
  onEndGame: (gameResults: { name: string; timeMs: number }[]) => void,
  posUpdateRate: number = 25,
): {
  otherPlayers: PlayerInfo[];
  onMessage: (msg: NetworkMessage) => void;
} {
  const localPlayerPos = useMemo(
    () => localPlayer.position,
    [localPlayer.position],
  );
  const lastSentPos = useRef<Vector2>(ZERO_VEC);
  const [otherPlayers, setOtherPlayers] = useState<PlayerInfo[]>([]);
  const playerIndexByName = useCallback(
    (name: string) => otherPlayers.findIndex((p) => p.name == name),
    [otherPlayers],
  );

  // #region Server Message Handlers
  function handleServerMessage(msg: NetworkMessage) {
    switch (msg.msgType) {
      case GameMsgType.MAZE:
        return handleMessageMaze(msg);
      case GameMsgType.UPDATE_POS:
        return handleMessageUpdatePos(msg);
      case GameMsgType.PLAYER_CONNECTED:
        return handlePlayerConnected(msg);
      case GameMsgType.PLAYER_DISCONNECTED:
        return handlePlayerDisconnected(msg);
      case GameMsgType.SET_READY:
        return handleReadyUpdate(msg);
      case GameMsgType.START_GAME:
        return handleStartGame(msg);
      case GameMsgType.PLAYER_FINISHED:
        return handlePlayerFinished(msg);
      case GameMsgType.END_GAME:
        return handleEndGame(msg);
      case GameMsgType.ROOM_ADMIN:
        return handleSetRoomAdmin(msg);
      default:
        break;
    }
  }

  function handleMessageMaze(msg: NetworkMessage) {
    const matrix = msg.data as CellType[][];
    const grid = new Grid(matrix);
    const maze = new Maze(grid);
    setMaze(maze);
  }

  const updatePlayerPos = (posList: [string, Vector2][]) => {
    setOtherPlayers((op) => {
      const newOp = [...op];
      for (const [src, pos] of posList) {
        const index = newOp.findIndex((p) => p.name === src);
        if (index >= 0) newOp[index].position = pos;
        // else // TODO: Should this exist? Adding a player without getting a message they're connected...
        //   newOp.push({
        //     name: src,
        //     position: pos,
        //     isReady: false,
        //     role: PlayerRole.PLAYER,
        //   });
      }
      return newOp;
    });
  };

  function handleMessageUpdatePos(msg: NetworkMessage) {
    const data = msg.data;
    if (!data || typeof data !== "object") return;

    const posList: [string, Vector2][] = [];
    Object.entries(data).forEach(([name, rawPos]) => {
      if (name === localPlayer.name) return;

      // const normalized = parseVector2(rawPos);
      // if (!normalized) return;

      // const newPos: Vector2 = {
      //   x: normalized.x * canvasSize.width,
      //   y: normalized.y * canvasSize.height,
      // };

      const newPos = parseVector2(rawPos);
      if (!newPos) return;

      const index = playerIndexByName(name);
      if (index >= 0 && equalVec(otherPlayers[index].position, newPos)) return;
      posList.push([name, newPos]);
    });

    if (posList) updatePlayerPos(posList);
  }

  function handlePlayerConnected(msg: NetworkMessage) {
    const newPlayer = parsePlayerInfo(msg.data);
    if (!newPlayer) return;
    const index = otherPlayers.findIndex((p) => p.name === newPlayer.name);
    if (index < 0) setOtherPlayers((op) => [...op, newPlayer]);
  }

  function handlePlayerDisconnected(msg: NetworkMessage) {
    setOtherPlayers((op) => {
      const newOp = [...op];
      const index = newOp.findIndex((p) => p.name === msg.source);
      if (index >= 0) newOp.splice(index, 1);
      return newOp;
    });
  }

  function handleReadyUpdate(msg: NetworkMessage) {
    if (typeof msg.data != "boolean") return;
    setOtherPlayers((op) => {
      const newOp = [...op];
      const index = newOp.findIndex((p) => p.name === msg.source);
      if (index >= 0) newOp[index].isReady = msg.data;
      return newOp;
    });
  }

  function handleStartGame(msg: NetworkMessage) {
    const data = msg.data;
    if (!data || typeof data !== "object" || !data.maze || !data.startTime) {
      console.error("useNetworkHandler: Invalid format for startGame message");
      return;
    }
    console.log("Received start game...");
    // update maze
    const matrix = data.maze as CellType[][];
    const grid = new Grid(matrix);
    const maze = new Maze(grid);
    setMaze(maze);
    console.log("Finished setting maze.");

    // Trigger game start
    onStartGame(data.startTime);
  }

  function handlePlayerFinished(msg: NetworkMessage) {
    const data = msg.data;
    if (
      !(data && typeof data === "object") ||
      !(data.name && typeof data.name === "string") ||
      !(data.timeMs && typeof data.timeMs === "number") ||
      !(data.place && typeof data.place === "number")
    ) {
      console.error(
        "useNetworkHandler: Invalid format for playerFinished message",
      );
      return;
    }
    const {
      name,
      timeMs,
      place,
    }: { name: string; timeMs: number; place: number } = msg.data;

    console.log(
      `Player "${name}" finished in place ${place} in ${timeMs / 10 / 100.0}s`,
    );
    // TODO: handle other players finishing
    if (name != localPlayer.name) return;

    onFinishMaze(place, timeMs);
  }

  function handleEndGame(msg: NetworkMessage) {
    const data: { name: string; timeMs: number }[] = msg.data;
    if (!(data && Array.isArray(data))) {
      console.error(
        "useNetworkHandler: Invalid format for endGame message",
        msg,
      );
      return;
    }
    for (const x of data) {
      if (
        !(x && typeof x === "object") ||
        !(x.name && typeof x.name === "string") ||
        !(x.timeMs && typeof x.timeMs === "number")
      ) {
        console.error(
          "useNetworkHandler: Invalid format for endGame message",
          msg,
        );
        return;
      }

      onEndGame(data);
    }
  }

  function handleSetRoomAdmin(msg: NetworkMessage) {
    const newAdminName = msg.data;
    if (!newAdminName || typeof newAdminName != "string") {
      console.error(
        "useNetworkHandler: Invalid argument for room admin! data:",
        newAdminName,
      );
      return;
    }

    if (newAdminName == localPlayer.name) {
      setOtherPlayers((op) => {
        const newOp = [...op];
        for (let i = 0; i < newOp.length; i++)
          newOp[i].role = PlayerRole.PLAYER;
        return newOp;
      });
      setPlayerRole(PlayerRole.ADMIN);
      return;
    }

    const newAdminIdx = playerIndexByName(newAdminName);
    if (newAdminIdx < 0)
      return console.error(
        "useNetworkHandler: New admin doesn't exist in room. data:",
        newAdminName,
      );

    setOtherPlayers((op) => {
      const newOp = [...op];
      for (let i = 0; i < newOp.length; i++) newOp[i].role = PlayerRole.PLAYER;
      newOp[newAdminIdx].role = PlayerRole.ADMIN;
      return newOp;
    });
    setPlayerRole(PlayerRole.PLAYER);
  }
  // #endregion

  function sendPos() {
    const posToSend = {
      x: localPlayerPos.x / canvasSize.width,
      y: localPlayerPos.y / canvasSize.height,
    } as Vector2;
    sendMessage(GameMsgType.UPDATE_POS, posToSend);
    lastSentPos.current = localPlayerPos;
  }

  function sendReady() {
    sendMessage(GameMsgType.SET_READY, localPlayer.isReady);
  }
  useEffect(sendReady, [localPlayer.isReady]);

  useAnimationUpdate(posUpdateRate, () => {
    if (!equalVec(localPlayerPos, lastSentPos.current)) {
      sendPos();
    }
  });

  return {
    otherPlayers,
    onMessage: handleServerMessage,
  };
}
