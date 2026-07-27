from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models import User, Session, Score, Submission

router = APIRouter(prefix="/users", tags=["users"])


class UserOut(BaseModel):
    id: int
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


class SessionHistoryItem(BaseModel):
    session_id: int
    challenge_id: int
    challenge_title: str
    status: str
    started_at: datetime
    submitted_at: datetime | None
    overall_score: float | None
    token_cost_total: float | None


@router.get("/{user_id}", response_model=UserOut)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user


@router.get("/{user_id}/history", response_model=list[SessionHistoryItem])
async def get_user_history(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Session).where(Session.user_id == user_id).order_by(Session.started_at.desc())
    )
    sessions = result.scalars().all()

    items = []
    for sess in sessions:
        await db.refresh(sess, ["challenge", "submissions"])
        score_data = None
        for sub in sess.submissions:
            await db.refresh(sub, ["score"])
            if sub.score:
                score_data = sub.score
                break
        items.append(SessionHistoryItem(
            session_id=sess.id,
            challenge_id=sess.challenge_id,
            challenge_title=sess.challenge.title,
            status=sess.status,
            started_at=sess.started_at,
            submitted_at=sess.submitted_at,
            overall_score=score_data.overall_numeric if score_data else None,
            token_cost_total=score_data.token_cost_total if score_data else None,
        ))
    return items
