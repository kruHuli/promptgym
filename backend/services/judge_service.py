import json
from datetime import datetime
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

import config
from models import Session, Message, Submission, Score

client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)

JUDGE_SYSTEM = """You are a strict, expert judge evaluating an AI-assisted coding session.
Score the submission on 5 dimensions, each 0-20 points:

1. requirements_coverage: How many of the stated requirements were actually implemented?
2. functional_correctness: Does the code look like it would run correctly? Are there obvious bugs?
3. code_quality: Is the code clean, readable, properly structured?
4. product_taste: Does the result feel like a real product? Good UX decisions, sensible defaults?
5. prompting_skill: Did the user give clear, effective prompts? Did they iterate well?

Respond ONLY with valid JSON matching this exact schema:
{
  "requirements_coverage": <0-20>,
  "functional_correctness": <0-20>,
  "code_quality": <0-20>,
  "product_taste": <0-20>,
  "prompting_skill": <0-20>,
  "qualitative_summary": "<2-3 sentence overall assessment>",
  "qualitative_breakdown": {
    "requirements_coverage": "<specific feedback>",
    "functional_correctness": "<specific feedback>",
    "code_quality": "<specific feedback>",
    "product_taste": "<specific feedback>",
    "prompting_skill": "<specific feedback>"
  }
}"""


async def grade_submission(session_id: int, submission_id: int, db: AsyncSession):
    # Load session + challenge
    sess = await db.get(Session, session_id)
    if not sess:
        return
    await db.refresh(sess, ["challenge", "messages"])

    # Build transcript
    result = await db.execute(
        select(Message).where(Message.session_id == session_id).order_by(Message.created_at)
    )
    messages = result.scalars().all()
    transcript = "\n".join(f"[{m.role.upper()}] {m.content}" for m in messages)

    # Compute token totals
    total_input = sum(m.input_tokens for m in messages)
    total_output = sum(m.output_tokens for m in messages)
    total_cost = sum(m.cost_usd for m in messages)

    sub = await db.get(Submission, submission_id)
    exec_log = sub.execution_log or "(no execution log)"

    payload = f"""## Challenge Brief
{sess.challenge.brief_markdown}

## Conversation Transcript
{transcript}

## Execution Log
{exec_log}

## Stats
- Total input tokens: {total_input}
- Total output tokens: {total_output}
- Total cost: ${total_cost:.4f}
- Messages exchanged: {len(messages)}
"""

    response = await client.chat.completions.create(
        model=config.JUDGE_MODEL,
        messages=[
            {"role": "system", "content": JUDGE_SYSTEM},
            {"role": "user", "content": payload},
        ],
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content or "{}"
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = {}

    # Clamp scores 0-20
    def clamp(v, lo=0, hi=20):
        try:
            return max(lo, min(hi, float(v)))
        except (TypeError, ValueError):
            return 0.0

    rc = clamp(data.get("requirements_coverage", 0))
    fc = clamp(data.get("functional_correctness", 0))
    cq = clamp(data.get("code_quality", 0))
    pt = clamp(data.get("product_taste", 0))
    ps = clamp(data.get("prompting_skill", 0))
    overall = rc + fc + cq + pt + ps  # 0-100

    # Token cost percentile across all sessions
    percentile = await _cost_percentile(total_cost, db)

    score = Score(
        submission_id=submission_id,
        requirements_coverage=rc,
        functional_correctness=fc,
        code_quality=cq,
        product_taste=pt,
        prompting_skill=ps,
        overall_numeric=overall,
        token_cost_total=total_cost,
        token_cost_percentile=percentile,
        qualitative_summary=data.get("qualitative_summary", ""),
        qualitative_breakdown=json.dumps(data.get("qualitative_breakdown", {})),
        graded_at=datetime.utcnow(),
    )
    db.add(score)

    sess.status = "graded"
    await db.commit()

    # Broadcast graded status
    from services.agent_service import get_queues
    import asyncio
    queues = get_queues().get(session_id, [])
    for q in queues:
        await q.put({"type": "status", "data": "graded"})


async def _cost_percentile(cost: float, db: AsyncSession) -> float:
    """Percentile of this cost among all graded sessions (multi-user correct)."""
    from scipy.stats import percentileofscore
    result = await db.execute(select(Score.token_cost_total))
    all_costs = [row[0] for row in result.fetchall()]
    if not all_costs:
        return 50.0
    all_costs.append(cost)
    return float(percentileofscore(all_costs, cost, kind="rank"))
