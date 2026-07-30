# PromptGym - Claude Code Guide

## Commands

### Backend
```bash
cd backend
uvicorn main:app --reload       # dev server on :8000
pip install -r requirements.txt # install deps
```

### Frontend
```bash
cd frontend
npm run dev                     # dev server on :5173
npm run build                   # production build
npx tsc --noEmit                # type check
```

### Sandbox (mngr)
```bash
mngr list                       # see running sandboxes
mngr destroy pg-<id>            # kill a specific sandbox
mngr cleanup                    # destroy all stopped agents
```

## Architecture

Single-user FastAPI backend + React frontend. Backend owns all LLM calls -- frontend is a pure display layer driven by WebSocket events.

**Request flow for a chat turn:**
1. `POST /sessions/{id}/message` -- stores user message, fires `asyncio.create_task(run_agent_turn(...))`
2. `run_agent_turn` in `agent_service.py` -- calls OpenAI, handles tool calls in a loop, execs each tool against `SandboxService`, broadcasts events to WebSocket queues
3. WebSocket at `/sessions/{id}/stream` -- pushes `message`, `file_diff`, `sandbox_stdout`, `timer`, `status` events to the frontend

**Grading flow:**
1. `POST /sessions/{id}/submit` -- stops sandbox, creates `Submission` row, fires `asyncio.create_task(grade_submission(...))`
2. `grade_submission` in `judge_service.py` -- assembles full transcript + brief + stats, calls judge LLM, writes `Score` row, sets session status to `graded`
3. WebSocket broadcasts `{"type": "status", "data": "graded"}` -- frontend redirects to results page

## Key files

| File | What it does |
|---|---|
| `backend/services/sandbox_service.py` | mngr Docker abstraction -- all sandbox I/O goes through here |
| `backend/services/agent_service.py` | OpenAI agentic loop -- tool calls, token tracking, WS broadcast |
| `backend/services/judge_service.py` | Grading payload + judge LLM call + score persistence |
| `backend/api/sessions.py` | WebSocket broadcaster, session lifecycle endpoints |
| `frontend/src/hooks/useSessionWS.ts` | All live state comes from this hook |
| `frontend/src/pages/LiveBuild.tsx` | Core arena screen -- three-column IDE layout (chat / file tree / output+logs) |
| `frontend/src/App.tsx` | Router + nav shell -- nav hidden on `/sessions/:id` (arena is full-screen) |
| `frontend/tailwind.config.js` | Design tokens -- all colors and fonts live here |
| `frontend/src/index.css` | Global styles -- component classes (`.card`, `.btn-primary`, `.card-gradient`, tags) |

## Environment variables

| Variable | Default | Notes |
|---|---|---|
| `OPENAI_API_KEY` | (required) | |
| `BUILDER_MODEL` | `gpt-4o` | Model for the coding agent |
| `JUDGE_MODEL` | `gpt-4o` | Model for grading |
| `DATABASE_URL` | `sqlite+aiosqlite:///./promptgym.db` | Swap to Postgres URL for prod |

Token cost rates live in `backend/config.py` in `COST_TABLE` -- update there when model pricing changes.

## Database

SQLAlchemy async models in `backend/models.py`. All DB access is async (aiosqlite for SQLite, asyncpg for Postgres). Never call sync SQLAlchemy methods inside async routes.

On startup, `main.py` creates all tables and seeds one `User` row (id=1, name="Local User") plus three example `Challenge` rows if the DB is empty.

## Sandbox

`SandboxService` in `backend/services/sandbox_service.py` wraps mngr. Each session gets one Docker container. Key behaviors:

- `create_sandbox()` -- runs `mngr create pg-<hex8> --from /tmp/promptgym-template --provider docker --type command --no-connect`
- Files are written via base64-encoded `echo '<b64>' | base64 -d > <path>` piped through `mngr exec`
- mngr appends "Command succeeded on agent ..." to stdout -- the `_MNGR_STATUS` regex in `_run()` strips it
- `freeze_sandbox()` calls `mngr stop` (preserves state) not `mngr destroy`
- In-memory dict `_sandboxes` mirrors written files and captured stdout for fast access without re-exec

