import PrimaryButton from "@src/components/buttons/PrimaryButton";
import { GameInstanceHandle } from "@src/components/GameInstance";
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
import { GameRoomInfo } from "@src/interfaces/GameRoomInfo";
import { PlayerInfo } from "@src/interfaces/PlayerInfo";
import { Vector2, ZERO_VEC } from "@src/interfaces/Vector2";
import { Maze } from "@src/types/Maze";
import { PassedState, SetStateFunc } from "@src/types/passed-state";
import { getUsernameError } from "@src/utils/game-protocol";
import clsx from "clsx";
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

  const [playerName, setPlayerName] = useState<string>("");
  const [roomsList, setRoomsList] = useState<GameRoomInfo[]>([]);

  const handleOnClose = (e: WebSocketEventMap["close"]) => {
    console.log("Disconnected from server.");
  };

  const handleMessage = (msg: NetworkMessage) => {};

  const handleResponse = (res: ServerResponse) => {
    switch (res.responseTo) {
      case GameMsgType.ROOMS_LIST: {
        if (res.code != ResponseCode.SUCCESS) {
          console.error("Encountered error when retrieving rooms list");
          return;
        }
        console.log("Received rooms:", res.data);
        setRoomsList(res.data);
        return;
      }

      case GameMsgType.CREATE_ROOM: {
        if (res.code != ResponseCode.SUCCESS) {
          console.error("Encountered an error when creating a room", res.data);
          return;
        }
        console.log("Room created successfuly!");
        refreshRoomsList();
        return;
      }

      default:
        break;
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
    sendMessage(GameMsgType.ROOMS_LIST);
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
          <ConnectButton
            handleConnect={() => {
              setPlayerName(playerName.trim());
              connect(playerName.trim());
            }}
            disabled={getUsernameError(playerName) !== null || isConnected}
          />
        </>
      )}
      {isConnected && (
        <>
          <p className="text-3xl">Name: {playerName}</p>
          <DisconnectButton
            handleDisconnect={() => {
              disconnect();
            }}
          />
          <RoomsPanel
            handleCreateRoom={(name, capacity, password) => {
              console.log("message");
              sendMessage(GameMsgType.CREATE_ROOM, {
                name,
                capacity,
                password,
              });
            }}
            refreshList={refreshRoomsList}
            roomsList={roomsList}
          />
        </>
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
        maxLength={15}
        value={name}
        onChange={(e) => {
          e.preventDefault();
          setName(e.target.value);
        }}
      />
    </>
  );
}

// TODO: implement
function NameErrorLabel({ text }: { text: string }) {}

function RoomsPanel({
  refreshList,
  handleCreateRoom,
  roomsList,
  refreshTimeoutMS = 500,
}: {
  refreshList: () => void;
  handleCreateRoom: (name: string, capacity: number, password: string) => void;
  roomsList: GameRoomInfo[];
  refreshTimeoutMS?: number;
}): JSX.Element {
  const [disabledRefresh, setDisabledRefresh] = useState<boolean>(false);
  function handleRefresh() {
    setDisabledRefresh(true);
    refreshList();

    setTimeout(() => setDisabledRefresh(false), refreshTimeoutMS);
  }

  return (
    <div>
      <RefreshRoomListBtn
        handleRefresh={handleRefresh}
        disabled={disabledRefresh}
      />
      <CreateRoomPanel handleCreateRoom={handleCreateRoom} />
      <RoomList rooms={roomsList} />
    </div>
  );
}

function RefreshRoomListBtn({
  handleRefresh,
  disabled,
}: {
  handleRefresh: React.MouseEventHandler<HTMLDivElement>;
  disabled: boolean;
}): JSX.Element {
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
}: {
  handleCreateRoom: (name: string, capacity: number, password: string) => void;
}): JSX.Element {
  const [name, setName] = useState<string>("Awesome Room");
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
            placeholder="Awesome Room"
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
    </div>
  );
}

function RoomList({ rooms }: { rooms: GameRoomInfo[] }) {
  // TODO: implement
  return <></>;
}

function GamePanel(): JSX.Element {
  return <div></div>;
}
