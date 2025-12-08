import websockets
from enum import Enum
import json

from ClientInfo import ClientInfo

# message structure:
"""
Message Structure
    - To Server:
        {
            msgType: str
            data: str | None
        }

    - From Server:
        {
            msgType: str
            source: str
            data: str | None
        }
"""

IP_ADDR = "127.0.0.1"
PORT = 3003

def get_addr_str(remote_addr: tuple[str, int]) -> str:
    return remote_addr[0] + ":" + str(remote_addr[1])

class MsgType(Enum):
    CONNECT_REQUEST = "connect_request"
    MAZE = "maze"
    UPDATE_POS = "update_pos"
    SET_NAME = "set_name"
    
    ACCEPT_CONNECTION = "accept_connection"
    ERR_NAME_TAKEN = "err_name_taken"
    PLAYER_CONNECTED = "player_connected"
    PLAYER_DISCONNECTED = "player_disconnected"


INCLUDE_DATA_MSG_TYPES: list[MsgType] = [MsgType.CONNECT_REQUEST, MsgType.UPDATE_POS, MsgType.MAZE, MsgType.UPDATE_POS, MsgType.SET_NAME]

# Returns - req_type, req_data
# or - None, None
# when the request is invalid
def parse_request(request_str: str) -> tuple[MsgType | None, str | None]:
    try:
        json_msg = json.loads(request_str)
        req_type = MsgType(json_msg["msgType"])
        req_data = None
    
        if req_type in INCLUDE_DATA_MSG_TYPES:
            req_data = json_msg["data"]
        
        return req_type, req_data
    except Exception as e:
        print("exception:", e)
        return None, None


def build_broadcast_msg(source: ClientInfo, bc_type: MsgType, bc_data: str | None = None) -> str:
    bc_dict = {
        "msgType": bc_type.value,
        "source": source.name
    }
    if bc_data:
        bc_dict["data"] = bc_data
    
    return json.dumps(bc_dict)


