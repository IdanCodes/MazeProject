import websockets

class ClientInfo:
    def __init__(self, websocket: websockets.ServerConnection, name: str):
        self.websocket = websocket
        self.position = {
            "x": 0,
            "y": 0
        }
        self.name = name
        self.ready = False

    async def send(self, message: str):
        return await self.websocket.send(message)
    
    def to_string(self) -> str:
        return f"[{self.name} ({self.websocket.remote_address})]"
