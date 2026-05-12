from __future__ import annotations
import threading
import time
from typing import TYPE_CHECKING
import uuid
from ClientInfo import ClientInfo
from MazeGen.Maze import Maze
from MazeGen.MazeGenerator import generateDFSRectMaze
from Player import Player, RoomClientRole
from Structures import GameOptions
from Structures.Vector2 import Vector2
from helpers import get_time_ms
from protocol import MsgType, ResponseCode, build_network_msg, build_response, is_valid_position, parse_request
from math import floor

if TYPE_CHECKING:
    from server import Server

ROOM_MAX_PLAYERS = 10
ROOM_MIN_PLAYERS = 2
GAME_LOOP_RATE = 30
class GameRoom:
    def __init__(self, parent_server: Server, room_name: str, capacity: int, password: str | None):
        self.parent_server = parent_server
        self.name: str = room_name
        self.capacity = max(ROOM_MIN_PLAYERS, min(ROOM_MAX_PLAYERS, capacity))
        self.password: str | None = None if (password != None and len(password) == 0) else password
        self.id: uuid.UUID = uuid.uuid4()
        self.players: list[Player] = []
        self.dirty_pos_dict = {}
        self.start_time = -1
        self.game_active = False
        self.game_options = GameOptions.GameOptions() #TODO: implement
        self.game_results = [] # {name: string, timeMs: number}[]
        
        self.generate_new_maze()
        self.running = True
        self.game_loop_thread = threading.Thread(target=self.game_loop)
        self.game_loop_thread.start()

    @property
    def is_full(self):
        return len(self.players) == self.capacity

    def check_password(self, password: str | None) -> bool:
        return self.password == password or (len(password) == 0 and self.password == None)
        
    def get_room_info(self) -> dict:
        return {
            "id": str(self.id),
            "name": self.name,
            "playerCount": len(self.players),
            "capacity": self.capacity,
            "gameActive": self.game_active,
            "hasPassword": self.password != None and len(self.password) > 0
        }

    def add_client(self, client: ClientInfo):
        if self.is_full or self.game_active: return
        new_player = Player(client, RoomClientRole.PLAYER)
        new_player.send(build_network_msg(None, MsgType.JOIN_ROOM, self.get_room_info()))
        new_player.on_receive(self.id, self.on_receive_message)
        new_player.on_disconnect(self.id, self.on_client_disconnect)
        new_player.set_room(self)
        self.on_player_connect(new_player)

    def find_player_by_name(self, client_name: str) -> Player | None:
        for player in self.players:
            if player.username == client_name:
                return player
        return None
    
    # Generate a new maze for the room with respect to the game options
    # (Does not send the new maze to the players)
    def generate_new_maze(self):
        self.created_at = time.time()
        dims = GameOptions.difficultyToDims(self.game_options.difficulty)
        self.stored_maze: Maze = generateDFSRectMaze(dims["width"], dims["height"])

    def on_player_connect(self, player: Player):
        player.send(build_network_msg(None, MsgType.MAZE, self.stored_maze.get_matrix()))
        player.send(build_network_msg(None, MsgType.GAME_OPTIONS, self.game_options.get_options()))
        self.send_broadcast(build_network_msg(player, MsgType.PLAYER_CONNECTED, player.get_player_info()), player)
        for c in self.players:
            player.send(build_network_msg(None, MsgType.PLAYER_CONNECTED, c.get_player_info()))
        self.players.append(player)
        print(f"{player.to_string()} connected to room {self.name}")
        if len(self.players) == 1: self.set_admin(player)

    def on_client_disconnect(self, player: Player):
        if not player in self.players: return
        player.unsubscribe_receive(self.id)
        player.unsubscribe_disconnect(self.id)
        player.set_room(None)
        self.players.remove(player)
        print(f"{player.to_string()} disconnected from room {self.name}")
        if len(self.players) == 0:
            self.parent_server.remove_room_by_id(self.id)
            return
        self.send_broadcast(build_network_msg(player, MsgType.PLAYER_DISCONNECTED))
        try:
            player.send(build_network_msg(None, MsgType.LEAVE_ROOM, None))
        except: pass
        if player.role == RoomClientRole.ADMIN:
            if len(self.players) > 0: self.set_admin(self.players[0])

    # Send all the game information to a player - for when the player connects to the room, requests the information etc.
    def send_game_to_player(self, player: Player):
        player.send(build_network_msg(None, MsgType.MAZE, self.stored_maze.get_matrix()))
        player.send(build_network_msg(None, MsgType.GAME_OPTIONS, self.game_options.get_options()))
        for c in self.players:
            if c.username == player.username: continue
            player.send(build_network_msg(None, MsgType.PLAYER_CONNECTED, c.get_player_info()))
        curr_admin = self.get_admin()
        if curr_admin:
            player.send(build_network_msg(None, MsgType.ROOM_ADMIN, curr_admin.username))

    # update the admin of the room
    def set_admin(self, player: Player):
        for p in self.players:
            p.role = RoomClientRole.PLAYER
        player.role = RoomClientRole.ADMIN
        self.send_broadcast(build_network_msg(None, MsgType.ROOM_ADMIN, player.username))

    def get_admin(self) -> Player:
        return next((p for p in self.players if p.role == RoomClientRole.ADMIN), None)
    
    def on_receive_message(self, sender: Player, msg_str: str):
        if not sender in self.players: return
        req_type, req_data = parse_request(msg_str)
        if req_type:
            res_code, res_data = self.fulfill_request(sender, req_type, req_data)
            if res_code == None: return
            sender.send(build_response(res_code, req_type, res_data))

    def fulfill_request(self, sender: Player, req_type: MsgType, req_data: dict | None) -> tuple[ResponseCode | None, dict | None]:
        bc_msg = self.generate_broadcast(req_type, req_data)
        if bc_msg:
            bc_type, bc_data, exclude_sender = bc_msg
            exclude = None
            if exclude_sender: exclude = sender
            threading.Thread(target=self.send_broadcast, args=[build_network_msg(sender, bc_type, bc_data), exclude]).start()

        match req_type:
            case MsgType.PLAYER_CONNECTED:
                self.send_game_to_player(sender)
            case MsgType.UPDATE_POS:
                self.update_pos(sender, req_data)
            case MsgType.SET_READY:
                self.set_ready(sender, req_data)
                return ResponseCode.SUCCESS, None
            case MsgType.LEAVE_ROOM:
                self.on_client_disconnect(sender)
                return ResponseCode.SUCCESS, None
            case MsgType.START_GAME:
                if sender.role != RoomClientRole.ADMIN:
                    return ResponseCode.ERROR, "Only an admin can start the game"
                if self.can_start_game():
                    self.start_game()
                    return ResponseCode.SUCCESS, None
                else:
                    return ResponseCode.ERROR, "Can't start game"
            case MsgType.GAME_OPTIONS:
                if sender.role != RoomClientRole.ADMIN:
                    return ResponseCode.ERROR, "Only an admin can set game options"
                new_options = req_data
                if not self.update_game_options(new_options):
                    return ResponseCode.ERROR, "Could not set game options - invalid game options"
                return ResponseCode.SUCCESS, None
        return None, None

    # can_start_game: Check if the requirements for starting a game are fulfilled
    def can_start_game(self):
        # Return whether all players are ready
        return (not self.game_active) and len(self.players) > 1 and all(p.isReady for p in self.players)
    
    # start_game: Start the game
    def start_game(self):
        # Generate maze & set finish cell
        self.generate_new_maze()
        self.finish_cell = Vector2(self.stored_maze.width - 1, self.stored_maze.height - 1)

        # start_time = now + 3 seconds (in ms from epoch)
        self.start_time = get_time_ms() + (3 * 1_000)
        self.game_active = True
        bc_msg = {
            "maze": self.stored_maze.get_matrix(),
            "finishCell": self.finish_cell,
            "startTime": self.start_time,
        }
        self.send_broadcast(build_network_msg(None, MsgType.START_GAME, bc_msg))
        
    def update_pos(self, sender: Player, pos: dict):
        if is_valid_position(pos):
            self.dirty_pos_dict[sender.username] = sender.position = Vector2(pos["x"], pos["y"])

    def set_ready(self, sender: ClientInfo, isReady: bool):
        if isinstance(isReady, bool):
            sender.isReady = isReady

    # update the local game options and broadcast them to the clients
    def update_game_options(self, new_options: dict) -> bool:
        if not self.game_options.load_game_options(new_options):
            return False
        self.send_broadcast(build_network_msg(None, MsgType.GAME_OPTIONS, self.game_options.get_options()))
        return True

    # generate a broadcast from an incoming message
    # returns: (bc_type, bc_data, exclude_sender) | None
    def generate_broadcast(self, req_type: MsgType, req_data: str | None) -> tuple[MsgType, str | None, bool] | None:
        match req_type:
            case MsgType.SET_READY:
                if isinstance(req_data, bool):
                    return MsgType.SET_READY, req_data, True
            case MsgType.LEAVE_ROOM:
                return MsgType.LEAVE_ROOM, None, True
            case _:
                return None

    def send_broadcast(self, message: str, exclude: ClientInfo | None = None):
        if len(self.players) == 0: return
        # TODO: potentially to optimize broadcast, send it asynchronously
        for client in self.players:
            if (not exclude) or (client.username != exclude.username):
                client.send(message)

    def get_players_in_finish_cell(self) -> list[Player]:
        return [p for p in self.players if self.pos_is_on_cell(p.position, self.finish_cell)]
    
    # pos: normalized position
    # cellPos: grid position
    def pos_is_on_cell(self, pos: Vector2, cellPos: Vector2) -> bool:
        cell_top_left = Vector2(
            x=cellPos.x * self.cell_scale,
            y=cellPos.y * self.cell_scale
        )
        cell_bottom_right = Vector2(
            x=cellPos.x * self.cell_scale + self.cell_scale * 2,
            y=cellPos.y * self.cell_scale + self.cell_scale * 2
        )
        return cell_top_left.x < pos.x < cell_bottom_right.x and cell_top_left.y < pos.y < cell_bottom_right.y

    def player_finished(self, p: Player):
        print(f"Player {p.username} finished!")
        new_result = {
            "username": p.username,
            "timeMs": get_time_ms() - self.start_time
        }
        self.game_results.append(new_result)
        player_place = len(self.game_results)
        new_result["place"] = player_place
        self.send_broadcast(build_network_msg(None, MsgType.PLAYER_FINISHED, new_result))
        p.account_data.register_finish_game(str(self.id))
        p.account_data.save()

    # Checks if the requirements for stopping the game are fulfilled
    # - All players finished the maze (in self.game_results)
    # - ... add more options in the future (time limit etc..)
    def should_stop_game(self) -> bool:
        return (len(self.players) > 1) and (len(self.game_results) == len(self.players))

    def end_game(self):
        self.running = False
        self.game_active = False
        self.send_broadcast(build_network_msg(None, MsgType.END_GAME, self.game_results))
        # TODO: Disconnect all players and close room?

    def game_loop(self):
        self.last_0_pos = Vector2(0, 0)
        while self.running:
            start = time.perf_counter()

            # send dirty positions
            if len(self.dirty_pos_dict):
                dirty_pos_msg = build_network_msg(None, MsgType.UPDATE_POS, self.dirty_pos_dict)
                self.send_broadcast(dirty_pos_msg, None)
                self.dirty_pos_dict.clear()

            if self.game_active:
                # TODO: Optimize?
                finishers = self.get_players_in_finish_cell()
                new_finishers = [x for x in finishers if all(x.username != y["username"] for y in self.game_results)]
                if len(new_finishers):
                    for f in new_finishers:
                        self.player_finished(f)

                if self.should_stop_game():
                    self.end_game()
                    break

            time.sleep(max(1. / GAME_LOOP_RATE - (time.perf_counter() - start), 0))

    # disconnect all players from the room
    def disconnect_all(self):
        for player in self.players:
            self.on_client_disconnect(player)

    # region "Canvas" Methods
    @property
    def cell_scale(self) -> float:
        RENDER_HEIGHT = float(1.) # normalized maze size
        return RENDER_HEIGHT / (self.stored_maze.height + 1)

    def canvas_to_visual_grid(self, canvas_pos: Vector2) -> Vector2:
        return Vector2(
            x=int(floor(canvas_pos.x / self.cell_scale) / 2.),
            y=int(floor(canvas_pos.y / self.cell_scale) / 2.),
        )
    
    def canvas_to_grid(self, canvas_pos: Vector2) -> Vector2:
        return Vector2(
            x=floor(canvas_pos.x / self.cell_scale),
            y=floor(canvas_pos.y / self.cell_scale),
        )
    
    def apply_canvas_circle_offset(self, pos: Vector2) -> Vector2:
        return Vector2(
            x=pos.x + self.cell_scale/2,
            y=pos.y + self.cell_scale /2,
        )
    
    def get_cell_of_player_pos(self, player_pos: Vector2) -> Vector2:
        return self.canvas_to_visual_grid(self.apply_canvas_circle_offset(player_pos))

    # endregion

ROOM_NAME_MAX_LEN = 20
ROOM_NAME_MIN_LEN = 3
def valid_room_name(name: str) -> bool:
    return ROOM_NAME_MIN_LEN <= len(name) <= ROOM_NAME_MAX_LEN

def valid_room_capacity(cap: int) -> bool:
    return cap >= ROOM_MIN_PLAYERS and cap <= ROOM_MAX_PLAYERS

PASSWORD_MAX_LENGTH = 16
def valid_room_password(password: str | None) -> bool:
    return password == None or len(password) <= PASSWORD_MAX_LENGTH
