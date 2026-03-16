import PrimaryButton from "@src/components/buttons/PrimaryButton";
import { ErrorLabel } from "@src/components/ErrorLabel";
import GameInstance, { GameInstanceHandle } from "@src/components/GameInstance";
import PageTitle from "@src/components/PageTitle";
import { GameMsgType, ResponseCode } from "@src/constants/game-msg-type";
import { useMazePlayerSocket } from "@src/hooks/useMazePlayerSocket";
import {
  NetworkMessage,
  SERVER_WS_URL,
  ServerResponse,
  useNetworkHandler,
} from "@src/hooks/useNetworkHandler";
import { usePassedState } from "@src/hooks/usePassedState";
import {
  gameIsFull as roomIsFull,
  GameRoomInfo,
  isRoomInfo,
} from "@src/interfaces/GameRoomInfo";
import {
  isPlayerInfo,
  parsePlayerInfo,
  PlayerInfo,
} from "@src/interfaces/PlayerInfo";
import { Vector2, ZERO_VEC } from "@src/interfaces/Vector2";
import { Maze } from "@src/types/Maze";
import { MazeSize } from "@src/types/maze-size";
import { PassedState, SetStateFunc } from "@src/types/passed-state";
import { getUsernameError, maxNameLen } from "@src/utils/game-protocol";
import { JSX, useEffect, useMemo, useRef, useState } from "react";

