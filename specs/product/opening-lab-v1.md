# Opening Lab V1 — Product Specification

| Field | Value |
|-------|--------|
| Status | Prototype implemented — see `opening-lab-implementation-status.md` |
| Version | 1.0 |
| Last updated | 2026-10-20 |
| Depends on | Checkmate core (Play, Analyze, game analysis) |
| Implementation | Prototype shipped (V1 slice) |

---

## 1. Problem Statement

Many club and improving players memorize opening moves without understanding why those moves work. They forget lines under time pressure, panic when opponents deviate, and cannot connect opening moves to middlegame plans.

Checkmate already helps players **review finished games** with engine-backed facts and AI coaching. Opening Lab addresses the **preparation gap**: helping players build a repertoire they understand, remember, and can use confidently at the board.

**Central principle:** Don't memorize the move. Understand why the move makes sense.

---

## 2. Target Users

### Primary

- **Improving club players** (~1000–1800) building or refining their first serious repertoire.
- **Returning players** who know some opening names but not the ideas behind their moves.

### Secondary

- **Coaches or study partners** using Checkmate locally to walk through lines (single deployment; no multi-user product in V1).

### Out of scope for V1 personas

- Professional preparation against named opponents.
- Children-only UX (keep general Checkmate tone; no separate kid mode).

---

## 3. Product Principles

1. **Engine facts, coach meaning** — Stockfish (and deterministic chess logic) supply evaluations and legal moves; the LLM explains ideas, plans, and memory hooks. The LLM must not invent evaluations or illegal moves.
2. **User repertoire is the content** — V1 is not an opening encyclopedia. The player's saved lines are the source of truth.
3. **Teach at meaningful moments** — Do not generate long explanations for every ply by default.
4. **Separate saved repertoire from training** — Exploring, practicing, or stress-testing must never silently overwrite saved repertoire moves.
5. **Reuse Checkmate** — Same board, navigation, visual design, and backend patterns as Play and Game Analysis where possible.
6. **Generate once, reuse** — Persist AI explanations for repertoire positions; reopening a line should not automatically trigger new LLM calls.
7. **Honest coaching** — Non-repertoire moves are not automatically wrong; acknowledge reasonable alternatives when supported by engine or sound chess logic.
8. **Concise by default, depth on demand** — Progressive disclosure in the UI; avoid wall-of-text panels.

---

## 4. Use Cases (Summary)

| ID | Use case |
|----|----------|
| UC-01 | Create a named repertoire for White or Black. |
| UC-02 | Add and edit a line by playing moves on the board. |
| UC-03 | Navigate a saved line and review move sequences. |
| UC-04 | Learn why key repertoire moves matter (coach cards). |
| UC-05 | Practice recalling moves and plans from a position. |
| UC-06 | Stress-test reasoning when the opponent deviates from the line. |
| UC-07 | Return later and continue where left off (persisted repertoire + saved explanations). |

---

## 5. User Journeys

### 5.1 First-time entry

1. User opens **Openings** in the sidebar (enabled when feature ships).
2. Sees empty state: brief explanation + **Create repertoire**.
3. Chooses color (White / Black), names repertoire, lands in **Explore** with empty board.

### 5.2 Build a line

1. User plays moves on the board (legal moves only).
2. Move list updates; user can step back/forward within the line being built.
3. User saves line (name required, e.g. "vs 1...e5 main line").
4. Repertoire and line persist after refresh/restart (see §10 persistence default).

### 5.3 Learn a line

1. From repertoire, user opens a line in **Learn** mode.
2. User navigates to a position; for **teaching positions** (see OL-LEARN-003), coach card shows structured teaching content.
3. User can expand sections or open **AI Coach chat** for free-form questions (chat does not replace saved Learn content).
4. User optionally triggers **Generate explanations** for important positions (or batch during first setup).

### 5.4 Practice

1. User starts **Practice** on a line or subset of positions.
2. System shows a position **without** revealing the repertoire move (configurable: hide move only vs hide full card).
3. User states a plan (text) and/or plays a move on the board.
4. System compares to repertoire and optional engine data; gives constructive feedback.
5. Basic progress recorded (last practiced, attempt count) where feasible.

### 5.5 Stress test

1. User selects a line and a **branch point** (or system picks a deviation point).
2. Opponent plays a **non-repertoire move** (user-entered or selected from short list — not full engine opponent in V1).
3. User explains what changed and what they would play.
4. Coach responds with structured guidance and engine-backed comparison when available.

---

## 6. Functional Requirements

### 6.1 Repertoire management (`OL-REP-*`)

