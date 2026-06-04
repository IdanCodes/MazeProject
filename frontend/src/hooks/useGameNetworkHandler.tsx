import {
  equalVec,
  isVector2,
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
} from "@src/constants/GameMsgType";
import { CellType, Grid } from "@src/types/Grid";
import { Maze } from "@src/types/Maze";
import useAnimationUpdate from "@src/hooks/useAnimationUpdate";
import { useGameSocket } from "@src/hooks/useGameSocket";
import {
  isPlayerInfo,
  parsePlayerInfo,
  PlayerInfo,
} from "@src/interfaces/PlayerInfo";
import { PlayerRole } from "@src/constants/PlayerRole";
import { GameOptions, parseGameOptions } from "@src/interfaces/GameOptions";
import { NetworkMessage } from "@src/interfaces/NetworkMessage";
import { useNetworkContext } from "@src/contexts/NetworkContext";
import { isGameResult } from "@src/types/GameResult";

export function useGameNetworkHandler(
  localPlayer: PlayerInfo,
  callerId: string,
  canvasSize: { width: number; height: number },
  setMaze: (maze: Maze) => void,
  setFinishCell: (cell: Vector2) => void,
  setPlayerRole: (action: SetStateAction<PlayerRole>) => void,
  setGameOptions: (newOptions: GameOptions) => void,
  onStartGame: (startTime: number) => void,
  onFinishMaze: (username: string, place: number, timeMs: number) => void,
  onEndGame: (gameResults: { username: string; timeMs: number }[]) => void,
  onRestartGame: () => void,
  posUpdateRate: number = 25,
): {
  otherPlayers: PlayerInfo[];
} {
  const subscribedToCallbacks = useRef<boolean>(false);
  const { onMessage, sendMessage } = useNetworkContext();
  const localPlayerPos = useMemo(
    () => localPlayer.position,
    [localPlayer.position],
  );
  const lastSentPos = useRef<Vector2>(ZERO_VEC);
  const [otherPlayers, setOtherPlayers] = useState<PlayerInfo[]>([]);
  const playerIndexByName = useCallback(
    (name: string) => otherPlayers.findIndex((p) => p.username == name),
    [otherPlayers],
  );

  // #region Server Message Handlers

  const updatePlayerPos = (posList: [string, Vector2][]) => {
    setOtherPlayers((op) => {
      const newOp = [...op];
      for (const [src, pos] of posList) {
        const index = newOp.findIndex((p) => p.username === src);
        if (index >= 0) newOp[index].position = pos;
        else
          console.error(
            `Received position update for player that doesn't exist (${src}). Ignoring`,
          );
      }
      return newOp;
    });
  };

  useEffect(() => {
    if (subscribedToCallbacks.current) return;
    subscribedToCallbacks.current = true;

    console.log("Subscribing...");
    onMessage(callerId, GameMsgType.MAZE, (msg) => {
      console.log("MAZE", msg);
      const matrix = msg.data as CellType[][];
      const grid = new Grid(matrix);
      const maze = new Maze(grid);
      setMaze(maze);
    });

    onMessage(callerId, GameMsgType.UPDATE_POS, (msg) => {
      const data = msg.data;
      if (!data || typeof data !== "object") return;

      const posList: [string, Vector2][] = [];
      Object.entries(data).forEach(([name, rawPos]) => {
        if (name === localPlayer.username) return;

        const newPos = parseVector2(rawPos);
        if (!newPos) return;

        const index = playerIndexByName(name);
        if (index >= 0 && equalVec(otherPlayers[index].position, newPos))
          return;
        posList.push([name, newPos]);
      });

      if (posList) updatePlayerPos(posList);
    });

    onMessage(callerId, GameMsgType.PLAYER_CONNECTED, (msg) => {
      const newPlayer = parsePlayerInfo(msg.data);
      if (!newPlayer) return;
      
      setOtherPlayers((op) => {
        // const newVal = [...op, newPlayer];
        // if (index < 0) setOtherPlayers((op) => [...op, newPlayer]);
        const index = otherPlayers.findIndex(
          (p) => p.username === newPlayer.username,
        );
        return index < 0 ? [...op, newPlayer] : op;
      });
    });

    onMessage(callerId, GameMsgType.PLAYER_DISCONNECTED, (msg) => {
      setOtherPlayers((op) => {
        const newOp = [...op];
        const index = newOp.findIndex((p) => p.username === msg.source);
        if (index >= 0) newOp.splice(index, 1);
        return newOp;
      });
    });

    onMessage(callerId, GameMsgType.SET_READY, (msg) => {
      if (typeof msg.data != "boolean") return;
      setOtherPlayers((op) => {
        const newOp = [...op];
        const index = newOp.findIndex((p) => p.username === msg.source);
        if (index >= 0) newOp[index].isReady = msg.data;
        return newOp;
      });
    });

    onMessage(callerId, GameMsgType.START_GAME, (msg) => {
      const data = msg.data;
      if (
        !data ||
        typeof data !== "object" ||
        !data.maze ||
        !(data.finishCell && isVector2(data.finishCell)) ||
        !data.startTime
      ) {
        console.error(
          "useNetworkHandler: Invalid format for startGame message",
        );
        return;
      }
      // update maze
      const matrix = data.maze as CellType[][];
      const grid = new Grid(matrix);
      const maze = new Maze(grid);
      setMaze(maze);

      // update finish cell
      const finishCell = parseVector2(data.finishCell)!;
      setFinishCell(finishCell);

      // set other players to be not ready
      setOtherPlayers((op) => {
        const newOp = [...op];
        for (let i = 0; i < op.length; i++) newOp[i].isReady = false;
        return newOp;
      });

      // Trigger game start
      onStartGame(data.startTime);
    });

    onMessage(callerId, GameMsgType.PLAYER_FINISHED, (msg) => {
      const data = msg.data;
      if (
        !(data && typeof data === "object") ||
        !(data.username && typeof data.username === "string") ||
        !(data.timeMs && typeof data.timeMs === "number") ||
        !(data.place && typeof data.place === "number")
      ) {
        console.error(
          "useNetworkHandler: Invalid format for playerFinished message",
        );
        return;
      }
      const {
        username,
        timeMs,
        place,
      }: { username: string; timeMs: number; place: number } = msg.data;

      console.log(
        `Player "${username}" finished in place ${place} in ${timeMs / 10 / 100.0}s`,
      );

      onFinishMaze(username, place, timeMs);
    });

    onMessage(callerId, GameMsgType.END_GAME, (msg) => {
      const data: { username: string; timeMs: number }[] = msg.data;
      if (!(data && Array.isArray(data)) || data.find((x) => !isGameResult(x)))
        return console.error(
          "useNetworkHandler: Invalid format for endGame message",
          msg,
        );

      onEndGame(data);
    });

    onMessage(callerId, GameMsgType.ROOM_ADMIN, (msg) => {
      const newAdminName = msg.data;
      if (!newAdminName || typeof newAdminName != "string") {
        console.error(
          "useNetworkHandler: Invalid argument for room admin! data:",
          newAdminName,
        );
        return;
      }

      if (newAdminName == localPlayer.username) {
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
        for (let i = 0; i < newOp.length; i++)
          newOp[i].role = PlayerRole.PLAYER;
        newOp[newAdminIdx].role = PlayerRole.ADMIN;
        return newOp;
      });
      setPlayerRole(PlayerRole.PLAYER);
    });

    onMessage(callerId, GameMsgType.GAME_OPTIONS, (msg) => {
      const newOptions = parseGameOptions(msg.data);
      if (!newOptions)
        return console.error(
          "useNetworkHandler: Received invalid game options",
          msg,
        );
      setGameOptions(newOptions);
    });

    onMessage(callerId, GameMsgType.RESTART_GAME, (_) => onRestartGame());
  }, []);

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
  };
}
