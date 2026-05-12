import atexit
import sqlite3

from Database.AccountData import *

class AccountsManager:
    accounts: list[AccountData]

    def __init__(self, db_file: str):
        self.conn = sqlite3.connect(db_file, check_same_thread=False)
        atexit.register(self.close)

        with self.conn:
            self.conn.execute('''CREATE TABLE IF NOT EXISTS accounts (
                            account_id INTEGER PRIMARY KEY AUTOINCREMENT,
                            username TEXT UNIQUE NOT NULL,
                            password TEXT NOT NULL,
                            games_played TEXT DEFAULT '[]');''')

    def close(self):
        self.conn.close()

    def get_cursor(self) -> sqlite3.Cursor:
        return self.conn.cursor()
    
    # Save an account in the database
    def save_account(self, acc_data: AccountData):
        return acc_data.save(self.conn)

    def get_account_data_by_id(self, account_id: int):
        cursor = self.conn.execute("SELECT account_id, username, password, games_played FROM accounts WHERE account_id = ?", (account_id,))
        row = cursor.fetchone()
        if row:
            return AccountData.from_row(self.conn, row)
        return None

    def get_account_data_by_username(self, username: str) -> AccountData | None:
        cursor = self.conn.execute("SELECT account_id, username, password, games_played FROM accounts WHERE username = ?", (username,))
        row = cursor.fetchone()
        return AccountData.from_row(self.conn, row) if row else None

    # returns whether the sign up was successful
    def sign_up(self, username: str, password: str) -> AccountData | None:
        if self.does_user_exist(username): return False

        # TODO: hash password
        hashed_password = password
        
        new_account = AccountData(self.conn, username, password)
        try:
            with self.conn:
                self.conn.execute('''INSERT INTO accounts (username, password) VALUES (?, ?)''', (username, hashed_password))
            return new_account
        except Exception as e:
            print(f"User creation failed for {username}:", e)
            return None
        
    # log in
    def authenticate_user(self, username: str, password: str) -> AccountData | None:
        acc_data = self.get_account_data_by_username(username)
        # TODO: Hash Password
        if not acc_data or acc_data.password != password: return None
        return acc_data
    
    # Does a user with this username exist?
    def does_user_exist(self, username: str) -> bool:
        cursor = self.conn.execute("""SELECT EXISTS(SELECT 1 FROM accounts WHERE username = ?)""", (username,))
        row = cursor.fetchone()
        return bool(row[0])