export default function Multiplayer(): JSX.Element {
  //   const [localPlayer, setLocalPlayer] = useState<PlayerInfo>({
  //     name: "",
  //     position: ZERO_VEC,
  //     isReady: false,
  //   } as PlayerInfo);
  //   // #region Player Attributes
  //   const playerName = useMemo(() => localPlayer.name, [localPlayer.name]);
  //   const setPlayerName = (action: React.SetStateAction<string>) => {
  //     const newVal =
  //       typeof action == "function" ? action(localPlayer.name) : action;
  //     setLocalPlayer((lp) => ({ ...lp, name: newVal }));
  //   };
  //   const isReady = useMemo(() => localPlayer.isReady, [localPlayer.isReady]);
  //   const setIsReady: SetStateFunc<boolean> = (
  //     action: React.SetStateAction<boolean>,
  //   ) => {
  //     const newVal =
  //       typeof action == "function" ? action(localPlayer.isReady) : action;
  //     setLocalPlayer((lp) => ({ ...lp, isReady: newVal }));
  //   };
  //   const playerPos = useMemo(() => localPlayer.position, [localPlayer.position]);
  //   const setPlayerPos = (action: React.SetStateAction<Vector2>) => {
  //     const newVal =
  //       typeof action == "function" ? action(localPlayer.position) : action;
  //     setLocalPlayer((lp) => ({ ...lp, position: newVal }));
  //   };
  //   // #endregion
  //   const [maze, setMaze] = useState<Maze | undefined>(undefined);
  //   const [errorText, setErrorText] = useState<string>("");
  //   const gameInstanceRef = useRef<GameInstanceHandle | null>(null);

  //   const canvasDimensions = useMemo<{
  //     width: number;
  //     height: number;
  //   }>(() => {
  //     return gameInstanceRef.current && gameInstanceRef.current.gameCanvasRef
  //       ? {
  //           ...gameInstanceRef.current.gameCanvasRef.dimensions,
  //         }
  //       : { width: 1, height: 1 };
  //   }, [gameInstanceRef.current]);

  //   const handleNetworkError = (e: WebSocketEventMap["error"]) => {
  //     console.error("Network error:", e);
  //     setErrorText(`A network error occurred. Please refresh the page`);
  //     setPlayerName("");
  //   };

  const gameOnMessageCb = useRef<{ cb: (msg: NetworkMessage) => void }>({
    cb: () => {},
  });
  const [playerName, setPlayerName] = useState<string>("");
  const [roomsList, setRoomsList] = useState<GameRoomInfo[]>([]);
  const [createRoomError, setCreateRoomError] = useState<string>("");
  const [currentRoom, setCurrentRoom] = useState<GameRoomInfo | undefined>(
    undefined,
  ); // undefined -> in lobby

  const handleOnClose = (e: WebSocketEventMap["close"]) => {
    console.log("Disconnected from server.");
  };

  const handleMessage = (msg: NetworkMessage) => {
    gameOnMessageCb.current.cb(msg);
    switch (msg.msgType) {
      case GameMsgType.JOIN_ROOM: {
        const data = msg.data;
        if (!data || !isRoomInfo(data)) {
          console.error("Join room failed! No room info provided.\nMsg:", msg);
          return;
        }
        setCurrentRoom(data);
        return;
      }
    }
  };

  const handleResponse = (res: ServerResponse) => {
    switch (res.responseTo) {
      case GameMsgType.ROOMS_LIST: {
        if (res.code != ResponseCode.SUCCESS) {
          console.error("Encountered error when retrieving rooms list");
          return;
        }
        setRoomsList(res.data);
        return;
      }

      case GameMsgType.CREATE_ROOM: {
        if (res.code != ResponseCode.SUCCESS) {
          console.error("Encountered an error when creating a room", res.data);
          setCreateRoomError(res.data.error);
          return;
        }
        console.log("Room created successfuly!");
        return;
      }

      case GameMsgType.JOIN_ROOM: {
        if (res.code == ResponseCode.SUCCESS) {
          console.log("Successfuly joined room");
          return;
        }

        console.error("Could not join room");
        return;
      }
    }
  };

  const { sendMessage, connect, disconnect, isConnected } = useMazePlayerSocket(
    SERVER_WS_URL,
    {
      onConnect: () => {
        console.log("Connection is open!");
      },
      onMessage: (msg: NetworkMessage) => handleMessage(msg),
      onResponse: (res: ServerResponse) => handleResponse(res),
      onDisconnect: (e: CloseEvent) => handleOnClose(e),
    },
  );

  function refreshRoomsList() {
    setRoomsList([]);
    sendMessage(GameMsgType.ROOMS_LIST);
  }

  function leaveRoom() {
    sendMessage(GameMsgType.LEAVE_ROOM);
    setCurrentRoom(undefined);
  }

  return (
    <>
      <PageTitle text="Multiplayer" />
      {!isConnected && (
        <>
          <NameInput
            nameState={[playerName, setPlayerName]}
            disabled={isConnected}
          />
          <ErrorLabel text={getUsernameError(playerName) ?? ""} />
          <ConnectButton
            handleConnect={() => {
              setPlayerName(playerName.trim());
              connect(playerName.trim());
            }}
            disabled={getUsernameError(playerName) !== null || isConnected}
          />
        </>
      )}
      {isConnected &&
        !currentRoom && ( // TODO: move to Lobby component
          <>
            <p className="text-3xl">Name: {playerName}</p>
            <DisconnectButton
              handleDisconnect={() => {
                disconnect();
              }}
            />
            <RoomsPanel
              handleCreateRoom={(name, capacity, password) => {
                setCreateRoomError("");
                sendMessage(GameMsgType.CREATE_ROOM, {
                  name,
                  capacity,
                  password,
                });
                refreshRoomsList();
              }}
              handleJoinRoom={(room_id: string, room_password: string) => {
                sendMessage(GameMsgType.JOIN_ROOM, {
                  id: room_id,
                  password: room_password,
                });
              }}
              refreshList={refreshRoomsList}
              roomsList={roomsList}
              createRoomError={createRoomError}
            />
          </>
        )}
      {isConnected && currentRoom && (
        <GamePanel
          playerName={playerName}
          leaveRoom={leaveRoom}
          sendMessage={sendMessage}
          onMessageCb={gameOnMessageCb.current}
        />
      )}
    </>
  );
}

function ConnectButton({
  handleConnect,
  disabled,
}: {
  handleConnect: React.MouseEventHandler;
  disabled: boolean;
}) {
  return (
    <PrimaryButton
      disabled={disabled}
      className="bg-green-500 hover:bg-green-600 text-2xl p-3 rounded-2xl"
      onClick={handleConnect}
    >
      Connect
    </PrimaryButton>
  );
}

function DisconnectButton({
  handleDisconnect,
}: {
  handleDisconnect: () => void;
}) {
  return (
    <PrimaryButton
      className="bg-red-500 hover:bg-red-600 text-2xl p-3 rounded-2xl"
      onClick={handleDisconnect}
    >
      Disconnect
    </PrimaryButton>
  );
}

