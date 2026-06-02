# The main server for the game
# stores the connected clients
# manages:
# - "authentication" and handshakes with clients
# - rooms/games on the network
from uuid import UUID
import socket
import threading
from Database.AccountData import AccountData, get_credentials_error
from ClientInfo import ClientInfo
from GameRoom import GameRoom, valid_room_capacity, valid_room_name, valid_room_password
from MazeGen.MazeGenerator import generate_maze_data_by_game_options
from ProtocolHelpers.EncryptedSocket import EncryptedSocket
from Structures.GameOptions import GameOptions
from Structures.Vector2 import vector2_to_dict
import server_config
import protocol
from protocol import SOCK_RECV_CHUNK_SIZE, MsgType, ResponseCode, build_error_obj, build_response, parse_request
from Database.DBManagers import accounts_manager

# TODO: Add a "Restart" button for the admin when the game ends so players can rematch.
#       The button sends a mesasge to the server, which broadcasts to the players that the game restarted, and the room does a full "reset" of a sort
#       The room saves the GameData (in the db) and creates a new GameData

# Default exception hook for threads
def default_excepthook(args):
    import traceback
    print(f"Thread failed: {args.exc_type} - {args.exc_value}")
    traceback.print_exc()

threading.excepthook = default_excepthook

class Server:
    def __init__(self):
        self.clients: list[ClientInfo] = []
        self.rooms: list[GameRoom] = []
    
    def start_server(self):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as self.server_sock:
            self.server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.server_sock.bind((server_config.IP_ADDR, server_config.PORT))
            self.server_sock.listen(server_config.BACKLOG)
            print(f"Server listening on {server_config.IP_ADDR}:{server_config.PORT}")

            self.accept_connections()

    def close(self):
        self.server_sock.close()

    def accept_connections(self):
        while True:
            client_sock, remote_addr = self.server_sock.accept()
            print("accepted connection from", remote_addr)
            try:
                threading.Thread(target=self.init_connection, args=[client_sock, remote_addr], ).start()
            except Exception as e:
                print("Thread encountered an exception:", e)

    # initialize the connection with a client - "handshake" before connection
    def init_connection(self, client_sock: socket.socket, remote_addr):
        # Step 1 - Handshake
        secure_sock = EncryptedSocket(client_sock)

        print(f"Starting handshake with {remote_addr}")
        if not secure_sock.execute_server_handshake():
            print(f"Handshake with {remote_addr} failed. Aborting thread.")
            secure_sock.close()
            return
        print(f"Succesfully finished handshake with {remote_addr}!")

        new_client = None
        try:
            while new_client == None:
                # TODO: Maybe receive with respect to the delimiter like in ClientInfo
                # rec_text = client_sock.recv(SOCK_RECV_CHUNK_SIZE)
                # rec_text = rec_text.decode(encoding=protocol.NETWORK_ENCODING)
                rec_text = secure_sock.recv_str()
                if not rec_text:
                    secure_sock.close()
                    print(f"Client {remote_addr} disconnected abruptly.")
                    return

                req_type, req_data = protocol.parse_request(rec_text)
                if not req_type: raise Exception(f"Invalid request for init - {rec_text}")

                acc_data, error_text = self.handle_auth_request(req_type, req_data)
                if not acc_data:
                    # protocol.send_str(client_sock, build_response(ResponseCode.ERROR, req_type, error_text))
                    secure_sock.send_str(build_response(ResponseCode.ERROR, req_type, error_text))
                    continue

                new_client = ClientInfo(secure_sock, remote_addr, acc_data)
                new_client.send(build_response(ResponseCode.SUCCESS, req_type, "Connected Successfully"))
        except Exception as e:
            import traceback
            print(f"Handshake failed for {remote_addr}:", e)
            traceback.print_exc()
            secure_sock.close()
            return

        new_client.on_receive(None, self.on_receive_message)
        new_client.on_disconnect(None, self.on_client_disconnect)
        new_client.start_recv()
        self.on_client_connect(new_client)

    # Handle a request to authenticate the user - signup or login
    # req_type: The MsgType of the request
    # req_data: The data field of the request
    # returns: If an error occurred during authentication, returns (None, the error string). Otherwise, (AccountData, _)
    def handle_auth_request(self, req_type: MsgType, req_data: any) -> tuple[AccountData | None, str | None]:
        if not req_type or (req_type != MsgType.LOGIN and req_type != MsgType.SIGN_UP):
            return None, f"Invalid request for connection init '{req_type}'. Required LOGIN or SIGN_UP"
        
        username, password = None, None
        try:
            if not isinstance(req_data, dict): raise Exception()
            username = req_data["username"]
            password = req_data["password"]
        except:
            return None, "Missing credentials. Both username and password must be provided"
        
        if not isinstance(username, str) or not isinstance(password, str):
            return None, "Both username and password must be valid strings"

        # Validate Credentials
        error_text = get_credentials_error(username, password)
        if error_text: return None, error_text

        acc_data, error_text = None, "Error: Something Went Wrong"
        if req_type == MsgType.LOGIN:
            acc_data, error_text = self.try_login(username, password)
        elif req_type == MsgType.SIGN_UP:
            acc_data, error_text = self.try_signup(username, password)
        if not acc_data:
            return None, error_text
        return acc_data, "Connected Successfully"

    # try logging in
    def try_login(self, username: str, password: str) -> tuple[AccountData | None, str | None]:
        acc_data = accounts_manager.authenticate_user(username, password)
        if not acc_data:
            if accounts_manager.does_user_exist(username): return None, "Invalid Password"
            else: return None, "User doesn't exist"
        if any(c.username == username for c in self.clients):
            return None, "This account is currently in use by another client"
        return acc_data, None

    # try signing up
    def try_signup(self, username: str, password: str) -> tuple[AccountData | None, str | None]:
        if accounts_manager.does_user_exist(username):
            return None, "Username is taken"
        acc_data = accounts_manager.sign_up(username, password)
        if not acc_data:
            return None, "Sign Up Failed"
        return acc_data, None


    # Get ClientInfo by the client's id
    # Returns None if there's no client with the given name
    def find_client_by_name(self, client_name: str) -> ClientInfo | None:
        for c in self.clients:
            if c.username == client_name:
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
                join_success, reason = self.join_room(sender, new_room.id, room_password)
                if not join_success:
                    return ResponseCode.ERROR, f"Error joining room: {reason}"
                
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
            case MsgType.GENERATE_MAZE:
                game_options = GameOptions()
                if not game_options.load_game_options(req_data):
                    return ResponseCode.ERROR, "Received invalid game options"
                
                maze_data = generate_maze_data_by_game_options(game_options)
                return ResponseCode.SUCCESS, {
                    "grid": maze_data["grid"],
                    "finishCell": vector2_to_dict(maze_data["finish_cell"])
                }
        return ResponseCode.ERROR, None
    
    def get_rooms_info(self) -> list[dict]:
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
        accounts_manager.close()
        print("\nServer stopped manually")
