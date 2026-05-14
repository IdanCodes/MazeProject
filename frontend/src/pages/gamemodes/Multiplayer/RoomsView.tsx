import PrimaryButton from "@src/components/buttons/PrimaryButton";
import { RedirectButton } from "@src/components/buttons/RedirectButton";
import { ErrorLabel } from "@src/components/ErrorLabel";
import LoadingSpinner from "@src/components/LoadingSpinner";
import OverlayModal from "@src/components/OverlayModal";
import { GameMsgType, ResponseCode } from "@src/constants/GameMsgType";
import { RoutePath } from "@src/constants/route-path";
import { useNetworkContext } from "@src/contexts/NetworkContext";
import { GameRoomInfo, roomIsFull } from "@src/interfaces/GameRoomInfo";
import clsx from "clsx";
import { JSX, useEffect, useMemo, useState } from "react";

function RoomsView({
  callerId,
  playerName,
}: {
  callerId: string;
  playerName: string;
}) {
  const { sendMessage, onResponse } = useNetworkContext();
  const [roomsList, setRoomsList] = useState<GameRoomInfo[]>([]);
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

  function refreshRoomsList() {
    setRoomsList([]);
    sendMessage(GameMsgType.ROOMS_LIST);
  }

  return (
    <>
      <RedirectButton path={RoutePath.Home} className="text-3xl">
        Back
      </RedirectButton>
      <RoomsPanel
        callerId={callerId + ".RoomsPanel"}
        playerName={playerName}
        refreshList={refreshRoomsList}
        roomsList={roomsList}
        roomsError={roomsError}
      />
    </>
  );
}

function CreateRoomPanel({
  callerId,
  playerName,
  setError,
  closeModal,
  refreshRoomsList,
}: {
  callerId: string;
  playerName: string;
  setError: (err: string) => void;
  closeModal: () => void;
  refreshRoomsList: () => void;
}): JSX.Element {
  const { sendMessage, onResponse } = useNetworkContext();
  const [name, setName] = useState<string>(`${playerName}'s Room`);
  const [tempCapacity, setTempCapacity] = useState<string>("5");
  // const [editingCapacity, setEditingCapacity]
  const [capacity, setCapacity] = useState<number>(5);
  const [passwordActive, setPasswordActive] = useState<boolean>(false);
  const [password, setPassword] = useState<string>("");
  const btnDisabled = useMemo(
    () =>
      name.length <= 2 ||
      name.length > 20 ||
      capacity < 2 ||
      capacity > 10 ||
      ((password.length == 0 || password.length > 16 || /\s/.test(password)) &&
        passwordActive),
    [name, capacity, password, passwordActive],
  );

  const sendCreateRoom = (name: string, capacity: number, password: string) => {
    setError("");
    sendMessage(GameMsgType.CREATE_ROOM, {
      name,
      capacity,
      password,
    });
    refreshRoomsList();
  };

  const handleCreteRoom = () => {
    setName("");
    setCapacity(2);
    setPassword("");
    setName(name.trim());
    sendCreateRoom(name.trim(), capacity, passwordActive ? password : "");
    closeModal();
  };

  const updateCapacity = (newCapStr: string) => {
    const newCap = Number(newCapStr);
    if (isNaN(newCap) || newCap < 2 || newCap > 10)
      return setTempCapacity(capacity.toString());
    setCapacity(newCap);
  };

  useEffect(() => {
    onResponse(callerId, GameMsgType.CREATE_ROOM, (res) => {
      if (res.code != ResponseCode.SUCCESS) {
        console.error("Encountered an error when creating a room", res.data);
        setError(res.data.error);
        return;
      }
      console.log("Room created successfuly!");
    });
  }, []);

  return (
    <OverlayModal
      closeModal={closeModal}
      className="bg-gray-300 p-6 rounded-lg"
    >
      <div className="w-full flex flex-col">
        <PrimaryButton
          className="bg-red-500/90 hover:bg-red-500 text-2xl w-30"
          onClick={closeModal}
        >
          Close
        </PrimaryButton>
        <form
          className="pb-7 pt-5 px-10"
          onSubmit={(e) => {
            e.preventDefault();
            // handleCreteRoom();
          }}
        >
          <div className="flex flex-col gap-5 justify-around mx-auto p-5">
            <div className="flex w-full justify-between gap-5">
              <p className="text-4xl">Room Name: </p>
              <input
                type="text"
                placeholder="Room Name"
                className="bg-white rounded-md text-3xl py-2 text-center"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex w-full justify-between gap-5">
              <p className="text-4xl">Capacity: </p>
              <input
                type="number"
                // placeholder="1"
                className="bg-white rounded-md text-3xl py-2 text-center"
                value={tempCapacity}
                onChange={(e) => setTempCapacity(e.target.value)}
                onBlur={(e) => updateCapacity(e.target.value)}
              />
            </div>
            <div>
              <label className="w-fit text-3xl flex gap-5 pb-1">
                <input
                  type="checkbox"
                  className="size-6 m-auto"
                  checked={passwordActive}
                  onChange={(e) => setPasswordActive(!passwordActive)}
                />
                Use Password
              </label>
              <div
                className={clsx(
                  "flex w-full justify-between gap-15 transition-all",
                  !passwordActive && "opacity-50",
                )}
              >
                <p className="text-4xl">Password: </p>
                <input
                  type="text"
                  placeholder=""
                  className="bg-white rounded-md text-3xl py-2 text-center"
                  value={password}
                  disabled={!passwordActive}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="w-fit mx-auto flex gap-10">
            <PrimaryButton
              className="bg-green-500 hover:bg-green-600 text-3xl px-10 py-5 mx-auto"
              disabled={btnDisabled}
              // btnType="submit"
              onClick={handleCreteRoom}
            >
              Create Room
            </PrimaryButton>
          </div>
        </form>
      </div>
    </OverlayModal>
  );
}

