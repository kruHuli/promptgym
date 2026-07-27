import asyncio
import json
from datetime import datetime
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

import config
from models import Message, Session
from services.sandbox_service import SandboxService

client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)

SYSTEM_PROMPT = """You are a coding agent helping a user build an app in a timed challenge.
You have filesystem access via tool calls. Scaffold, write files, run commands.
Be concise and action-oriented. When given a task, break it down and execute step by step.
Always write complete, functional code — no placeholders or TODOs.
After writing files, confirm what was done and what's next."""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Write content to a file in the sandbox",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "File path relative to project root"},
                    "content": {"type": "string", "description": "Full file content"},
                },
                "required": ["path", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_command",
            "description": "Execute a shell command in the sandbox",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "Shell command to run"},
                },
                "required": ["command"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read a file from the sandbox",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "File path to read"},
                },
                "required": ["path"],
            },
        },
    },
]

# session_queues: managed externally in sessions.py
_session_queues: dict[int, list[asyncio.Queue]] = {}


def get_queues() -> dict[int, list[asyncio.Queue]]:
    return _session_queues


async def _broadcast(session_id: int, event: dict):
    queues = _session_queues.get(session_id, [])
    for q in queues:
        await q.put(event)


async def run_agent_turn(session_id: int, user_content: str, sandbox_id: str, db: AsyncSession):
    # Load conversation history
    result = await db.execute(
        select(Message).where(Message.session_id == session_id).order_by(Message.created_at)
    )
    history = result.scalars().all()

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in history:
        if msg.role in ("user", "assistant", "agent"):
            messages.append({
                "role": "user" if msg.role == "user" else "assistant",
                "content": msg.content,
            })

    messages.append({"role": "user", "content": user_content})

    # Save user message
    user_msg = Message(
        session_id=session_id,
        role="user",
        content=user_content,
        created_at=datetime.utcnow(),
    )
    db.add(user_msg)
    await db.commit()
    await _broadcast(session_id, {"type": "message", "data": {
        "role": "user", "content": user_content, "id": user_msg.id
    }})

    # Agentic loop — keep going until no more tool calls
    total_input = 0
    total_output = 0
    final_content = ""

    while True:
        response = await client.chat.completions.create(
            model=config.BUILDER_MODEL,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
        )

        choice = response.choices[0]
        usage = response.usage
        total_input += usage.prompt_tokens if usage else 0
        total_output += usage.completion_tokens if usage else 0

        msg = choice.message
        messages.append(msg.model_dump(exclude_unset=True))

        if msg.tool_calls:
            tool_results = []
            for tc in msg.tool_calls:
                fn = tc.function.name
                args = json.loads(tc.function.arguments)
                result_text = _execute_tool(fn, args, sandbox_id)

                tool_results.append({
                    "tool_call_id": tc.id,
                    "role": "tool",
                    "content": result_text,
                })

                # Broadcast file diffs and stdout
                if fn == "write_file":
                    await _broadcast(session_id, {
                        "type": "file_diff",
                        "data": {"path": args["path"], "content": args["content"]},
                    })
                elif fn == "run_command":
                    await _broadcast(session_id, {
                        "type": "sandbox_stdout",
                        "data": result_text,
                    })

            messages.extend(tool_results)
            # Continue loop to get next model response
        else:
            final_content = msg.content or ""
            break

    # Save agent message
    cost = config.compute_cost(config.BUILDER_MODEL, total_input, total_output)
    agent_msg = Message(
        session_id=session_id,
        role="agent",
        content=final_content,
        input_tokens=total_input,
        output_tokens=total_output,
        cost_usd=cost,
        created_at=datetime.utcnow(),
    )
    db.add(agent_msg)
    await db.commit()
    await _broadcast(session_id, {"type": "message", "data": {
        "role": "agent", "content": final_content, "id": agent_msg.id,
        "tokens": {"input": total_input, "output": total_output}, "cost_usd": cost,
    }})


def _execute_tool(fn: str, args: dict, sandbox_id: str) -> str:
    if fn == "write_file":
        return SandboxService.write_file(sandbox_id, args["path"], args["content"])
    elif fn == "run_command":
        return SandboxService.execute_in_sandbox(sandbox_id, args["command"])
    elif fn == "read_file":
        return SandboxService.read_file(sandbox_id, args["path"])
    return f"unknown tool: {fn}"
