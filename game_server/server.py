# The main server for the game
# stores the connected clients
# manages:
# - "authentication" and handshakes with clients
# - rooms/games on the network
import asyncio
from uuid import UUID
import websockets
from ClientInfo import ClientInfo, get_username_error
from GameRoom import GameRoom, valid_room_capacity, valid_room_name, valid_room_password
import protocol
from protocol import MsgType, ResponseCode, build_error_msg, build_error_obj, build_network_msg, build_response, build_success_msg, parse_request
# TODO: TODO - when rooms get to playercount = 0, they start a 5 minute countdown until they expire and close by themselves
class Server:
    def __init__(self):
        self.clients: list[ClientInfo] = []
        self.rooms: list[GameRoom] = []
    
    async def start_server(self):
        print(f"Server listening on ws://{protocol.IP_ADDR}:{protocol.PORT}")
        server_task = asyncio.create_task(self.server_loop())
        await asyncio.gather(server_task)

    async def server_loop(self):
        async with websockets.serve(self.init_connection, protocol.IP_ADDR, protocol.PORT):
            await asyncio.Future()

    # initialize the connection with a client - "handshake" before connection
    async def init_connection(self, websocket: websockets.ServerConnection):
        try:
            while True:
                rec_text = await websocket.recv()
                req_type, req_data = protocol.parse_request(rec_text)
                client_name: str = req_data
                new_client = ClientInfo(websocket, client_name)

                if not req_type or not isinstance(req_data, str) or req_type != MsgType.SET_NAME:
                    print("Closing websocket - invalid request for init")
                    websocket.close()
                    return

                # check if the name is already registered
                name_err = get_username_error(client_name)
                if name_err != None:
                    await new_client.send(build_error_msg(MsgType.SET_NAME, f"The name {new_client.name} is invalid: {name_err}"))
                elif self.find_client_by_name(new_client.name) != None:
                    await new_client.send(build_error_msg(MsgType.SET_NAME, f"The name {new_client.name} is taken"))
                else:
                    break
        except websockets.exceptions.ConnectionClosedOK:
            return

        await new_client.send(build_success_msg(MsgType.SET_NAME))
        new_client.on_receive(None, self.on_receive_message)
        new_client.on_disconnect(None, self.on_client_disconnect)
        new_client.start_recv()
        self.on_client_connect(new_client)

        # Keep this handler alive until the client actually disconnects.
        # websockets.serve will close the connection when this coroutine returns.
        await websocket.wait_closed()

    # Get ClientInfo by the client's id
    # Returns None if the client isn't connected
    def find_client_by_name(self, client_name: str) -> ClientInfo | None:
        for c in self.clients:
            if c.name == client_name:
                return c
        return None

    def on_client_connect(self, client: ClientInfo):
        self.clients.append(client)
        print(f"{client.to_string()} connected")

    def on_client_disconnect(self, client: ClientInfo):
        self.clients.remove(client)
        print(f"{client.to_string()} disconnected")
    
    async def on_receive_message(self, sender: ClientInfo, msg_str: str):
        if not sender.in_lobby: return # TODO: unsubscribe recv when transferred into room
        req_type, req_data = parse_request(msg_str)
        if req_type:
            response_type, response_data =  await self.fulfill_request(sender, req_type, req_data)
            if response_type == None: return
            await sender.send(build_response(response_type, req_type, response_data))

    # returns (response type, data | None)
    async def fulfill_request(self, sender: ClientInfo, req_type: MsgType, req_data: dict | None) -> tuple[ResponseCode | None, dict | None]:
        match req_type:
            case MsgType.ROOMS_LIST:
                return ResponseCode.SUCCESS, self.get_rooms_info()
            case MsgType.CREATE_ROOM:
                room_name = room_capacity = room_password = ""
                try:
                    room_name = req_data["name"]
                    room_capacity = int(req_data["capacity"])
                    room_password = req_data["password"]
                except:
                    return ResponseCode.ERROR, build_error_obj("Invalid arguments (required name, capacity, password)")
                
                successful, reason = self.create_room(room_name, room_capacity, room_password)
                if not successful:
                    return ResponseCode.ERROR, build_error_obj(reason)
                
                new_room = self.get_room_by_name(room_name)
                if not new_room:
                    return ResponseCode.ERROR, build_error_obj("An unexpected error occurred while creating the room")
                return ResponseCode.SUCCESS, { "room_id": str(new_room.id) }
            case MsgType.JOIN_ROOM:
                room_id = room_password = ""
                try:
                    room_id = UUID(req_data["id"])
                    room_password = req_data["password"]
                except:
                    return ResponseCode.ERROR, build_error_obj("Invalid arguemnts (required id, password)")
                
                successful, reason = await self.join_room(sender, room_id, room_password)
                if not successful:
                    return ResponseCode.ERROR, build_error_obj(reason)
                return ResponseCode.SUCCESS, None
        return ResponseCode.ERROR, None

    def get_rooms_info(self) -> list[GameRoom]:
        return [room.get_room_info() for room in self.rooms]
    
    def get_room_by_id(self, room_id: UUID) -> GameRoom | None:
        for room in self.rooms:
            if room.id == room_id:
                return room
        return None
    
    def get_room_by_name(self, room_name: str) -> GameRoom | None:
        for room in self.rooms:
            if room.name == room_name:
                return room
        return None
    
    # returns: (whether creating the room was successful, reason for failing)
    def create_room(self, name: str, capacity: int, password: str | None) -> tuple[bool, str | None]:
        if not valid_room_capacity(capacity):
            return False, f"Invalid capacity {capacity}."
        if not valid_room_name(name):
            return False, f"Invalid room name {name}"
        if not valid_room_password(password):
            return False, f"Invalid room password"
        if self.get_room_by_name(name) != None:
            return False, "A room with this name already exists"
        new_room = GameRoom(self, name, capacity, password)
        self.rooms.append(new_room)
        return True, None

    # returns: (whether joining the room was successful, reason for failing)
    async def join_room(self, client: ClientInfo, room_id: UUID, password: str | None) -> tuple[bool, str | None]:
        room = self.get_room_by_id(room_id)
        if not room:
            return False, "Invalid room id"
        if not room.check_password(password):
            return False, "Invalid password"
        if room.is_full:
            return False, "Room is full - can not join"
        await room.add_client(client)
        return True, None
    
    # remove a room from the server
    # returns whether removing was successful
    async def remove_room_by_id(self, room_id: UUID) -> bool:
        room = self.get_room_by_id(room_id)
        if room == None: return False
        self.rooms.remove(room)
        print(f"Removed room {room.name}")
        return True


if __name__ == "__main__":
    server = Server()

    try:
        asyncio.run(server.start_server())
    except KeyboardInterrupt:
        print("\nServer stopped manually")
