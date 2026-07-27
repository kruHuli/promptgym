import base64
import os
import re
import subprocess
import uuid
from typing import Any

_MNGR_STATUS = re.compile(r"\nCommand (?:succeeded|failed) on agent \S+$")

WORKDIR = "/work"
# mngr requires a git repo as source; we keep one empty template to satisfy it
_TEMPLATE = "/tmp/promptgym-template"

# In-memory mirror: tracks files written and stdout captured per sandbox.
# Used for fast reads without re-exec'ing into the container.
_sandboxes: dict[str, dict[str, Any]] = {}


def _run(*args: str, timeout: int = 60) -> tuple[int, str, str]:
    r = subprocess.run(["mngr", *args], capture_output=True, text=True, timeout=timeout)
    # mngr appends "Command succeeded/failed on agent <name>" to stdout — strip it
    stdout = _MNGR_STATUS.sub("", r.stdout)
    return r.returncode, stdout, r.stderr


def _ensure_template() -> None:
    if not os.path.isdir(os.path.join(_TEMPLATE, ".git")):
        os.makedirs(_TEMPLATE, exist_ok=True)
        subprocess.run(["git", "init", _TEMPLATE], capture_output=True, check=True)
        subprocess.run(
            ["git", "commit", "--allow-empty", "-m", "init"],
            capture_output=True, check=True, cwd=_TEMPLATE,
            env={**os.environ, "GIT_AUTHOR_NAME": "promptgym", "GIT_AUTHOR_EMAIL": "pg@local",
                 "GIT_COMMITTER_NAME": "promptgym", "GIT_COMMITTER_EMAIL": "pg@local"},
        )


class SandboxService:

    @staticmethod
    def create_sandbox() -> str:
        _ensure_template()
        name = f"pg-{uuid.uuid4().hex[:8]}"
        # 'command' type runs a shell process in tmux; sleep keeps it alive without starting an AI agent
        rc, out, err = _run(
            "create", name,
            "--from", _TEMPLATE,
            "--provider", "docker",
            "--type", "command",
            "--no-connect",
            "--", "bash", "-c", "while true; do sleep 3600; done",
            timeout=120,
        )
        if rc != 0:
            raise RuntimeError(f"mngr create failed: {(err or out).strip()}")
        _run("exec", name, f"mkdir -p {WORKDIR}", timeout=30)
        _sandboxes[name] = {"files": {}, "stdout": [], "status": "running"}
        return name

    @staticmethod
    def execute_in_sandbox(sandbox_id: str, command: str) -> str:
        rc, out, err = _run("exec", sandbox_id, f"cd {WORKDIR} && {command}", timeout=120)
        # Include stderr only on failure so agent gets the error message
        output = (out + (err if rc != 0 else "")).strip()
        if sandbox_id in _sandboxes:
            _sandboxes[sandbox_id]["stdout"].append(f"$ {command}\n{output}")
        return output

    @staticmethod
    def write_file(sandbox_id: str, path: str, content: str) -> str:
        # base64 chars (A-Za-z0-9+/=) are safe unquoted inside single-quote shell strings
        b64 = base64.b64encode(content.encode()).decode()
        full_path = f"{WORKDIR}/{path.lstrip('/')}"
        cmd = f"mkdir -p $(dirname {full_path}) && echo '{b64}' | base64 -d > {full_path}"
        rc, _, err = _run("exec", sandbox_id, cmd, timeout=30)
        if rc == 0:
            if sandbox_id in _sandboxes:
                _sandboxes[sandbox_id]["files"][path] = content
            return f"wrote {path} ({len(content)} bytes)"
        return f"Error writing {path}: {err.strip()}"

    @staticmethod
    def read_file(sandbox_id: str, path: str) -> str:
        rc, out, _ = _run("exec", sandbox_id, f"cat {WORKDIR}/{path.lstrip('/')}", timeout=30)
        if rc == 0:
            return out
        # Fall back to in-memory mirror (e.g. after freeze)
        return _sandboxes.get(sandbox_id, {}).get("files", {}).get(path, f"Error: {path} not found")

    @staticmethod
    def list_files(sandbox_id: str) -> list[str]:
        rc, out, _ = _run(
            "exec", sandbox_id,
            f"find {WORKDIR} -type f 2>/dev/null | sed 's|{WORKDIR}/||' | sort",
            timeout=30,
        )
        if rc == 0 and out.strip():
            return [ln for ln in out.splitlines() if ln.strip()]
        return sorted(_sandboxes.get(sandbox_id, {}).get("files", {}).keys())

    @staticmethod
    def freeze_sandbox(sandbox_id: str) -> None:
        # stop preserves the container state; destroy would remove it
        _run("stop", sandbox_id, timeout=30)
        if sandbox_id in _sandboxes:
            _sandboxes[sandbox_id]["status"] = "frozen"

    @staticmethod
    def get_stdout(sandbox_id: str) -> list[str]:
        return _sandboxes.get(sandbox_id, {}).get("stdout", [])

    @staticmethod
    def get_files(sandbox_id: str) -> dict[str, str]:
        return dict(_sandboxes.get(sandbox_id, {}).get("files", {}))
