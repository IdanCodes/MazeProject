from __future__ import annotations
from enum import Enum
from typing import TYPE_CHECKING, Callable
from uuid import UUID
from ClientInfo import ClientInfo
from Structures.Vector2 import Vector2

if TYPE_CHECKING:
    from GameRoom import GameRoom

class RoomClientRole(Enum):
    ADMIN = 0
    PLAYER = 1
    SPECTATOR = 2

class Player:
    def __init__(self, client_info: ClientInfo, role: RoomClientRole):
        self.client_info = client_info
        self.role = role
        self.position = Vector2(0, 0)
        self.isReady = False

    def send(self, message: str):
        return self.client_info.send(message)

    # callback(Player, msg)
    def on_receive(self, cb_id: UUID | None, recv_cb: Callable[[object, str], None]):
        return self.client_info.on_receive(cb_id, lambda _, msg: recv_cb(self, msg))
    
    def unsubscribe_receive(self, cb_id: UUID | None) -> bool:
        return self.client_info.unsubscribe_receive(cb_id)
    
    # callback(Player)
    def on_disconnect(self, cb_id: UUID | None, disconnect_cb: Callable[[object], None]):
        return self.client_info.on_disconnect(cb_id, lambda _: disconnect_cb(self))
    
    def unsubscribe_disconnect(self, cb_id: UUID | None) -> bool:
        return self.client_info.unsubscribe_disconnect(cb_id)

    def set_room(self, room: GameRoom):
        self.client_info.set_room(room)

    @property
    def websocket(self):
        return self.client_info.websocket

    @property
    def name(self):
        return self.client_info.name

    def to_string(self) -> str:
        return self.client_info.to_string()

    def in_room(self, room: GameRoom | None) -> bool:
        return self.client_info.in_room(room)

    def get_player_info(self) -> dict:
        return {
            "name": self.name,
            "role": self.role.value,
            "position": self.position.__dict__,
            "isReady": self.isReady,
        }