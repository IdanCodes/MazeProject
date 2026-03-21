from __future__ import annotations
import asyncio
from typing import TYPE_CHECKING, Callable
from uuid import UUID
import websockets
from EventBus import EventBus

if TYPE_CHECKING:
    from GameRoom import GameRoom

RECV_EVENT_NAME = "data_received"
DISCONNECT_EVENT_NAME = "disconnected"
class ClientInfo:
    def __init__(self, websocket: websockets.ServerConnection, name: str):
        self.websocket = websocket
        self.name = name
        self.event_bus = EventBus()
        self.is_receiving = False
        self.curr_room = None # None -> lobby

    def start_recv(self):
        if self.is_receiving: return
        self.is_receiving = True
        asyncio.create_task(self.receive_loop())

    async def send(self, message: str):
        return await self.websocket.send(message)

    def on_receive(self, cb_id: UUID | None, recv_cb: Callable[[object, str], None]):
        return self.event_bus.subscribe(RECV_EVENT_NAME, cb_id, recv_cb)
    
    def unsubscribe_receive(self, cb_id: UUID | None) -> bool:
        return self.event_bus.unsubscribe(RECV_EVENT_NAME, cb_id)
    
    def on_disconnect(self, cb_id: UUID | None, disconnect_cb: Callable[[object], None]):
        return self.event_bus.subscribe(DISCONNECT_EVENT_NAME, cb_id, disconnect_cb)
    
    def unsubscribe_disconnect(self, cb_id: UUID | None) -> bool:
        return self.event_bus.unsubscribe(DISCONNECT_EVENT_NAME, cb_id)

    async def receive_loop(self):
        try:
            async for msg in self.websocket:
                await self.emit_recv(msg)
        except Exception as e:
            print(f"Exception occurred while receiving for client {self.to_string()}:", e)
        finally:
            await self.emit_disconnect()
            await self.websocket.close()

    async def emit_recv(self, msg):
        await self.event_bus.emit(RECV_EVENT_NAME, self, msg)

    async def emit_disconnect(self):
        await self.event_bus.emit(DISCONNECT_EVENT_NAME, self)

    def to_string(self) -> str:
        return f"[{self.name} ({self.websocket.remote_address})]"
    
    def in_room(self, room: GameRoom | None) -> bool:
        if self.in_lobby: return room == None
        return False if room == None else self.room.id == room.id

    # is the client in the lobby?
    @property
    def in_lobby(self) -> bool:
        return self.curr_room == None
    
    # set which room the client is currently in
    # None -> lobby
    def set_room(self, room: GameRoom | None):
        self.curr_room = None if room == None else room.id

    # { name }
    def get_client_info(self) -> dict:
        return {
            "name": self.name,
        }

MIN_NAME_LEN = 3
MAX_NAME_LEN = 16
def get_username_error(name: str) -> str | None:
    if len(name) == 0: return ""
    elif len(name) < MIN_NAME_LEN:
        return f"Name must be at least ${MIN_NAME_LEN} characters long";
    elif len(name) > MAX_NAME_LEN:
        return f"Name must be at most ${MAX_NAME_LEN} characters long";
    elif not name.isalnum():
        return f"Name must to be alpha-numeric"
    elif name[0].isdigit():
        return f"Name can't start with a number"
    
    return None