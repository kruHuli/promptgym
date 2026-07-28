import os

BUILDER_MODEL = os.getenv("BUILDER_MODEL", "gpt-4o")
JUDGE_MODEL = os.getenv("JUDGE_MODEL", "gpt-4o")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./promptgym.db")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

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