| ID | Requirement |
|----|-------------|
| OL-REP-001 | User can create a repertoire with a name and color (White or Black). |
| OL-REP-002 | User can list, rename, and delete repertoires. |
| OL-REP-003 | User can create one or more **lines** within a repertoire, each with a name. |
| OL-REP-004 | User can enter moves on the interactive board; only legal moves are accepted. |
| OL-REP-005 | User can navigate within a line (ply index) without changing saved moves unless explicitly editing. |
| OL-REP-006 | User can edit a line by truncating from a ply and playing new moves (explicit save). |
| OL-REP-007 | Each saved line stores move sequence (SAN), resulting FEN per ply, and metadata (created/updated). |
| OL-REP-008 | User can delete a line or an entire repertoire with confirmation. |
| OL-REP-009 | Repertoire data persists across browser refresh and application restart (per persistence model §10). |
| OL-REP-010 | V1 supports **linear lines** only (single main sequence per line record); transposition trees are out of scope. |

**Proposed default:** Multiple repertoires per deployment (e.g. "White — e4" and "Black — Sicilian"); multiple lines per repertoire.

### 6.2 Explore mode (`OL-EXP-*`)

| ID | Requirement |
|----|-------------|
| OL-EXP-001 | **Explore** is the default mode for viewing and editing repertoire lines. |
| OL-EXP-002 | Board shows current position; move list reflects saved line at current ply. |
| OL-EXP-003 | Editing moves requires explicit action (e.g. "Edit from here" + save); browsing alone does not mutate the line. |

### 6.3 Learn mode (`OL-LEARN-*`)

| ID | Requirement |
|----|-------------|
| OL-LEARN-001 | **Learn** mode displays contextual teaching for the selected position in a repertoire line. |
| OL-LEARN-002 | Teaching content is structured (when generated): **Why this move?**, **Strategic idea**, **Plan**, **What to watch for**, **Remember this**, optional **Try it yourself** prompt. |
| OL-LEARN-003 | Explanations are generated only for **teaching positions**: (a) user-marked "key position", (b) every repertoire move in lines ≤ 20 plies, (c) for longer lines, every move in first 12 plies plus user-marked nodes. |
| OL-LEARN-004 | User can mark/unmark a ply as a key teaching position. |
| OL-LEARN-005 | Saved explanations load from storage without LLM calls when content exists and is valid. |
| OL-LEARN-006 | User can request (re)generation for one position or for all teaching positions in a line (with confirmation and cost-aware messaging). |
| OL-LEARN-007 | Learn content is tied to `(line_id, ply_index)`; changing repertoire move at that ply invalidates stored explanation for that node. |
| OL-LEARN-008 | Learn panel is separate from AI Coach chat; chat may use saved Learn content as context but must not replace the Learn panel. |

### 6.4 Practice mode (`OL-PRACTICE-*`)

| ID | Requirement |
|----|-------------|
| OL-PRACTICE-001 | User can start a practice session from a line (from current ply or from start). |
| OL-PRACTICE-002 | Session can hide the repertoire move until the user attempts a move or submits a plan. |
| OL-PRACTICE-003 | User can type a short plan (optional field) before or after playing a move. |
| OL-PRACTICE-004 | System compares user's move to repertoire move at that ply (SAN match; optional normalization for check/mate notation). |
| OL-PRACTICE-005 | On mismatch, system may show engine best move and repertoire move with explanation if pre-generated or on-demand (on-demand LLM optional in V1 slice — see implementation plan). |
| OL-PRACTICE-006 | Reasonable alternative moves (engine within threshold or same strategic family) receive constructive feedback, not automatic failure. |
| OL-PRACTICE-007 | Session state is **temporary**; ending session does not alter saved repertoire. |
| OL-PRACTICE-008 | System records per-line basic stats: `last_practiced_at`, `practice_attempt_count`, optional `last_result` (correct / partial / miss). |

**Proposed default:** Engine comparison in practice uses existing live `/api/chess/analyze` when enabled; not full-game analysis.

### 6.5 Stress test mode (`OL-STRESS-*`)

| ID | Requirement |
|----|-------------|
| OL-STRESS-001 | User can enter **Stress test** from a line at a chosen ply (branch point). |
| OL-STRESS-002 | User specifies opponent's deviation (play on board or select from small set of user-entered candidate moves — not automated engine opponent). |
| OL-STRESS-003 | Board shows position after deviation; repertoire line is not modified. |
| OL-STRESS-004 | User can describe what changed and candidate plans (text) and/or play a response move. |
| OL-STRESS-005 | Coach provides structured feedback: what changed, threats, strategic features, candidate plans, link back to repertoire ideas when applicable. |
| OL-STRESS-006 | Engine evaluation may be shown when live analysis is enabled; coaching must not contradict provided engine data. |
| OL-STRESS-007 | V1 limits stress test to **one deviation branch per session**; no full tree exploration requirement. |

