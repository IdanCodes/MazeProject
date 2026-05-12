import PrimaryButton from "@src/components/buttons/PrimaryButton";
import { RedirectButton } from "@src/components/buttons/RedirectButton";
import { ErrorLabel } from "@src/components/ErrorLabel";
import { GameMsgType, ResponseCode } from "@src/constants/game-msg-type";
import { RoutePath } from "@src/constants/route-path";
import { useNetworkContext } from "@src/contexts/NetworkContext";
import { GameRoomInfo, roomIsFull } from "@src/interfaces/GameRoomInfo";
import { JSX, useEffect, useMemo, useState } from "react";

function RoomsView({ callerId }: { callerId: string }) {
  const { sendMessage, onResponse } = useNetworkContext();
  const [roomsList, setRoomsList] = useState<GameRoomInfo[]>([]);
  const [createRoomError, setCreateRoomError] = useState<string>("");
  const [roomsError, setRoomsError] = useState<string>("");

  useEffect(() => {
    onResponse(callerId, GameMsgType.ROOMS_LIST, (res) => {
      if (res.code != ResponseCode.SUCCESS) {
        console.error("Encountered error when retrieving rooms list");
        setRoomsError(
          "Could not retrieve rooms list" +
            (res.data.error && ` - ${res.data.error}`),
        );
        setRoomsList([]);
        return;
      }
      setRoomsList(res.data);
    });

    onResponse(callerId, GameMsgType.CREATE_ROOM, (res) => {
      if (res.code != ResponseCode.SUCCESS) {
        console.error("Encountered an error when creating a room", res.data);
        setCreateRoomError(res.data.error);
        return;
      }
      console.log("Room created successfuly!");
    });

    onResponse(callerId, GameMsgType.JOIN_ROOM, (res) => {
      if (res.code == ResponseCode.SUCCESS) {
        console.log("Successfuly joined room");
        setRoomsError("");
      } else
        setRoomsError(
          "Could not join room" + (res.data.error && ` - ${res.data.error}`),
        );
    });

    refreshRoomsList();
  }, []);

  const createRoom = (name: string, capacity: number, password: string) => {
    setCreateRoomError("");
    sendMessage(GameMsgType.CREATE_ROOM, {
      name,
      capacity,
      password,
    });
    refreshRoomsList();
  };

  const joinRoom = (room_id: string, room_password: string) => {
    sendMessage(GameMsgType.JOIN_ROOM, {
      id: room_id,
      password: room_password,
    });
    refreshRoomsList();
  };

  function refreshRoomsList() {
    setRoomsList([]);
    sendMessage(GameMsgType.ROOMS_LIST);
  }

  return (
    <>
      <RedirectButton path={RoutePath.Home}>Back</RedirectButton>
      <RoomsPanel
        handleCreateRoom={createRoom}
        handleJoinRoom={joinRoom}
        refreshList={refreshRoomsList}
        roomsList={roomsList}
        createRoomError={createRoomError}
        roomsError={roomsError}
      />
    </>
  );

  function RoomsPanel({
    refreshList,
    handleCreateRoom,
    handleJoinRoom,
    roomsError,
    roomsList,
    refreshTimeoutMS = 5000,
    createRoomError = "",
  }: {
    refreshList: () => void;
    handleCreateRoom: (
      name: string,
      capacity: number,
      password: string,
    ) => void;
    handleJoinRoom: (room_id: string, room_password: string) => void;
    roomsError: string;
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
          <ErrorLabel text={roomsError} />
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
    handleCreateRoom: (
      name: string,
      capacity: number,
      password: string,
    ) => void;
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
            <p>
              {room.gameActive ? "Game is active" : "Waiting for players..."}
            </p>
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
    }
  }
}

export default RoomsView;
