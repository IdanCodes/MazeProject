# The main server for the game
# stores the connected clients
# manages:
# - "authentication" and handshakes with clients
# - rooms/games on the network
import asyncio
from uuid import UUID
import socket
import threading
from ClientInfo import ClientInfo, get_username_error
from GameRoom import GameRoom, valid_room_capacity, valid_room_name, valid_room_password
import protocol
from protocol import SOCK_RECV_CHUNK_SIZE, MsgType, ResponseCode, build_error_msg, build_error_obj, build_network_msg, build_response, build_success_msg, parse_request
class Server:
    def __init__(self):
        self.clients: list[ClientInfo] = []
        self.rooms: list[GameRoom] = []
    
    def start_server(self):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as self.server_sock:
            self.server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.server_sock.bind((protocol.IP_ADDR, protocol.PORT))
            self.server_sock.listen(10)
            print(f"Server listening on {protocol.IP_ADDR}:{protocol.PORT}")

            self.accept_connections()

    def close(self):
        self.server_sock.close()

    def accept_connections(self):
        while True:
            client_sock, remote_addr = self.server_sock.accept()
            print("accepted connection from", remote_addr)
            threading.Thread(target=self.init_connection, args=[client_sock, remote_addr]).start()

    # initialize the connection with a client - "handshake" before connection
    def init_connection(self, client_sock: socket.socket, remote_addr):
        try:
            while True:
                rec_text = client_sock.recv(SOCK_RECV_CHUNK_SIZE)
                rec_text = rec_text.decode()
                req_type, req_data = protocol.parse_request(rec_text)
                client_name: str = req_data
                if not req_type or not isinstance(req_data, str) or req_type != MsgType.SET_NAME:
                    print("Closing connection - invalid request for init")
                    return
                
                new_client = ClientInfo(client_sock, remote_addr, client_name)
                
                name_err = get_username_error(client_name)
                if name_err != None:
                    new_client.send(build_error_msg(MsgType.SET_NAME, f"The name {new_client.name} is invalid: {name_err}"))
                elif self.find_client_by_name(new_client.name) != None:
                    new_client.send(build_error_msg(MsgType.SET_NAME, f"The name {new_client.name} is taken"))
                else:
                    break
        except:
            return

        new_client.send(build_success_msg(MsgType.SET_NAME))
        new_client.on_receive(None, self.on_receive_message)
        new_client.on_disconnect(None, self.on_client_disconnect)
        new_client.start_recv()
        self.on_client_connect(new_client)


    # Get ClientInfo by the client's id
    # Returns None if there's no client with the given name
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
    
    def on_receive_message(self, sender: ClientInfo, msg_str: str):
        if not sender.in_lobby: return
        req_type, req_data = parse_request(msg_str)
        if req_type:
            response_type, response_data =  self.fulfill_request(sender, req_type, req_data)
            if response_type == None: return
            sender.send(build_response(response_type, req_type, response_data))

    # returns (response type, data | None)
    def fulfill_request(self, sender: ClientInfo, req_type: MsgType, req_data: dict | None) -> tuple[ResponseCode | None, dict | None]:
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
                
                # Join automatically after creating a room
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
    def join_room(self, client: ClientInfo, room_id: UUID, password: str | None) -> tuple[bool, str | None]:
        room = self.get_room_by_id(room_id)
        if not room:
            return False, "Invalid room id"
        if not room.check_password(password):
            return False, "Invalid password"
        if room.is_full:
            return False, "Room is full - can not join"
        if room.game_active:
            return False, "Game is active - can't join"
        room.add_client(client)
        return True, None
    
    # remove a room from the server
    # returns whether removing was successful
    def remove_room_by_id(self, room_id: UUID) -> bool:
        room = self.get_room_by_id(room_id)
        if room == None: return False
        self.rooms.remove(room)
        print(f"Removed room {room.name}")
        return True


if __name__ == "__main__":
    server = Server()

    try:
        server.start_server()
    except KeyboardInterrupt:
        server.close()
        print("\nServer stopped manually")