### 6.6 Coaching & AI (`OL-COACH-*`)

| ID | Requirement |
|----|-------------|
| OL-COACH-001 | LLM outputs for Learn (and batch generation) use **structured JSON** validated on the server (Pydantic); malformed responses retry once then fall back to minimal template text. |
| OL-COACH-002 | Prompts include: FEN, side to move, repertoire move(s), move history within line, optional Stockfish eval/best move/PV when available. |
| OL-COACH-003 | LLM must not invent engine scores, mate claims, or illegal moves; suggested moves validated with python-chess (frontend: chess.js). |
| OL-COACH-004 | Personality: clear, accurate, encouraging, concise; analogies and humor optional and must tie back to chess; **Remember this** hooks should be short and reusable. |
| OL-COACH-005 | Batch generation: one LLM request may cover multiple teaching positions in a line (token efficiency). |
| OL-COACH-006 | Quoted text in coaching must be accurate if attributed; otherwise avoid fake quotes. |
| OL-COACH-007 | Separate prompts/payloads for Learn vs Practice feedback vs Stress test (no single generic blob). |

### 6.7 Data & persistence (`OL-DATA-*`)

| ID | Requirement |
|----|-------------|
| OL-DATA-001 | Repertoires, lines, moves, key-position flags, saved explanations, and basic practice stats persist server-side in SQLite (same deployment model as game analysis). |
| OL-DATA-002 | No user accounts in V1; single implicit owner per Checkmate instance (documented limitation). |
| OL-DATA-003 | Explanation records include `content_version`, `generated_at`, and optional `engine_depth` / `analysis_version` for future invalidation. |
| OL-DATA-004 | API keys remain server-side only. |

**Proposed default:** Server SQLite + `./data` volume — **not** browser-only storage — so repertoire survives refresh and matches game analysis ops model.

### 6.8 Navigation & feature entry (`OL-NAV-*`)

| ID | Requirement |
|----|-------------|
| OL-NAV-001 | Sidebar **Openings** links to `/openings` and is enabled when feature is released. |
| OL-NAV-002 | Opening Lab uses existing AppShell, Sidebar, and Checkmate visual tokens. |
| OL-NAV-003 | Primary mode switcher on repertoire/line view: **Explore | Learn | Practice | Stress test**. |

---

## 7. UX Requirements (`OL-UX-*`)

| ID | Requirement |
|----|-------------|
| OL-UX-001 | Chessboard remains the visual center in all modes. |
| OL-UX-002 | Mode indicator always visible when inside a line (e.g. "Learn — Sicilian · Main line"). |
| OL-UX-003 | When in Practice or Stress test, show banner similar to game-analysis exploration ("Training — not editing repertoire") with **Return to line**. |
| OL-UX-004 | Learn coaching uses a dedicated panel (pattern: Move Analysis / Game Summary), not the chat stream. |
| OL-UX-005 | Progressive disclosure: collapsed sections for Plan / Watch for / Remember this; expand on tap. |
| OL-UX-006 | Empty states for no repertoires, no lines, no explanations yet, with clear CTAs. |
| OL-UX-007 | Loading and error states for save, load, and AI generation with retry. |
| OL-UX-008 | Destructive actions (delete repertoire/line, regenerate all explanations) require confirmation. |

---

## 8. Non-Goals (V1)

Unless already essentially free in the codebase, **exclude**:

- Global opening explorer or large opening database.
- Automated opponent prep from Chess.com usernames.
- Repertoire marketplace, sharing, or import from other users.
- Multiplayer or live training.
- Sophisticated spaced-repetition scheduling.
- Complex analytics dashboards.
- Auto-generation of hundreds of lines.
- Full Stockfish analysis of arbitrary training variations.
- New infrastructure (PostgreSQL, Redis, Celery, WebSockets) solely for Opening Lab.
- User authentication and multi-tenant hosting.

Record as **future possibilities** in roadmap, not V1 scope creep.

---

## 9. Error & Empty States

| State | Expected behavior |
|-------|-------------------|
| No repertoires | Illustration/copy + **Create repertoire** |
| Repertoire with no lines | Prompt to **Add line** |
| Line with no explanations | Learn mode shows skeleton + **Generate for key positions** |
| LLM unavailable / 503 | Show message; Learn shows engine-only fallback where possible; Practice can still compare moves |
| Invalid move on board | Reject move (existing board behavior); no silent fix |
| Save failure (DB) | Inline error + retry; do not discard local edits without warning |
| Stockfish unavailable | Hide or disable live eval; Learn/Stress still work from saved text; show notice |

