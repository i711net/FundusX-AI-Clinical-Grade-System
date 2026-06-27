$ErrorActionPreference = "Stop"
uvicorn api_server.app:app --reload --host 0.0.0.0 --port 8000
