import asyncio
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from database import get_db, AsyncSessionLocal
from models import Session, Submission, Score, Message
from services.sandbox_service import SandboxService
from services.agent_service import run_agent_turn, get_queues
from services.judge_service import grade_submission

router = APIRouter(prefix="/sessions", tags=["sessions"])

# {session_id: [Queue, ...]}  — module-level broadcaster
session_queues = get_queues()


class SessionCreate(BaseModel):
    user_id: int = 1
    challenge_id: int


class SessionOut(BaseModel):
    id: int
    user_id: int
    challenge_id: int
    status: str
    started_at: datetime
    sandbox_id: str | None

    class Config:
        from_attributes = True


class MessageIn(BaseModel):
    content: str


class ScoreOut(BaseModel):
    id: int
    submission_id: int
    requirements_coverage: float
    functional_correctness: float
    code_quality: float
    product_taste: float
    prompting_skill: float
    overall_numeric: float
    token_cost_total: float
    token_cost_percentile: float
    qualitative_summary: str
    qualitative_breakdown: dict
    graded_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=SessionOut)
async def create_session(body: SessionCreate, db: AsyncSession = Depends(get_db)):
    sandbox_id = SandboxService.create_sandbox()
    sess = Session(
        user_id=body.user_id,
        challenge_id=body.challenge_id,
        status="active",
        started_at=datetime.utcnow(),
        sandbox_id=sandbox_id,
    )
    db.add(sess)
    await db.commit()
    await db.refresh(sess)
    return sess


@router.get("/{session_id}", response_model=SessionOut)
async def get_session(session_id: int, db: AsyncSession = Depends(get_db)):
    sess = await db.get(Session, session_id)
    if not sess:
        raise HTTPException(404, "Session not found")
    return sess


@router.post("/{session_id}/message")
async def send_message(
    session_id: int,
    body: MessageIn,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    sess = await db.get(Session, session_id)
    if not sess or sess.status != "active":
        raise HTTPException(400, "Session not active")

    background_tasks.add_task(_run_agent_bg, session_id, body.content, sess.sandbox_id)
    return {"status": "queued"}


async def _run_agent_bg(session_id: int, content: str, sandbox_id: str):
    async with AsyncSessionLocal() as db:
        await run_agent_turn(session_id, content, sandbox_id, db)


@router.post("/{session_id}/submit")
async def submit_session(
    session_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    sess = await db.get(Session, session_id)
    if not sess or sess.status != "active":
        raise HTTPException(400, "Session not active")

    sess.status = "submitted"
    sess.submitted_at = datetime.utcnow()

    if sess.sandbox_id:
        SandboxService.freeze_sandbox(sess.sandbox_id)
        stdout_log = "\n".join(SandboxService.get_stdout(sess.sandbox_id))
    else:
        stdout_log = ""

    sub = Submission(
        session_id=session_id,
        execution_log=stdout_log,
        submitted_at=datetime.utcnow(),
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)

    # Broadcast submitted status
    for q in session_queues.get(session_id, []):
        await q.put({"type": "status", "data": "submitted"})

    background_tasks.add_task(_grade_bg, session_id, sub.id)
    return {"status": "submitted", "submission_id": sub.id}


async def _grade_bg(session_id: int, submission_id: int):
    async with AsyncSessionLocal() as db:
        await grade_submission(session_id, submission_id, db)


@router.get("/{session_id}/score", response_model=ScoreOut | None)
async def get_score(session_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Submission).where(Submission.session_id == session_id).order_by(Submission.submitted_at.desc())
    )
    sub = result.scalars().first()
    if not sub:
        return None
    await db.refresh(sub, ["score"])
    if not sub.score:
        return None
    score = sub.score
    return ScoreOut(
        id=score.id,
        submission_id=score.submission_id,
        requirements_coverage=score.requirements_coverage,
        functional_correctness=score.functional_correctness,
        code_quality=score.code_quality,
        product_taste=score.product_taste,
        prompting_skill=score.prompting_skill,
        overall_numeric=score.overall_numeric,
        token_cost_total=score.token_cost_total,
        token_cost_percentile=score.token_cost_percentile,
        qualitative_summary=score.qualitative_summary,
        qualitative_breakdown=json.loads(score.qualitative_breakdown or "{}"),
        graded_at=score.graded_at,
    )


@router.get("/{session_id}/messages")
async def get_messages(session_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Message).where(Message.session_id == session_id).order_by(Message.created_at)
    )
    msgs = result.scalars().all()
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at.isoformat(),
            "input_tokens": m.input_tokens,
            "output_tokens": m.output_tokens,
            "cost_usd": m.cost_usd,
        }
        for m in msgs
    ]


@router.get("/{session_id}/files")
async def get_files(session_id: int, db: AsyncSession = Depends(get_db)):
    sess = await db.get(Session, session_id)
    if not sess or not sess.sandbox_id:
        return {}
    return SandboxService.get_files(sess.sandbox_id)


@router.websocket("/{session_id}/stream")
async def session_stream(websocket: WebSocket, session_id: int):
    await websocket.accept()
    queue: asyncio.Queue = asyncio.Queue()

    if session_id not in session_queues:
        session_queues[session_id] = []
    session_queues[session_id].append(queue)

    # Send initial file state
    async with AsyncSessionLocal() as db:
        sess = await db.get(Session, session_id)
        if sess and sess.sandbox_id:
            files = SandboxService.get_files(sess.sandbox_id)
            for path, content in files.items():
                await websocket.send_text(json.dumps({
                    "type": "file_diff",
                    "data": {"path": path, "content": content},
                }))
            # Timer
            if sess.challenge_id:
                await db.refresh(sess, ["challenge"])
                remaining = sess.challenge.time_limit_minutes * 60
                started = sess.started_at
                if started:
                    elapsed = (datetime.utcnow() - started).total_seconds()
                    remaining = max(0, remaining - int(elapsed))
                await websocket.send_text(json.dumps({
                    "type": "timer",
                    "data": {"remaining_seconds": remaining},
                }))

    try:
        # Timer task
        async def send_timer():
            async with AsyncSessionLocal() as db:
                sess = await db.get(Session, session_id)
                if not sess:
                    return
                await db.refresh(sess, ["challenge"])
                total = sess.challenge.time_limit_minutes * 60
            while True:
                await asyncio.sleep(5)
                async with AsyncSessionLocal() as db:
                    sess = await db.get(Session, session_id)
                    if not sess or sess.status != "active":
                        break
                elapsed = (datetime.utcnow() - sess.started_at).total_seconds()
                remaining = max(0, total - int(elapsed))
                try:
                    await websocket.send_text(json.dumps({
                        "type": "timer",
                        "data": {"remaining_seconds": remaining},
                    }))
                except Exception:
                    break

        timer_task = asyncio.create_task(send_timer())

        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=30)
                await websocket.send_text(json.dumps(event, default=str))
            except asyncio.TimeoutError:
                # ping
                await websocket.send_text(json.dumps({"type": "ping"}))

    except WebSocketDisconnect:
        pass
    finally:
        timer_task.cancel()
        if session_id in session_queues and queue in session_queues[session_id]:
            session_queues[session_id].remove(queue)