---

## 10. Acceptance Criteria (Sample — Full Set in Review)

### OL-REP-009 — Persistence

- **Given** a saved repertoire with at least one line  
- **When** the user refreshes the browser and reopens Opening Lab  
- **Then** the same repertoires and lines appear with identical move sequences  

### OL-REP-010 / training separation

- **Given** a saved line and an active Practice session  
- **When** the user plays moves that differ from the repertoire  
- **Then** the saved line in Explore unchanged after ending practice  

### OL-LEARN-005 — No automatic LLM on reopen

- **Given** generated Learn content for a key position  
- **When** the user reopens that line and navigates to the position  
- **Then** saved content displays without a new LLM request (verified via logs or mock in tests)  

### OL-COACH-003 — Move validation

- **Given** LLM returns an illegal SAN for a suggested move  
- **When** the server processes the response  
- **Then** the invalid suggestion is discarded or replaced with engine-valid move; UI never offers illegal "Try" moves  

### OL-NAV-001 — Entry

- **Given** Opening Lab is released  
- **When** the user clicks **Openings** in the sidebar  
- **Then** they reach the Opening Lab home (not a disabled "Soon" state)  

---

## 11. V1 Success Indicators (Measurable)

| Indicator | Target (qualitative for V1) |
|-----------|----------------------------|
| Time to first saved line | User can create repertoire + 8-move line in < 5 minutes without docs |
| Persistence | 100% of saved lines survive Docker restart with `./data` mounted |
| Learn reuse | Reopening line produces zero LLM calls when explanations exist |
| Training safety | Zero reported cases of repertoire overwrite by practice in QA script |
| Regression | Existing Play, Analyze, game analysis, and exploration flows still pass automated tests |

---

## 12. Decisions & Proposed Defaults (For Review)

| Topic | Proposed default | Alternatives |
|-------|------------------|--------------|
| Persistence | Server SQLite, single implicit user | localStorage-only (simpler, no cross-browser) |
| Line shape | Linear SAN sequence per line | Variation tree (defer) |
| Teaching positions | Auto key plies (§ OL-LEARN-003) + user marks | All plies (costly) |
| Practice opponent | User plays both sides or "hidden" repertoire move | Engine sparring (defer) |
| Stress deviation | User enters one opponent move | Engine generates deviations (defer) |
| Mode UX | Tabs on line view | Separate routes per mode |
| PGN import | Optional V1.1 slice | Required for V1 |
| Auth | None | Add later with user_id on rows |

---

## 13. Open Questions (Unresolved — Need Product Sign-off)

1. **PGN import for lines** — Include in V1 or fast-follow?  
2. **Practice scoring** — Binary correct/incorrect vs partial credit rubric?  
3. **Try it yourself** in Learn — board interaction only or linked to Practice session?  
4. **Maximum lines/repertoires** — Soft limits for UI performance?  
5. **Rename "Opening Lab"** vs sidebar label **Openings** — marketing consistency?  
6. **Offline / no API key** — Allow repertoire CRUD without OpenAI; Learn generation disabled?  

---

## 14. Assumptions

- Checkmate continues to run as Docker Compose with persistent `./data`.
- One Checkmate instance maps to one player household (implicit single user).
- English-only coaching in V1.
- Opening Lab ships behind the same OpenAI configuration as the existing coach.

---

## 15. Relationship to Existing Features

| Existing feature | Relationship |
|------------------|--------------|
| Play | Independent; shared board hooks |
| Game Analysis | Independent; reuse coaching/validation patterns |
| AI Coach chat | Supplementary; context may include current repertoire position |
| Game analysis exploration | Architectural precedent for non-mutating training state |
| Chess.com import | No V1 integration with Opening Lab |

---

## 16. Approval Checklist (Before Phase 3)

- [ ] Persistence model approved (§ OL-DATA-001 / §12)  
- [ ] Linear lines only accepted for V1 (§ OL-REP-010)  
- [ ] Teaching position policy approved (§ OL-LEARN-003)  
- [ ] Practice / Stress scope approved (§6.4–6.5)  
- [ ] Open questions in §13 resolved or deferred explicitly  
- [ ] Stakeholder sign-off on non-goals (§8)  

---

## 17. Next Document (Phase 3 — Not Started)

After this spec is approved, draft technical specification (location TBD, e.g. `specs/technical/opening-lab-v1.md`) covering:

- SQLite schema for repertoires, lines, plies, explanations, practice stats  
- REST API contracts  
- Frontend state ownership (repertoire vs session)  
- LLM JSON schemas (Pydantic)  
- Caching and invalidation  
- Test strategy  

Implementation (Phase 5) begins only after Phase 3–4 approval.
