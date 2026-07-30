import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import select
import os

import config
from database import engine, AsyncSessionLocal
from limiter import limiter
from models import Base, User, Challenge
from api.challenges import router as challenges_router
from api.sessions import router as sessions_router, reap_expired_sandboxes
from api.users import router as users_router
from services.challenge_service import SEED_CHALLENGES

app = FastAPI(title="PromptGym", version="1.0.0")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
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

    asyncio.create_task(_reaper_loop())


async def _reaper_loop():
    """Periodically destroy sandboxes for sessions past their deadline."""
    while True:
        await asyncio.sleep(60)
        try:
            await reap_expired_sandboxes()
        except Exception as e:
            print(f"reaper error: {e}", file=__import__("sys").stderr)


@app.get("/health")
async def health():
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(select(1))
        return {"status": "ok"}
    except Exception as e:
        from fastapi.responses import JSONResponse
        return JSONResponse({"status": "error", "detail": str(e)}, status_code=503)


# Serve frontend static files in production
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")
