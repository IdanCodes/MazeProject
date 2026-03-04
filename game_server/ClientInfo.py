import websockets

class ClientInfo:
    def __init__(self, websocket: websockets.ServerConnection, name: str):
        self.websocket = websocket
        self.name = name

    async def send(self, message: str):
        return await self.websocket.send(message)
    
    def to_string(self) -> str:
        return f"[{self.name} ({self.websocket.remote_address})]"
    
    # { name, position, isReady }
    def get_player_info(self) -> dict:
        return {
            "name": self.name,
            "position": self.position,
            "isReady": self.isReady
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