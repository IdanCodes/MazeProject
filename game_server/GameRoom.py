from __future__ import annotations
import time
from types import SimpleNamespace
from typing import TYPE_CHECKING
import uuid
import asyncio
from ClientInfo import ClientInfo
from MazeGen.Maze import Maze
from MazeGen.MazeGenerator import generateDFSRectMaze
from Player import Player, RoomClientRole
from Structures.Vector2 import Vector2
from protocol import MsgType, ResponseCode, build_network_msg, build_response, is_valid_position, parse_request

if TYPE_CHECKING:
    from server import Server

ROOM_MAX_PLAYERS = 10
ROOM_MIN_PLAYERS = 2
GAME_LOOP_RATE = 20
DEFAULT_MAZE_DIMENSIONS = SimpleNamespace(width=25, height=25)
class GameRoom:
    def __init__(self, parent_server: Server, room_name: str, capacity: int, password: str | None):
        self.parent_server = parent_server
        self.name: str = room_name
        self.capacity = max(ROOM_MIN_PLAYERS, min(ROOM_MAX_PLAYERS, capacity))
        self.password: str | None = None if (password != None and len(password) == 0) else password
        self.id: uuid.UUID = uuid.uuid4()
        self.players: list[Player] = []
        self.dirty_pos_dict = {}
        self.game_active = False
        self.created_at = time.time()
        self.stored_maze: Maze = generateDFSRectMaze(DEFAULT_MAZE_DIMENSIONS.width, DEFAULT_MAZE_DIMENSIONS.height)
        self.running = True
        asyncio.create_task(self.game_loop())

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

    async def add_client(self, client: ClientInfo, role: RoomClientRole = RoomClientRole.PLAYER):
        new_player = Player(client, role)
        await new_player.send(build_network_msg(None, MsgType.JOIN_ROOM, self.get_room_info()))
        new_player.on_receive(self.id, self.on_receive_message)
        new_player.on_disconnect(self.id, self.on_client_disconnect)
        new_player.set_room(self)
        asyncio.create_task(self.on_player_connect(new_player))

    def find_player_by_name(self, client_name: str) -> Player | None:
        for player in self.players:
            if player.name == client_name:
                return player
        return None
    
    async def on_player_connect(self, player: Player):
        await self.send_broadcast(build_network_msg(player, MsgType.PLAYER_CONNECTED), player)
        await player.send(build_network_msg(None, MsgType.MAZE, self.stored_maze.get_matrix()))
        for c in self.players:
            await player.send(build_network_msg(None, MsgType.PLAYER_CONNECTED, c.get_player_info()))
        self.players.append(player)
        print(f"{player.to_string()} connected to room {self.name}")

    async def on_client_disconnect(self, player: Player):
        if not player in self.players: return
        player.unsubscribe_receive(self.id)
        player.unsubscribe_disconnect(self.id)
        player.set_room(None)
        self.players.remove(player)
        print(f"{player.to_string()} disconnected from room {self.name}")
        if len(self.players) == 0:
            await self.parent_server.remove_room_by_id(self.id)
            return
        
        await self.send_broadcast(build_network_msg(player, MsgType.PLAYER_DISCONNECTED))
        try:
            await player.send(build_network_msg(None, MsgType.LEAVE_ROOM, None))
        except: pass
    
    async def on_receive_message(self, sender: Player, msg_str: str):
        if not sender in self.players: return
        req_type, req_data = parse_request(msg_str)
        if req_type:
            res_code, res_data = await self.fulfill_request(sender, req_type, req_data)
            if res_code == None: return
            await sender.send(build_response(res_code, req_type, res_data))

    async def fulfill_request(self, sender: Player, req_type: MsgType, req_data: dict | None) -> tuple[ResponseCode | None, dict | None]:
        bc_msg = self.generate_broadcast(req_type, req_data)
        if bc_msg:
            bc_type, bc_data, exclude_sender = bc_msg
            exclude = None
            if exclude_sender: exclude = sender
            asyncio.create_task(self.send_broadcast(build_network_msg(sender, bc_type, bc_data), exclude))

        match req_type:
            case MsgType.UPDATE_POS:
                self.update_pos(sender, req_data)
            case MsgType.SET_READY:
                self.set_ready(sender, req_data)
                return ResponseCode.SUCCESS, None
            case MsgType.LEAVE_ROOM:
                await self.on_client_disconnect(sender)
                return ResponseCode.SUCCESS, None
        return None, None

    def update_pos(self, sender: Player, pos: dict):
        if is_valid_position(pos):
            self.dirty_pos_dict[sender.name] = sender.position = Vector2(pos["x"], pos["y"])

    def set_ready(self, sender: ClientInfo, isReady: bool):
        if isinstance(isReady, bool):
            sender.isReady = isReady

    # generate a broadcast from an incoming message
    # returns: (bc_type, bc_data, exclude_sender) | None
    def generate_broadcast(self, req_type: MsgType, req_data: str | None) -> tuple[MsgType, str | None, bool] | None:
        match req_type:
            case MsgType.MAZE:
                self.stored_maze = req_data
                return MsgType.MAZE, self.stored_maze, True
            case MsgType.SET_READY:
                if isinstance(req_data, bool):
                    return MsgType.SET_READY, req_data, True
            case MsgType.LEAVE_ROOM:
                return MsgType.LEAVE_ROOM, None, True
            case _:
                return None

    async def send_broadcast(self, message: str, exclude: ClientInfo | None = None):
        if len(self.players) == 0:
            return

        send_tasks = [
            client.send(message)
            for client in self.players
            if (not exclude) or (client.name != exclude.name)
        ]

        await asyncio.gather(*send_tasks, return_exceptions=True)

    async def game_loop(self):
        while self.running:
            start = time.perf_counter()

            # send dirty positions
            if len(self.dirty_pos_dict):
                dirty_pos_msg = build_network_msg(None, MsgType.UPDATE_POS, self.dirty_pos_dict)
                await self.send_broadcast(dirty_pos_msg, None)
                self.dirty_pos_dict.clear()

            await asyncio.sleep(max(1. / GAME_LOOP_RATE - (time.perf_counter() - start), 0))

    # disconnect all players from the room
    async def close(self):
        for player in self.players:
            self.players.remove(player)
            try:
                await player.send(build_network_msg(None, MsgType.LEAVE_ROOM, None))
            except: pass
            self.parent_server.handle_client(ClientInfo(player.websocket, player.name))

ROOM_NAME_MAX_LEN = 20
ROOM_NAME_MIN_LEN = 3
def valid_room_name(name: str) -> bool:
    return ROOM_NAME_MIN_LEN <= len(name) <= ROOM_NAME_MAX_LEN

def valid_room_capacity(cap: int) -> bool:
    return cap >= ROOM_MIN_PLAYERS and cap <= ROOM_MAX_PLAYERS

PASSWORD_MAX_LENGTH = 16
def valid_room_password(password: str | None) -> bool:
    return password == None or len(password) <= PASSWORD_MAX_LENGTH
