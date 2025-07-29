# Project Name

API server for the project.

```
poetry install --no-root
poetry run dev
```

generate the spec

```
pyinstaller --name my_api_server --onefile api/main.py
```

build executable

```
poetry shell
pyinstaller my_api_server.spec
```

Run the executable

```
./dist/my_api_server
```

## Using [dbmate](https://github.com/amacneil/dbmate)

After cloning the repo, you can run `dbmate` commands by using the provided `dbmate` shortcut.

1. Make sure the `dbmate` script has executable permissions:
   ```bash
   chmod +x dbmate
   ```

2. Run `dbmate` commands:
   ```bash
   ./dbmate --help
   ```

```
python -m api.db.load /Users/deduggi/Documents/SCA/health_disparity/data
```

## Sqlite3

Statistics: `sqlite3_analyzer db/database.sqlite3 > db_stats.txt`


## Load Data
```bash
docker compose run --rm  -v /path/to/data:/app/data --entrypoint python api -m api.db.load
```