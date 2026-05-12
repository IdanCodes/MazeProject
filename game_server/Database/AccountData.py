import json
import sqlite3

class AccountData:
    account_id: int
    username: str
    password: str
    games_played: list[str]
    # created_at

    def __init__(self, conn: sqlite3.Connection, account_id, username, password, games_played = None):
        self.conn = conn
        self.account_id = account_id
        self.username = username
        self.password = password
        self.games_played = games_played if games_played != None else []

    def from_row(conn: sqlite3.Connection, row: list):
        return AccountData(conn, row[0], row[1], row[2], json.loads(row[3]))

    def save(self):
        games_json = json.dumps(self.games_played)
        with self.conn:
            self.conn.execute("""UPDATE accounts SET
                              username = ?,
                              password = ?,
                              games_played = ?
                              WHERE account_id = ?
                         """,
            (self.username, self.password, games_json, self.account_id))

    # Registers the finished game and updates the database
    def register_finish_game(self, game_id_str: str):
        if game_id_str in self.games_played: return
        self.games_played.append(game_id_str)
        games_json = json.dumps(self.games_played)

        with self.conn:
            self.conn.execute("""UPDATE accounts SET
                              games_played = ?
                              WHERE account_id = ?""", (games_json, self.account_id))


MIN_USERNAME_LEN = 3
MAX_USERNAME_LEN = 16
def get_username_error(username: str) -> str | None:
    if len(username) < MIN_USERNAME_LEN:
        return f"Username must be at least {MIN_USERNAME_LEN} characters long"
    elif len(username) > MAX_USERNAME_LEN:
        return f"Username must be at most {MAX_USERNAME_LEN} characters long"
    elif not username.isalnum():
        return f"Username must to be alpha-numeric"
    elif username[0].isdigit():
        return f"Username can't start with a number"
    
    return None

MIN_PASSWORD_LEN = 4
MAX_PASSWORD_LEN = 16
def get_password_error(password: str) -> str | None:
    if len(password) < MIN_PASSWORD_LEN:
        return f"Password must be at least {MIN_PASSWORD_LEN} characters long"
    elif len(password) > MAX_PASSWORD_LEN:
        return f"Password must be at most {MAX_PASSWORD_LEN} characters long"
    
    return None

def get_credentials_error(username: str, password: str) -> str | None:
    error = get_username_error(username)
    if not error: error = get_password_error(password)
    return error

