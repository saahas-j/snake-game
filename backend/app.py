from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import pathlib

app = FastAPI()

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

# Mount static frontend directory
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/")
async def index():
    index_file = FRONTEND_DIR / "index.html"
    return FileResponse(index_file)


@app.get("/health")
async def health():
    return {"status": "ok"}
