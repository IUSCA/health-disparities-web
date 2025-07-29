from pathlib import Path

DATABASE_PATH = (Path(__file__).parent.parent / 'db' / 'database.sqlite3').resolve()
DEBUG = True
JWT_PUBLIC_KEY_PATH = (Path(__file__).parent.parent / 'keys' / 'auth.pub').resolve()
