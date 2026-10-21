# Opening Lab V1 — Technical Specification (Prototype)

| Status | Implemented with prototype |
|--------|----------------------------|
| Product spec | `specs/product/opening-lab-v1.md` |

## Data model (SQLite)

- `opening_repertoires` — id, name, color (`white`|`black`), timestamps
- `opening_lines` — id, repertoire_id, name, practice stats, timestamps
- `opening_plies` — line_id, ply_index (1..N), san, uci, fen_after, is_key_position
- `opening_explanations` — line_id, ply_index, structured Learn fields, content_version, generated_at

Schema appended in `backend/app/db/database.py` via `OPENING_LAB_SCHEMA`.

## API (`/api/openings`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/repertoires` | List repertoires |
| POST | `/repertoires` | Create |
| GET/PATCH/DELETE | `/repertoires/{id}` | CRUD |
| GET | `/repertoires/{id}/lines` | List lines |
| POST | `/repertoires/{id}/lines` | Create line |
| GET | `/lines/{line_id}` | Line + plies + explanations |
| PATCH | `/lines/{line_id}` | Rename, practice stats |
| DELETE | `/lines/{line_id}` | Delete line |
| PUT | `/lines/{line_id}/moves` | Replace move sequence (validated) |
| PATCH | `/lines/{line_id}/plies/{ply}/key` | Toggle key position |
| POST | `/lines/{line_id}/generate-explanations` | Batch LLM (teaching plies) |

## Frontend state

- **Saved line:** loaded from API; mutated only via explicit save (Explore + Edit).
- **Browse ply:** `currentMoveIndex` on loaded moves (read-only navigation).
- **Training session:** separate move list for Practice / Stress (never PUT to API unless user saves in Explore).

## LLM

- `OpeningCoachGenerator` — Pydantic `LearnExplanationOutput`, batch prompt, JSON parse + fallback template.

## Routes

- `/openings` — home
- `/openings/[repertoireId]` — repertoire detail + lines
- `/openings/[repertoireId]/lines/[lineId]` — line workspace (modes)
