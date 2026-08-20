# Checkmate

AI-powered interactive chess coaching — **Cursor for chess**.

Checkmate combines an interactive chessboard with Stockfish engine analysis and an AI coach that explains positions in plain language.

## Quick Start

### Prerequisites

- [Docker Engine](https://docs.docker.com/engine/install/) (not Docker Desktop)
- Docker Compose v2

#### Installing Docker (Ubuntu)

If you see `Command 'docker' not found`, install Docker first:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER
newgrp docker   # or log out and back in
docker --version
```

Then continue with the steps below.

### Run the application

1. Clone the repository:

   ```bash
   git clone <repo-url>
   cd checkmate
   ```

2. Create your environment file:

   ```bash
   cp .env.example .env
   ```

3. Add your OpenAI API key to `.env`:

   ```env
   OPENAI_API_KEY=sk-your-key-here
   ```

4. Start everything:

   ```bash
   docker compose up --build
   ```

5. Open the application:

   - **Frontend:** http://localhost:3000
   - **Backend API:** http://localhost:8000
   - **Health check:** http://localhost:8000/health

## Features (V1)

- Interactive chessboard with legal move enforcement
- Move history, undo, and reset
- Current turn indicator and FEN display
- Stockfish position analysis (evaluation, best move, principal variation)
- AI Coach chat with position-aware responses
- Full Docker Compose deployment

## Features (V1.1 — Chess.com Game Analysis)

- Left navigation: Play, Analyze, Openings (soon), Tactics (soon), Settings
- Import recent games from Chess.com by username (public API, no password)
- Remember usernames locally in the browser (localStorage)
- Browse imported games with metadata (date, opponent, result, time control, opening)
- Load a game onto the shared chessboard and step through moves
- AI Coach receives full PGN + current position when reviewing imported games

### Chess.com Analysis Flow

1. Go to **Analyze** in the sidebar
2. Enter a Chess.com username (or pick a remembered account)
3. Click **Import Games**
4. Select **Analyze Game** on any game
5. Step through moves with Back/Forward or click move history
6. Use Stockfish and the AI Coach on any position

## Architecture

```
checkmate/
├── frontend/          Next.js + React + chess.js + react-chessboard
├── backend/           FastAPI + Stockfish + OpenAI
└── docker-compose.yml
```

**Key principle:** Stockfish handles objective chess calculation. The LLM handles coaching and explanation. The API key never reaches the browser.

### API Endpoints

| Method | Path                 | Description                    |
|--------|----------------------|--------------------------------|
| GET    | `/health`            | Health check                   |
| POST   | `/api/chess/analyze` | Stockfish position analysis    |
| POST   | `/api/coach/chat`    | AI coaching chat               |
| GET    | `/api/chesscom/{username}/games` | Import Chess.com games |

## Environment Variables

| Variable         | Required | Default              | Description                |
|------------------|----------|----------------------|----------------------------|
| `OPENAI_API_KEY` | Yes*     | —                    | OpenAI API key (server-side only) |
| `OPENAI_MODEL`   | No       | `gpt-4o-mini`        | OpenAI model name          |
| `STOCKFISH_PATH` | No       | `/usr/games/stockfish` | Path to Stockfish binary |

\* Required for AI Coach chat. Engine analysis works without it.

## Running Tests

### Backend

```bash
cd backend
pip install -r requirements.txt
pytest -v
```

Requires Stockfish installed locally, or run tests inside the backend container:

```bash
docker compose run --rm backend pytest -v
```

### Frontend

```bash
cd frontend
npm install
npm test
```

## Local Development (without Docker)

### Backend

```bash
cd backend
pip install -r requirements.txt
# Install Stockfish: apt install stockfish (Debian/Ubuntu)
export OPENAI_API_KEY=sk-...
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
export NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

## Project Structure

```
checkmate/
├── frontend/
│   ├── src/
│   │   ├── app/              Next.js app router
│   │   ├── components/       UI components
│   │   ├── hooks/            Chess game & coach hooks
│   │   └── lib/              API client
│   ├── Dockerfile
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── api/              FastAPI routes
│   │   ├── chess/            FEN validation
│   │   ├── llm/              LLM provider abstraction
│   │   └── services/         Stockfish & coach services
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── docker-compose.yml
├── .env.example
└── README.md
```

## License

MIT
