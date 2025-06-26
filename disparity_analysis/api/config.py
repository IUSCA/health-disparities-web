import os

DATABASE_URL = os.environ.get("DATABASE_URL")
DEBUG = os.environ.get("DEBUG", "True").lower() in ("true", "1", "yes")
