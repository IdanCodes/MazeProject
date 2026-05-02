from types import SimpleNamespace


DEFAULT_MAZE_DIMENSIONS = {
    "width": 12,
    "height": 12
}
class GameOptions:
    maze_dimensions: dict = DEFAULT_MAZE_DIMENSIONS
    # TODO: add time limit

    def __init__(self):
        pass

    # get a json representation of the options
    def get_options(self) -> dict:
        return {
            "mazeDimensions": self.maze_dimensions
        }
    
    # Loads game options
    def load_game_options(self, opts) -> bool:
        if not(type(opts) is dict): return
        # Step 1 - get new values
        dims = self.maze_dimensions
        try:
            dims = opts["mazeDimensions"]
            if not is_valid_maze_dimensions(dims):
                return False
        except:
            return False
        
        # Step 2 - set new values:
        self.set_maze_dimensions(dims)
        
        return True

    # new_dims: { "width": number, "height": number }
    # returns whether setting the dimensions was successful (dimensions were valid)
    def set_maze_dimensions(self, new_dims: dict) -> bool:
        if not is_valid_maze_dimensions():
            return False

        self.maze_dimensions["width"] = new_dims["width"]
        self.maze_dimensions["height"] = new_dims["height"]
        return True


# dims: {"width": number "height": number}
def is_valid_maze_dimensions(dims: dict) -> bool:
    MIN_MAZE_W = 5
    MIN_MAZE_H = 5
    MAX_MAZE_W = 25
    MAX_MAZE_H = 25
    w = h = None
    try:
        w = dims["width"]
        h = dims["height"]
    except: return False
    return (type(w) is int) and (type(h) is int) and (MIN_MAZE_W <= w <= MAX_MAZE_W) and (MIN_MAZE_H <= h <= MAX_MAZE_H)

