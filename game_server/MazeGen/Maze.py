from MazeGen.CellType import CellType
import numpy as np
from Structures.Vector2 import Vector2


# matrix of cells
class Maze:
    def __init__(self, matrix: list[list[CellType]]):
        height = len(matrix)
        width = len(matrix[0]) if height > 0 else 0
        if width <= 0 or height <= 0:
            raise ValueError(f"Grid constructor - width and height must be positive")
        self._width = width
        self._height = height
        self._matrix = [row[:] for row in matrix]
    
    @property
    def width(self) -> int:
        return self._width
    
    @property
    def height(self) -> int:
        return self._height

    def in_bounds(self, pos: Vector2) -> bool:
        return 0 <= pos.x < self.width and 0 <= pos.y < self.height

    # Get the CellType of a cell in the grid.
    # If the cell index is outside the bounds of the grid, returns CellType.Wall
    def get_cell_safe(self, pos: Vector2) -> CellType:
        return self.get_cell(pos) if self.in_bounds(pos) else CellType.Wall
    
    def get_cell(self, pos: Vector2) -> CellType:
        return self._matrix[int(pos.y)][int(pos.x)]

    def set_cell(self, pos: Vector2, cellType: CellType):
        if self.in_bounds(pos):
            self._matrix[int(pos.y)][int(pos.x)] = cellType

    def create_duplicate_mat(self) -> list[list[CellType]]:
        return [row[:] for row in self._matrix]

    # get a position's neighbors on the grid (+-2, +-2)
    def get_neighbors(self, pos: Vector2) -> list[Vector2]:
        upRow = pos.y - 2;
        rightCol = pos.x + 2;
        downRow = pos.y + 2;
        leftCol = pos.x - 2;

        neighbors = [
            Vector2(pos.x, upRow),
            Vector2(rightCol, pos.y),
            Vector2(pos.x, downRow),
            Vector2(leftCol, pos.y)
        ]

        return [p for p in neighbors if self.in_bounds(p)]

    # get the matrix of cells of this maze
    def get_matrix(self) -> list[list[int]]:
        return [[val.value for val in row] for row in self._matrix]


