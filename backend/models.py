from datetime import datetime
from sqlalchemy import Integer, String, Float, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="user")


class Challenge(Base):
    __tablename__ = "challenges"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    brief_markdown: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(20), default="authored")  # 'generated'|'authored'
    time_limit_minutes: Mapped[int] = mapped_column(Integer, default=30)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="challenge")


class Session(Base):
    __tablename__ = "sessions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    challenge_id: Mapped[int] = mapped_column(Integer, ForeignKey("challenges.id"))
    status: Mapped[str] = mapped_column(String(20), default="active")  # 'active'|'submitted'|'graded'|'abandoned'
    started_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    sandbox_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user: Mapped["User"] = relationship("User", back_populates="sessions")
    challenge: Mapped["Challenge"] = relationship("Challenge", back_populates="sessions")
    messages: Mapped[list["Message"]] = relationship("Message", back_populates="session")
    submissions: Mapped[list["Submission"]] = relationship("Submission", back_populates="session")


class Message(Base):
    __tablename__ = "messages"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("sessions.id"))
    role: Mapped[str] = mapped_column(String(20))  # 'user'|'agent'|'system'
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    session: Mapped["Session"] = relationship("Session", back_populates="messages")


class Submission(Base):
    __tablename__ = "submissions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("sessions.id"))
    file_snapshot_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    execution_log: Mapped[str | None] = mapped_column(Text, nullable=True)
    screenshot_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    session: Mapped["Session"] = relationship("Session", back_populates="submissions")
    score: Mapped["Score | None"] = relationship("Score", back_populates="submission", uselist=False)


class Score(Base):
    __tablename__ = "scores"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    submission_id: Mapped[int] = mapped_column(Integer, ForeignKey("submissions.id"))
    requirements_coverage: Mapped[float] = mapped_column(Float, default=0)
    functional_correctness: Mapped[float] = mapped_column(Float, default=0)
    code_quality: Mapped[float] = mapped_column(Float, default=0)
    product_taste: Mapped[float] = mapped_column(Float, default=0)
    prompting_skill: Mapped[float] = mapped_column(Float, default=0)
    overall_numeric: Mapped[float] = mapped_column(Float, default=0)
    token_cost_total: Mapped[float] = mapped_column(Float, default=0)
    token_cost_percentile: Mapped[float] = mapped_column(Float, default=0)
    qualitative_summary: Mapped[str] = mapped_column(Text, default="")
    qualitative_breakdown: Mapped[str] = mapped_column(Text, default="{}")  # JSON string
    graded_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    submission: Mapped["Submission"] = relationship("Submission", back_populates="score")
