# Opening Lab V1 — Implementation Status (Prototype)

| Phase | Status |
|-------|--------|
| Product spec | `opening-lab-v1.md` |
| Technical spec | `../technical/opening-lab-v1.md` |
| Prototype code | **Shipped** |

## Delivered in prototype

- SQLite repertoires, lines, plies, explanations
- REST API under `/api/openings`
- Pydantic-validated LLM batch Learn generation + fallback
- Frontend: `/openings`, repertoire detail, line workspace
- Modes: Explore (edit/save), Learn (panel + generate), Practice, Stress test
- Training state separate from saved line (no silent overwrite)
- Sidebar Openings enabled

## Not yet (follow-up slices)

- PGN import for lines
- Practice plan text field
- E2E tests
- README API table update
- Spaced repetition / analytics

## Verify

```bash
docker compose run --rm --no-deps backend pytest tests/test_opening_lab.py -v
cd frontend && npm test
docker compose up --build
```

Open http://localhost:3000/openings