function NameInput({
  nameState,
  disabled,
}: {
  nameState: PassedState<string>;
  disabled: boolean;
}) {
  const [name, setName] = usePassedState(nameState);

  return (
    <>
      <input
        type="text"
        className="bg-white text-2xl rounded-md p-2"
        disabled={disabled}
        placeholder="Name"
        maxLength={maxNameLen}
        value={name}
        onChange={(e) => {
          e.preventDefault();
          setName(e.target.value);
        }}
      />
    </>
  );
}

function RoomsPanel({
  refreshList,
  handleCreateRoom,
  handleJoinRoom,
  roomsList,
  refreshTimeoutMS = 500,
  createRoomError = "",
}: {
  refreshList: () => void;
  handleCreateRoom: (name: string, capacity: number, password: string) => void;
  handleJoinRoom: (room_id: string, room_password: string) => void;
  roomsList: GameRoomInfo[];
  refreshTimeoutMS?: number;
  createRoomError?: string;
}): JSX.Element {
  const [disabledRefresh, setDisabledRefresh] = useState<boolean>(false);
  function handleRefresh() {
    setDisabledRefresh(true);
    refreshList();

    setTimeout(() => setDisabledRefresh(false), refreshTimeoutMS);
  }

  useEffect(() => {
    if (roomsList.length > 0) setDisabledRefresh(false);
  }, [roomsList]);

  const roomCountStr = useMemo<string>(() => {
    if (roomsList.length == 0) return "There are no rooms open";
    if (roomsList.length == 1) return "There is 1 room open";
    return `There are ${roomsList.length} rooms open`;
  }, [roomsList]);
  return (
    <div>
      <CreateRoomPanel
        handleCreateRoom={handleCreateRoom}
        error={createRoomError}
      />
      <div className="w-7/10 mx-auto">
        <RefreshRoomListBtn
          handleRefresh={handleRefresh}
          disabled={disabledRefresh}
        />
        <p className="text-2xl">{roomCountStr}</p>
        <RoomList rooms={roomsList} handleJoinRoom={handleJoinRoom} />
      </div>
    </div>
  );
}

function RefreshRoomListBtn({
  handleRefresh,
  disabled,
}: {
  handleRefresh: () => void;
  disabled: boolean;
}): JSX.Element {
  useEffect(() => {
    handleRefresh();
  }, []);

  return (
    <PrimaryButton
      className="text-2xl p-3 rounded-2xl"
      onClick={handleRefresh}
      disabled={disabled}
    >
      Refresh List
    </PrimaryButton>
  );
}

function CreateRoomPanel({
  handleCreateRoom,
  error,
}: {
  handleCreateRoom: (name: string, capacity: number, password: string) => void;
  error: string;
}): JSX.Element {
  const [name, setName] = useState<string>("New Room");
  const [capacity, setCapacity] = useState<number>(2);
  const [password, setPassword] = useState<string>("");
  const btnDisabled = useMemo(
    () =>
      name.length <= 2 ||
      name.length > 20 ||
      capacity <= 1 ||
      capacity > 10 ||
      password.length > 16,
    [name, capacity, password],
  );

  const handleClick = () => {
    setName("");
    setCapacity(2);
    setPassword("");
    handleCreateRoom(name, capacity, password);
  };

  return (
    <div className="w-full flex flex-col">
      <div className="flex flex-row w-3/5 justify-between mx-auto">
        <div>
          <p className="text-3xl">Room Name: </p>
          <input
            type="text"
            placeholder="Room Name"
            className="bg-white w-50 py-1 rounded-md"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <p className="text-3xl">Capacity: </p>
          <input
            type="number"
            placeholder="1"
            className="bg-white w-50 rounded-md"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value as unknown as number)}
          />
        </div>
        <div>
          <p className="text-3xl">Password (Optional): </p>
          <input
            type="text"
            placeholder=""
            className="bg-white w-50 rounded-md text-xl"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>
      <PrimaryButton
        className="bg-green-500 hover:bg-green-600 text-2xl w-50 mx-auto"
        onClick={handleClick}
        disabled={btnDisabled}
      >
        Create Room
      </PrimaryButton>
      <div className="mx-auto">
        <ErrorLabel text={error} />
      </div>
    </div>
  );
}

