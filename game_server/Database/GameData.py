from __future__ import annotations
import json
from typing import TypedDict
import uuid
from Structures.GameOptions import GameOptions

class GameResult(TypedDict):
    account_id: int
    time_ms: int

class GameData:
    game_id_str: str
    room_name: str
    create_time: int # in ms since epoch
    game_options: GameOptions
    start_time: int # start time in ms since epoch
    game_results: list[GameResult]

    def __init__(self, game_id_str: str, room_name: str, create_time: int, game_options: GameOptions, start_time: int = -1, game_results: list[GameResult] | None = None):
        self.game_id_str = game_id_str
        self.room_name = room_name
        self.create_time = create_time
        self.game_options = game_options if game_options != None else GameOptions()
        self.start_time = start_time
        self.game_results = game_results if game_results != None else []

    @property
    def game_id(self) -> uuid.UUID:
        return uuid.UUID(self.game_id_str)
    
    def serialize(self) -> tuple:
        options_str = json.dumps(self.game_options.get_json())
        results_str = json.dumps(self.game_results)
        return (self.game_id_str, self.room_name, self.create_time, options_str, self.start_time, results_str)
    
    # Returns none if the row's json is corrupted
    def from_row(row) -> GameData | None:
        game_id_str = row[0]
        room_name = row[1]
        create_time  = row[2]
        options_str = row[3]
        start_time = row[4]
        results_str = row[5]
        try:
            game_options = GameOptions.load_game_options(json.loads(options_str))
            game_results = json.loads(results_str)
            return GameData(game_id_str, room_name, create_time, game_options, start_time, game_results)
        except:
            return None