function RoomList({
  rooms,
  refreshRoomsList,
}: {
  rooms: GameRoomInfo[];
  refreshRoomsList: () => void;
}) {
  const { sendMessage } = useNetworkContext();

  const handleJoinRoom = (room_id: string, room_password: string) => {
    sendMessage(GameMsgType.JOIN_ROOM, {
      id: room_id,
      password: room_password,
    });
    refreshRoomsList();
  };

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
          <p>{room.gameActive ? "Game is active" : "Waiting for players..."}</p>
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

function RoomsPanel({
  callerId,
  playerName,
  refreshList,
  roomsError,
  roomsList,
  refreshTimeoutMS = 1500,
}: {
  callerId: string;
  playerName: string;
  refreshList: () => void;
  roomsError: string;
  roomsList: GameRoomInfo[];
  refreshTimeoutMS?: number;
}): JSX.Element {
  const [disabledRefresh, setDisabledRefresh] = useState<boolean>(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState<boolean>(false);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [createRoomError, setCreateRoomError] = useState<string>("");
  function handleRefresh() {
    setIsLoadingRooms(true);
    setDisabledRefresh(true);
    refreshList();

    setTimeout(() => setDisabledRefresh(false), refreshTimeoutMS);
  }

  useEffect(() => {
    setIsLoadingRooms(false);
  }, [roomsList]);

  const roomCountStr = useMemo<string>(() => {
    if (roomsList.length == 0) return "There are no rooms open";
    if (roomsList.length == 1) return "There is 1 room open";
    return `There are ${roomsList.length} rooms open`;
  }, [roomsList]);

  return (
    <div>
      {createModalOpen && (
        <CreateRoomPanel
          callerId={callerId + ".CreateRoomPanel"}
          playerName={playerName}
          setError={setCreateRoomError}
          closeModal={() => setCreateModalOpen(false)}
          refreshRoomsList={refreshList}
        />
      )}
      <div className="w-7/10 mx-auto">
        <ErrorLabel text={createRoomError} />
        <div className="flex">
          <NewRoomButton handleNewRoom={() => setCreateModalOpen(true)} />
          <RefreshRoomListBtn
            handleRefresh={handleRefresh}
            disabled={disabledRefresh}
          />
        </div>
        <ErrorLabel text={roomsError} />
        {isLoadingRooms ? (
          <LoadingSpinner />
        ) : roomsList.length == 0 ? (
          <p className="text-4xl text-center">{roomCountStr}</p>
        ) : (
          <>
            <p className="text-4xl text-center py-2">{roomCountStr}</p>
            <RoomList rooms={roomsList} refreshRoomsList={refreshList} />
          </>
        )}
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

function NewRoomButton({ handleNewRoom }: { handleNewRoom: () => void }) {
  return (
    <PrimaryButton className="text-2xl" onClick={handleNewRoom}>
      New Room
    </PrimaryButton>
  );
}

export default RoomsView;
