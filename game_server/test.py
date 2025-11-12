from enum import Enum, StrEnum
import json
from typing import TypedDict

class TestEnum(Enum):
    A = "red"
    B = "blue"
    C = "c"

# print(TestEnum.A) # TestEnum.A
# print(TestEnum.A.name) # A
# print(TestEnum.A.value) # red

myVal = TestEnum.A
# print(myVal.name)

myobj = {
    "a": "red",
    "b": "blue"
}

# print(TestEnum("red"))

# print(myobj["a"])
# print("c" in myobj)

class Message(TypedDict):
    msgType: str
    source: str
    data: str | None

myobj = {
    "msgType": "maze",
    "source": "localhost",
    "data": None
}

msg_keys = myobj.keys()
# print("data" in myobj)

def my_func(x: bool) -> tuple[str, str] | None:
    if x: return "x1", "x2"
    else: return None

# a, b = my_func(False)
# print(f"a: {a}, b: {b}")

request_str = "{\"msgType\":\"update_pos\",\"data\":{\"x\":10.526315789473685,\"y\":10.526315789473685}}"
json_msg = json.loads(request_str)
print(type(json_msg))
