import sqlite3


class AccountData:
    username: str
    password: str
    games_played: int
    # created_at

    def __init__(self, username, password, games_played = 0):
        self.username = username
        self.password = password
        self.games_played = games_played

    def save(self, conn: sqlite3.Connection):
        with conn:
            conn.execute("""UPDATE accounts SET
                         games_played = ?
                         WHERE username = ?
                         """,
            (self.games_played, self.username))


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

