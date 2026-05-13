from dataclasses import dataclass

@dataclass
class Vector2:
    x: float
    y: float

def vector2_to_dict(vec: Vector2) -> dict:
    return {
        "x": vec.x,
        "y": vec.y
    }

# Throws if source is not a valid Vector2
def load_vector2(source: dict) -> Vector2:
    return Vector2(x=float(source["x"]), y=float(source["y"]))
        