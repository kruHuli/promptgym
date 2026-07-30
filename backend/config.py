import os

BUILDER_MODEL = os.getenv("BUILDER_MODEL", "gpt-4o")
JUDGE_MODEL = os.getenv("JUDGE_MODEL", "gpt-4o")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./promptgym.db")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# --- Public-launch guards (all opt-in via env; defaults preserve local single-user behavior) ---
# Comma-separated allowed CORS origins. "*" keeps the old wide-open dev behavior.
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
# Global OpenAI spend ceiling per UTC day. New messages are refused once crossed. 0 = no cap.
DAILY_SPEND_CAP_USD = float(os.getenv("DAILY_SPEND_CAP_USD", "0"))
# Per-IP rate limits (slowapi syntax). Empty = unlimited.
RATE_LIMIT_MESSAGES = os.getenv("RATE_LIMIT_MESSAGES", "")   # e.g. "20/minute"
RATE_LIMIT_SESSIONS = os.getenv("RATE_LIMIT_SESSIONS", "")   # e.g. "5/minute"
# Extra grace after a challenge's time limit before the reaper kills an abandoned sandbox.
SANDBOX_GRACE_MINUTES = int(os.getenv("SANDBOX_GRACE_MINUTES", "5"))
# Provider-specific mngr build-args for sandbox resource/network caps, space-separated.
# Docker keys vary by provider -- see `mngr help create`. Example: "cpu=1 mem=512m".
# ponytail: exposed as a knob rather than hardcoding keys that could differ per provider and break `create`.
SANDBOX_BUILD_ARGS = os.getenv("SANDBOX_BUILD_ARGS", "").split()

# Cost per 1K tokens in USD
COST_TABLE = {
    "gpt-4o": {"input": 0.005, "output": 0.015},
    "gpt-4o-mini": {"input": 0.000150, "output": 0.000600},
    "gpt-4-turbo": {"input": 0.010, "output": 0.030},
    "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
    "gpt-5": {"input": 0.00125, "output": 0.010},
    "gpt-5-2025-08-07": {"input": 0.00125, "output": 0.010},
    "gpt-5.6": {"input": 0.005, "output": 0.030},
    "gpt-5.6-sol": {"input": 0.005, "output": 0.030},
}

import sys
if not OPENAI_API_KEY:
    print("ERROR: OPENAI_API_KEY is not set", file=sys.stderr)
    sys.exit(1)


def compute_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    rates = COST_TABLE.get(model, COST_TABLE["gpt-4o"])
    return (input_tokens / 1000) * rates["input"] + (output_tokens / 1000) * rates["output"]