function RoomList({
  rooms,
  handleJoinRoom,
}: {
  rooms: GameRoomInfo[];
  handleJoinRoom: (room_id: string, room_password: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {rooms.map((roomInfo) => (
        <RoomDisplay
          key={roomInfo.id}
          room={roomInfo}
          joinRoom={(room_password: string) => {
            handleJoinRoom(roomInfo.id, room_password);
          }}
        />
      ))}
    </div>
  );

  function RoomDisplay({
    room,
    joinRoom,
  }: {
    room: GameRoomInfo;
    joinRoom: (room_password: string) => void;
  }) {
    const [password, setPassword] = useState<string>("");
    const hasPasswordStr = useMemo(
      () => (room.hasPassword ? "Has Password" : "No Password"),
      [room],
    );
    return (
      <div className="bg-gray-300 border-black border-4 rounded-2xl flex-row flex px-5 justify-between gap-5">
        <div className="flex flex-col w-1/2">
          <p className="font-semibold text-4xl">{room.name}</p>
          <div className="flex flex-row justify-between">
            <p className="text-xl">
              Active: {room.playerCount}/{room.capacity}
            </p>
          </div>
        </div>
        <div className="flex flex-row justify-between w-full">
          {room.hasPassword ? (
            <div className="flex flex-row my-1 gap-2">
              <p className="text-2xl my-auto">Password:</p>
              <input
                type="text"
                className="bg-white text-2xl w-50 h-10 my-auto rounded-md"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          ) : (
            <p className="text-2xl my-auto">No Password</p>
          )}
          <PrimaryButton
            className="text-5xl"
            disabled={roomIsFull(room)}
            onClick={() => {
              joinRoom(password);
            }}
          >
            Join
          </PrimaryButton>
        </div>
      </div>
    );

    function RoomPassword() {}
  }
}

function GamePanel({
  playerName,
  onMessageCb,
  sendMessage,
  leaveRoom,
}: {
  playerName: string;
  onMessageCb: { cb: (msg: NetworkMessage) => void };
  sendMessage: (msgType: GameMsgType, data?: any | undefined) => void;
  leaveRoom: () => void;
}): JSX.Element {
  const [localPlayer, setLocalPlayer] = useState<PlayerInfo>({
    name: playerName,
    position: ZERO_VEC,
    isReady: false,
  } as PlayerInfo);
  // #region Player Attributes
  const isReady = useMemo(() => localPlayer.isReady, [localPlayer.isReady]);
  const setIsReady: SetStateFunc<boolean> = (
    action: React.SetStateAction<boolean>,
  ) => {
    const newVal =
      typeof action == "function" ? action(localPlayer.isReady) : action;
    setLocalPlayer((lp) => ({ ...lp, isReady: newVal }));
  };
  const playerPos = useMemo(() => localPlayer.position, [localPlayer.position]);
  const setPlayerPos = (action: React.SetStateAction<Vector2>) => {
    const newVal =
      typeof action == "function" ? action(localPlayer.position) : action;
    setLocalPlayer((lp) => ({ ...lp, position: newVal }));
  };
  // #endregion
  const [maze, setMaze] = useState<Maze | undefined>(undefined);
  const gameInstanceRef = useRef<GameInstanceHandle | null>(null);
  const canvasDimensions = useMemo<{
    width: number;
    height: number;
  }>(() => {
    return gameInstanceRef.current && gameInstanceRef.current.gameCanvasRef
      ? {
          ...gameInstanceRef.current.gameCanvasRef.dimensions,
        }
      : { width: 1, height: 1 };
  }, [gameInstanceRef.current]);

  // const handleNetworkError = (e: WebSocketEventMap["error"]) => {
  //   console.error("Network error:", e);
  //   setErrorText(`A network error occurred. Please refresh the page`);
  //   setPlayerName("");
  // };

  const { otherPlayers, onMessage } = useNetworkHandler(
    localPlayer,
    canvasDimensions,
    setMaze,
    sendMessage,
  );
  onMessageCb.cb = onMessage;

  return !maze ? (
    <>Waiting for maze...</>
  ) : (
    <div>
      <PrimaryButton className="bg-red-500" onClick={leaveRoom}>
        Leave Room
      </PrimaryButton>
      <GameInstance
        mazeSize={MazeSize.Medium}
        maze={maze}
        otherPlayers={otherPlayers}
        onPlayerMove={(pos: Vector2) => {
          setPlayerPos(pos);
        }}
      />
    </div>
  );
}
