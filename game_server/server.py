# The main server for the game
# stores the connected clients
# manages:
# - "authentication" and handshakes with clients
# - rooms/games on the network
import asyncio
from uuid import UUID
import websockets
from ClientInfo import ClientInfo
from GameRoom import GameRoom, valid_room_capacity, valid_room_name, valid_room_password
import protocol
from protocol import MsgType, ResponseCode, build_error_msg, build_error_obj, build_network_msg, build_response, build_success_msg, parse_request
from constants import MAIN_SERVER

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
                    await websocket.close()
                    return

                # check if the name is already registered
                if self.get_client_info(new_client.name) != None:
                    await new_client.send(build_error_msg(MsgType.SET_NAME, f"The name {new_client.name} is taken."))
                else:
                    break
        except websockets.exceptions.ConnectionClosedOK:
            return
            
        await new_client.send(build_success_msg(MsgType.SET_NAME))
        await self.handle_client(new_client)

    # Get ClientInfo by the client's id
    # Returns None if the client isn't connected
    def get_client_info(self, client_name: str) -> ClientInfo | None:
        for c in self.clients:
            if c.name == client_name:
                return c
        return None

    # handle a client's requests to the server
    async def handle_client(self, client: ClientInfo):
        await self.on_client_connect(client)
        try:
            async for msg in client.websocket:
                if not client in self.clients: return
                await self.on_receive_message(client, msg)
        finally:
            if not client in self.clients: return
            await self.on_client_disconnect(client)
            await client.websocket.close()
    
    async def on_client_connect(self, client: ClientInfo):
        self.clients.append(client)
        print(f"{client.to_string()} connected")

    async def on_client_disconnect(self, client: ClientInfo):
        self.clients.remove(client)
        print(f"{client.to_string()} disconnected")
    
    # returns whether the client should stay connected
    async def on_receive_message(self, sender: ClientInfo, msg_str: str) -> bool:
        req_type, req_data = parse_request(msg_str)
        if req_type:
            response_type, response_data =  await self.fulfill_request(sender, req_type, req_data)
            await sender.send(build_response(response_type, req_type, response_data))
        return True

    # returns (response type, data | None)
    async def fulfill_request(self, sender: ClientInfo, req_type: MsgType, req_data: dict | None) -> tuple[ResponseCode, dict | None]:
        match req_type:
            case MsgType.ROOMS_LIST:
                return ResponseCode.SUCCESS, self.get_rooms_info()
            case MsgType.CREATE_ROOM:
                room_name = room_capacity = room_password = ""
                try:
                    room_name = req_data["name"]
                    room_capacity = req_data["capacity"]
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
                
                successful, reason = self.join_room(sender, room_id, room_password)
                if not successful:
                    return ResponseCode.ERROR, build_error_obj(reason)
                return ResponseCode.SUCCESS, None
            case _:
                return ResponseCode.ERROR, None
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
    
    # TOOD: Implement ANDDD return whether the room can be created - valid name, password, capacity, ...
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
        new_room = GameRoom(name, capacity, password)
        self.rooms.append(new_room)
        return True, None

    # returns: (whether joining the room was successful, reason for failing)
    def join_room(self, client: ClientInfo, room_id: UUID, password: str | None) -> tuple[bool, str | None]:
        room = self.get_room_by_id(room_id)
        if not room:
            return False, "Invalid room id"
        if not room.check_password(password):
            return False, "Invalid password"
        if not room.add_client(client):
            return False, "Could not join room"
        self.clients.remove(client)
        return True, None

if __name__ == "__main__":
    MAIN_SERVER = Server()

    try:
        asyncio.run(MAIN_SERVER.start_server())
    except KeyboardInterrupt:
        print("\nServer stopped manually")
