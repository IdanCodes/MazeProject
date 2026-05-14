from enum import Enum

class MazeDifficulty(Enum):
    Easy = "EASY"
    Medium = "MEDIUM"
    Hard = "HARD"

class GameOptions:
    difficulty: MazeDifficulty = MazeDifficulty.Medium

    def __init__(self):
        pass

    def get_json(self) -> dict:
        return {
            "difficulty": self.difficulty.value
        }
    
    def load_game_options(self, opts: any) -> bool:
        maze_difficulty = None
        try:
            maze_difficulty = opts["difficulty"]
        except: return False
        if not is_valid_maze_difficulty(maze_difficulty):
            return False
        
        # set difficulty
        self.difficulty = MazeDifficulty(maze_difficulty)
        return True


def is_valid_maze_difficulty(diff: any) -> bool:
    try:
        MazeDifficulty(diff)
        return True
    except: return False


def difficultyToDims(diff: MazeDifficulty) -> dict:
    width = -1
    height = -1
    match (diff):
        case MazeDifficulty.Easy:
            width = height = 13
            pass
        case MazeDifficulty.Medium:
            width = height = 20
            pass
        case MazeDifficulty.Hard:
            width = height = 28
            pass

    return {
        "width": width,
        "height": height
    }
