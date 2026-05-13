import atexit
import sqlite3
from Database.GameData import GameData


class GameDataDB:
    past_games: list[GameData]

    def __init__(self, db_file: str):
        self.conn = sqlite3.connect(db_file, check_same_thread=False)
        atexit.register(self.close)

        with self.conn:
            # game_options, maze_data, game_results stored as json string
            self.conn.execute('''CREATE TABLE IF NOT EXISTS games (
                              game_id TEXT PRIMARY KEY,
                              room_name TEXT NOT NULL,
                              create_time INTEGER NOT NULL,
                              game_options TEXT,
                              start_time INTEGER,
                              maze_data TEXT,
                              game_results TEXT)''')

    def close(self):
        self.conn.close()

    def get_game_by_id(self, game_id_str: str) -> GameData | None:
        cursor = self.conn.execute("""SELECT
                                   game_id, room_name, create_time, game_options, start_time, maze_data, game_results
                                   FROM games WHERE game_id = ?""",
                                   (game_id_str,))
        row = cursor.fetchone()
        return GameData.from_row(row) if row else None

    def save_game(self, data: GameData):
        game_id_str, room_name, create_time, options_str, start_time, maze_data_str, results_str = data.serialize()
        with self.conn:
            if self.get_game_by_id(data.game_id_str) != None:
                self.conn.execute("""UPDATE games SET
                                  room_name = ?,
                                  create_time = ?,
                                  game_options = ?,
                                  start_time = ?,
                                  maze_data = ?,
                                  game_results = ?
                                  WHERE game_id = ?""",
                                  (room_name, create_time, options_str, start_time, maze_data_str, results_str, game_id_str))
            else:
                self.conn.execute("""INSERT INTO games
                                  (game_id, room_name, create_time, game_options, start_time, maze_data, game_results)
                                  VALUES (?, ?, ?, ?, ?, ?, ?)""",
                                  (game_id_str, room_name, create_time, options_str, start_time, maze_data_str, results_str))