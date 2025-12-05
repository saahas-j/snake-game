Snake Game (Client-Authoritative, Single-Player)

Overview
- Client-authoritative single-player snake game.
- Frontend: ES6 JavaScript using Canvas API (100x100 grid, 8px cells -> 800x800 canvas).
- Backend: minimal FastAPI app that serves static files.
- High scores are saved strictly in browser `localStorage` under `snake.highscore`.

Setup (Windows, bash)

1. Create Python 3.12 virtual environment (ensure Python 3.12 is installed and on PATH):

```bash
python3.12 -m venv .venv
source .venv/Scripts/activate
```

2. Install dependencies:

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

3. Run dev server:

```bash
uvicorn backend.app:app --reload --host 127.0.0.1 --port 8000
```

4. Open `http://127.0.0.1:8000` in your browser.

Gameplay
