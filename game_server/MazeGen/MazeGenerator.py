import numpy as np
from MazeGen.CellType import CellType
from MazeGen.Maze import Maze
from Structures.Vector2 import Vector2
from helpers import get_random_int


def recursiveDFS(maze: Maze, pos: Vector2) -> None:
    maze.set_cell(pos, CellType.Passage) # assume pos is a valid position

    neighbors = maze.get_neighbors(pos)
    while len(neighbors) != 0:
        index = get_random_int(0, len(neighbors))
        neighborPos = neighbors[index]
        neighbors.remove(neighborPos)
        if maze.get_cell(neighborPos) != CellType.Wall: continue

        bridgePos: Vector2 = Vector2(
            (pos.x + neighborPos.x) / 2,
            (pos.y + neighborPos.y) / 2
        );

        maze.set_cell(bridgePos, CellType.Passage)
        recursiveDFS(maze, neighborPos)


def generateDFSRectMaze(width: int, height: int) -> Maze:
    # force height and width to be odd in order for the maze to be possible
    grid = np.full((height | 1, width | 1), CellType.Wall)
    maze = Maze(grid)
    recursiveDFS(maze, Vector2(0, 0))
    return maze