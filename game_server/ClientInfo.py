import asyncio
from typing import Callable

import websockets

class ClientInfo:
    def __init__(self, websocket: websockets.ServerConnection, name: str):
        self.websocket = websocket
        self.name = name
        self.on_recv_cb = []
        self.on_disconnect_cb = []
        self.is_receiving = False
        self.curr_room = None # None -> lobby

    def start_recv(self):
        if self.is_receiving: return
        self.is_receiving = True
        asyncio.create_task(self.receive_loop())

    async def send(self, message: str):
        return await self.websocket.send(message)
    
    # callback: (client: ClientInfo, msg_str: string)
    def on_receive(self, recv_cb: Callable[[object, str], None], disconnect_cb: Callable[[object], None]):
        self.on_recv_cb.append(recv_cb)
        self.on_disconnect_cb.append(disconnect_cb)

    async def receive_loop(self):
        try:
            async for msg in self.websocket:
                await self.call_recv_callbacks(msg)
        except Exception as e:
            print(f"Exception occurred while receiving for client {self.to_string()}:", e)
        finally:
            await self.call_disconnect_callbacks()

    async def call_recv_callbacks(self, msg: str):
        for cb in self.on_recv_cb:
            asyncio.create_task(cb(self, msg))

    async def call_disconnect_callbacks(self):
        for cb in self.on_disconnect_cb:
            asyncio.create_task(cb(self))
        await self.websocket.close()

    def to_string(self) -> str:
        return f"[{self.name} ({self.websocket.remote_address})]"
    
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