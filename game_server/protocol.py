from __future__ import annotations
from enum import Enum
import json
from typing import TYPE_CHECKING
from helpers import is_number
from Structures.Vector2 import Vector2

if TYPE_CHECKING:
    from ClientInfo import ClientInfo

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Vector2):
            return {"x": obj.x, "y": obj.y}
        return super().default(obj)

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
SOCK_RECV_CHUNK_SIZE = 1024
NETWORK_ENCODING = "utf-8"
MESSAGE_DELIMITER = '\n'

SERVER_NAME = "SERVER"

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
    SET_READY = "set_ready"

    ROOMS_LIST = "rooms_list" # params: count?: int -> list[room]
    CREATE_ROOM = "create_room" # params: { name: string, capacity: int, password: string }
    JOIN_ROOM = "join_room" # params: { room_id: number, password: str| None }
    LEAVE_ROOM = "leave_room" # params: { room_id: number }

    RESPONSE = "response" # data = { code: ResponseType, response_to: MsgType, data: dict | None }

class ResponseCode(Enum):
    ERROR = 0
    SUCCESS = 1


# Returns - req_type, req_data
# or - None, None
# when the request is invalid
def parse_request(request_str: str) -> tuple[MsgType | None, str | None]:
    if len(request_str) == 0: return None, None

    try:
        json_msg = json.loads(request_str)
        req_type = MsgType(json_msg["msgType"])
        req_data = None
    
        try: req_data = json_msg["data"]
        except: pass

        return req_type, req_data
    except Exception as e:
        print(f"parsing request {request_str} exception: {e}")
        return None, None


# source = None -> source="SERVER"
def build_network_msg(source: ClientInfo | None, msg_type: MsgType, bc_data: str | None = None) -> str:
    bc_dict = {
        "msgType": msg_type.value,
        "source": SERVER_NAME
    }

    if source:
        bc_dict["source"] = source.name
    if bc_data != None:
        bc_dict["data"] = bc_data
    
    return json.dumps(bc_dict, cls=CustomJSONEncoder)

def build_response(response_code: ResponseCode, response_to: MsgType, data: object | None = None) -> str:
    response_data = {
        "code": response_code.value,
        "responseTo": response_to.value,
    }
    if data != None:
        response_data["data"] = data
    
    return build_network_msg(None, MsgType.RESPONSE, response_data)

def build_success_msg(response_to: MsgType, data: object | None = None) -> str:
    return build_response(ResponseCode.SUCCESS, response_to, data)

def build_error_msg(response_to: MsgType, data: object | None = None) -> str:
    return build_response(ResponseCode.ERROR, response_to, data)

def build_error_obj(error: str) -> dict:
    return {
        "error": error
    }

def is_valid_position(pos_dict: dict) -> bool:
    return ("x" in pos_dict) and ("y" in pos_dict) and is_number(pos_dict["x"]) and is_number(pos_dict["y"])
