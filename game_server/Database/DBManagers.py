from Database.AccountsManager import AccountsManager
from Database.GameDataDB import GameDataDB

DATABASE_FILE = "database.db"
accounts_manager = AccountsManager(DATABASE_FILE)
games_manager = GameDataDB(DATABASE_FILE)