## WebSocket event schema

All events from `/sessions/{id}/stream` are JSON with a `type` field:

```
{"type": "message",        "data": {"role": "user"|"agent", "content": "...", "id": N, ...}}
{"type": "file_diff",      "data": {"path": "src/App.tsx", "content": "..."}}
{"type": "sandbox_stdout", "data": "$ npm install\n..."}
{"type": "timer",          "data": {"remaining_seconds": N}}
{"type": "status",         "data": "submitted"|"graded"|"abandoned"}
```

The broadcaster uses per-session `asyncio.Queue` lists. `agent_service.py` calls `_broadcast()` to push events; the WS handler pulls from its queue and sends to the client.

## Grading schema

Judge LLM returns strict JSON. Five scores (0-20 each), sum = overall out of 100:
- `requirements_coverage` -- did the app solve the brief including implied requirements
- `functional_correctness` -- does it run and work (from execution log, not code inspection)
- `code_quality` -- structure, readability, appropriate complexity
- `product_taste` -- holistic feel, not a checklist
- `prompting_skill` -- process score from the transcript, independent of final app quality

Token cost is computed deterministically by the backend (not the LLM) and stored as `token_cost_total` and `token_cost_percentile` (via scipy, across all sessions in the table -- not filtered by user, correct for multi-user later).

## Frontend design system

**Palette** (`frontend/tailwind.config.js`):
- `bg-base` `#06050E` · `bg-surface` `#0D0A1A` · `bg-elevated` `#150F2A` · `bg-border` `#2D1F5E`
- `accent-primary` `#A855F7` (purple) · `accent-cyan` `#06B6D4` · `accent-score` `#F97316` (orange, used for grades/achievements)
- `accent-success` `#22C55E` · `accent-warning` `#F59E0B` · `accent-danger` `#EF4444`
- Text: `text-primary` `#F1F0F5` · `text-secondary` `#9D8FC7` · `text-muted` `#4A3F6B`

**Fonts**: Geist Variable (sans) + Geist Mono Variable (mono) via `@fontsource-variable/geist` and `@fontsource-variable/geist-mono`.

**Component classes** (defined in `index.css`):
- `.card` -- surface card with border
- `.card-gradient` -- dark purple border by default, animates to purple→cyan gradient on hover (uses `::before` + `isolation: isolate`)
- `.btn-primary` -- purple button with glow shadow
- `.btn-ghost` -- ghost button, turns purple on hover
- `.tag-purple` / `.tag-cyan` / `.tag-score` -- neon badge tags
- `.text-glow-purple` / `.text-glow-cyan` / `.text-glow-orange` -- text shadow glows

**LiveBuild layout**: three fixed columns -- chat (320px) | file tree (192px) | output+logs (flex). No tab switching for the left panel; right panel has OUTPUT/LOGS mini-tabs.

**Results animation**: score counter animates 0→actual over ~1.1s, then grade letter pops in with spring keyframe (`animate-grade-pop`). A/S grades use `accent-score` (orange) with glow.

**Nav**: persistent top bar hidden on `/sessions/:id` (LiveBuild is full-screen with its own arena header).

## Conventions

- No sync DB calls in async routes -- always `await db.execute(...)` etc.
- Token usage comes from the OpenAI `response.usage` field directly -- never estimated.
- Background tasks (`asyncio.create_task`) for agent turns and grading so endpoints return immediately.
- `BUILDER_MODEL` and `JUDGE_MODEL` are always read from env -- never hardcode model strings.
- The five score categories are the only LLM-produced numbers. Everything else (token counts, cost, elapsed time, turn count, percentile) is computed by the backend.
- Never add new color hex values directly in component files -- always use Tailwind tokens from `tailwind.config.js`. Inline `style` props are only acceptable for dynamic values (e.g. animation widths, per-category glow colors in ScoreBreakdown).
