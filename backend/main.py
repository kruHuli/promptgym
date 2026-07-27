from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
import os

from database import engine, AsyncSessionLocal
from models import Base, User, Challenge
from api.challenges import router as challenges_router
from api.sessions import router as sessions_router
from api.users import router as users_router
from services.challenge_service import SEED_CHALLENGES

app = FastAPI(title="PromptGym", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(challenges_router)
app.include_router(sessions_router)
app.include_router(users_router)


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Seed default user
        result = await db.execute(select(User).where(User.id == 1))
        if not result.scalar_one_or_none():
            db.add(User(id=1, name="Local User"))
            await db.commit()

        # Seed example challenges
        result = await db.execute(select(Challenge))
        if not result.scalars().first():
            for ch_data in SEED_CHALLENGES:
                db.add(Challenge(**ch_data))
            await db.commit()


@app.get("/health")
async def health():
    return {"status": "ok"}


# Serve frontend static files in production
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")
