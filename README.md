# PromptGym

A timed practice platform for AI-assisted app building. You get a fictional meeting notes brief, a countdown clock, and a real coding agent to direct. When time is up, a judge LLM scores the session on five axes and gives you qualitative feedback.

Think of it as LeetCode for prompting skill.

---

## How it works

1. **Pick a challenge** from the lobby (generated or hand-authored). No difficulty tags -- categories only exist inside the grading rubric.
2. **Read the brief** -- a short, messy meeting-notes transcript from fictional stakeholders. Deliberately underspecified, like a real meeting.
3. **Start the session** -- a Docker sandbox spins up via [mngr](https://github.com/imbue-ai/mngr) and the timer starts.
4. **Chat with the building agent** -- it writes real code into the sandbox, runs commands, and you can watch the file tree update live.
5. **Submit** (or auto-submit at time-up) -- the sandbox freezes, everything is packaged for grading.
6. **Get graded** -- a judge LLM scores five categories and writes qualitative feedback.
7. **Review your dashboard** -- score trends, token cost trends, and a session history.

---

## Scoring

Each category is scored 0-20 by the judge model. Sum is the overall score out of 100.

| Category | What is graded |
|---|---|
| Requirements coverage | Did the app solve what the stakeholders actually needed (including implied requirements)? |
| Functional correctness | Does it run? Does it work? Judged from execution logs and screenshots, not just code. |
| Code quality | Structure, readability, appropriate complexity for a 1-hour build. |
| Product taste | Does this feel like something a good engineer would be proud of, or minimum viable output? |
| Prompting skill | Process score. Clear instructions, good course-correction, no over- or under-specifying. |

Token cost is reported separately as a raw number and a percentile across your past sessions.

---

## Tech stack

- **Backend** -- Python 3.11+, FastAPI, async SQLAlchemy, WebSockets
- **Frontend** -- React, Vite, Tailwind CSS, TypeScript, Recharts
- **Database** -- SQLite (dev) / Postgres (prod, swap via `DATABASE_URL`)
- **Sandboxing** -- [mngr](https://github.com/imbue-ai/mngr) with Docker provider (one container per session)
- **LLM** -- OpenAI API (`BUILDER_MODEL` for the coding agent, `JUDGE_MODEL` for grading)

---

## Quickstart

### Prerequisites

- Python 3.11+
- Node 18+
- Docker (running)
- [mngr](https://github.com/imbue-ai/mngr): `curl -fsSL https://raw.githubusercontent.com/imbue-ai/mngr/main/scripts/install.sh | bash`
- An OpenAI API key

### Setup

```bash
git clone https://github.com/kruHuli/promptgym
cd promptgym
cp .env.example .env
# edit .env and set OPENAI_API_KEY
```

### Run the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# API at http://localhost:8000
```

### Run the frontend

```bash
cd frontend
npm install
npm run dev
# UI at http://localhost:5173
```

On first startup the backend seeds one local user and three example challenges so the lobby is not empty.

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | (required) | Your OpenAI key |
| `BUILDER_MODEL` | `gpt-4o` | Model used by the coding agent |
| `JUDGE_MODEL` | `gpt-4o` | Model used for grading |
| `DATABASE_URL` | `sqlite+aiosqlite:///./promptgym.db` | Swap to Postgres for prod |

---

## Project structure

```
backend/
  main.py                  -- FastAPI app, startup seeding
  models.py                -- SQLAlchemy models (User, Challenge, Session, Message, Submission, Score)
  config.py                -- env vars and token cost table
  api/
    challenges.py          -- GET /challenges, POST /challenges, POST /challenges/generate
    sessions.py            -- session lifecycle + WebSocket stream
    users.py               -- user info and history
  services/
    agent_service.py       -- OpenAI tool-call agentic loop, persists messages with exact token usage
    judge_service.py       -- grading payload assembly, judge LLM call, score persistence
    sandbox_service.py     -- mngr Docker sandbox abstraction (create, exec, write, read, freeze)
    challenge_service.py   -- LLM challenge generation + seed data

frontend/src/
  pages/
    Lobby.tsx              -- challenge grid
    ChallengeBrief.tsx     -- meeting notes viewer + start CTA
    LiveBuild.tsx          -- 4-panel build screen (chat, files, logs, preview)
    Results.tsx            -- score breakdown + qualitative feedback
    Dashboard.tsx          -- history table + trend charts
  components/
    ChatPanel.tsx          -- message thread + input
    FileTree.tsx           -- live file list
    Timer.tsx              -- countdown (red under 5 min)
    TokenCounter.tsx       -- running cost display
    ScoreBreakdown.tsx     -- five-bar score display
  hooks/
    useSessionWS.ts        -- auto-reconnecting WebSocket hook
  api/
    client.ts              -- typed fetch wrappers for all endpoints
```

---

## Data model

```
User          id, name, created_at
Challenge     id, title, brief_markdown, source, time_limit_minutes, created_at
Session       id, user_id, challenge_id, status, started_at, submitted_at, sandbox_id
Message       id, session_id, role, content, created_at, input_tokens, output_tokens, cost_usd
Submission    id, session_id, file_snapshot_path, execution_log, screenshot_path, submitted_at
Score         id, submission_id, requirements_coverage, functional_correctness, code_quality,
              product_taste, prompting_skill, overall_numeric, token_cost_total,
              token_cost_percentile, qualitative_summary, qualitative_breakdown, graded_at
```

Schema is written for multi-user from the start -- auth and leaderboards are out of scope for now but not a rewrite later.

---

## API

```
GET    /challenges                  list challenges
POST   /challenges                  create authored challenge
POST   /challenges/generate         generate a challenge via LLM
POST   /sessions                    start a session (spins up sandbox)
WS     /sessions/{id}/stream        live stream: messages, file diffs, stdout, timer, status
POST   /sessions/{id}/message       send a chat turn to the building agent
POST   /sessions/{id}/submit        freeze sandbox and kick off grading
GET    /sessions/{id}/score         poll for grading result
GET    /users/{id}/history          session history and trend data
```

---

## Sandbox

Each session gets an isolated Docker container managed by mngr. The building agent writes files and runs commands inside it via `mngr exec`. On submit, the sandbox is stopped (state preserved for artifact packaging) and eventually destroyed.

The sandbox abstraction is in `backend/services/sandbox_service.py`. Swapping providers (Modal, SSH) means replacing that file's internals -- the interface used by the rest of the app does not change.

---

## MVP scope

In scope: single local user, one active session at a time, SQLite, Docker sandbox.

Out of scope (schema ready, UI not built): multi-user auth, cross-user leaderboards, real-time multiplayer, difficulty tags.
