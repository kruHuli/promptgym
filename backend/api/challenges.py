from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from database import get_db
from models import Challenge
from services.challenge_service import generate_challenge

router = APIRouter(prefix="/challenges", tags=["challenges"])


class ChallengeCreate(BaseModel):
    title: str
    brief_markdown: str
    time_limit_minutes: int = 30


class ChallengeOut(BaseModel):
    id: int
    title: str
    brief_markdown: str
    source: str
    time_limit_minutes: int

    class Config:
        from_attributes = True


@router.get("", response_model=list[ChallengeOut])
async def list_challenges(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Challenge).order_by(Challenge.created_at.desc()))
    return result.scalars().all()


@router.get("/{challenge_id}", response_model=ChallengeOut)
async def get_challenge(challenge_id: int, db: AsyncSession = Depends(get_db)):
    ch = await db.get(Challenge, challenge_id)
    if not ch:
        raise HTTPException(404, "Challenge not found")
    return ch


@router.post("", response_model=ChallengeOut)
async def create_challenge(body: ChallengeCreate, db: AsyncSession = Depends(get_db)):
    ch = Challenge(**body.model_dump(), source="authored")
    db.add(ch)
    await db.commit()
    await db.refresh(ch)
    return ch


@router.post("/generate", response_model=ChallengeOut)
async def generate_challenge_endpoint(db: AsyncSession = Depends(get_db)):
    ch = await generate_challenge()
    db.add(ch)
    await db.commit()
    await db.refresh(ch)
    return ch
