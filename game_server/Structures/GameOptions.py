from enum import Enum
from types import SimpleNamespace

class MazeDifficulty(Enum):
    Easy = "EASY"
    Medium = "MEDIUM"
    Hard = "HARD"

class GameOptions:
    difficulty: MazeDifficulty = MazeDifficulty.Medium

    def __init__(self):
        pass

    def get_options(self) -> dict:
        return {
            "difficulty": self.difficulty.value
        }
    
    def load_game_options(self, opts: any) -> bool:
        maze_difficulty = opts["difficulty"]
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
            width = height = 18
            pass
        case MazeDifficulty.Hard:
            width = height = 24
            pass

    return {
        "width": width,
        "height": height
    }
