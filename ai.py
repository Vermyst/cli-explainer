"""
ai.py — AI integration for CLI Error Explainer
Priority: Ollama (local) → Groq (free cloud fallback)
"""

import re
import os
import subprocess
import requests

TIMEOUT_SECONDS = 30
OLLAMA_MODEL = "mistral"
GROQ_MODEL   = "llama3-8b-8192"
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


# ─── Ollama host detection ────────────────────────────────────────────────────

def _get_ollama_url():
    """
    Dynamically find the correct Ollama URL.
    1. Check .ollama_host file written by install.sh (WSL users)
    2. Auto-detect WSL gateway IP
    3. Fall back to localhost (Mac/Linux)
    """
    # Check config file first (written by install.sh)
    config_file = os.path.join(SCRIPT_DIR, ".ollama_host")
    if os.path.exists(config_file):
        with open(config_file) as f:
            host = f.read().strip()
        if host:
            return f"http://{host}:11434/api/generate"

    # Auto-detect WSL gateway
    try:
        result = subprocess.check_output(
            ["ip", "route", "show", "default"], text=True, timeout=2
        )
        ip = result.split()[2]
        # Update the config file with the fresh IP for next time
        with open(config_file, "w") as f:
            f.write(ip)
        return f"http://{ip}:11434/api/generate"
    except Exception:
        pass

    return "http://localhost:11434/api/generate"


# ─── Prompt ───────────────────────────────────────────────────────────────────

def build_prompt(command, exit_code, error_output, os_info, shell):
    error_section = error_output if error_output else "(no stderr captured)"
    return f"""A developer ran this terminal command and it failed.

Command: {command}
Exit code: {exit_code}
Error output:
{error_section}
OS: {os_info} | Shell: {shell}

Explain what went wrong in 2-3 plain sentences. Be specific — name the actual problem.
Then give the most likely fix as a single runnable command or short instruction.

Format your response EXACTLY like this (no extra text before or after):
REASON: <explanation here>
FIX: <command or instruction here>"""


# ─── Response parser ──────────────────────────────────────────────────────────

def parse_response(raw):
    reason = ""
    fix    = ""

    reason_match = re.search(r"REASON:\s*(.+?)(?=\nFIX:|\Z)", raw, re.DOTALL | re.IGNORECASE)
    fix_match    = re.search(r"FIX:\s*(.+)",                   raw, re.DOTALL | re.IGNORECASE)

    if reason_match:
        reason = reason_match.group(1).strip()
    if fix_match:
        fix = fix_match.group(1).strip()

    if not reason and not fix:
        reason = raw.strip()
        fix    = "(could not parse a specific fix)"

    return {"reason": reason, "fix": fix}


# ─── Ollama ───────────────────────────────────────────────────────────────────

def call_ollama(prompt):
    url = _get_ollama_url()
    response = requests.post(
        url,
        json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
        timeout=TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return response.json()["response"]


# ─── Groq ─────────────────────────────────────────────────────────────────────

def call_groq(prompt):
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GROQ_API_KEY not set")

    response = requests.post(
        GROQ_API_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": GROQ_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 300,
            "temperature": 0.3,
        },
        timeout=TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]


# ─── Main entry point ─────────────────────────────────────────────────────────

def get_explanation(command, exit_code, error_output, os_info, shell):
    """
    Try Ollama first. If it fails, fall back to Groq.
    Returns {"reason": str, "fix": str, "source": "ollama"|"groq"}
    Raises if both fail.
    """
    prompt = build_prompt(command, exit_code, error_output, os_info, shell)

    # 1. Try Ollama
    try:
        raw = call_ollama(prompt)
        result = parse_response(raw)
        result["source"] = "ollama"
        return result
    except Exception as ollama_err:
        ollama_error = str(ollama_err)

    # 2. Try Groq fallback
    try:
        raw = call_groq(prompt)
        result = parse_response(raw)
        result["source"] = "groq"
        return result
    except RuntimeError:
        # Groq API key not set — raise the original Ollama error
        raise ConnectionError(
            f"Could not reach Ollama: {ollama_error}\n"
            "Tip: Set GROQ_API_KEY in your shell for a free cloud fallback.\n"
            "Get one free at: https://console.groq.com"
        )
    except Exception as groq_err:
        raise ConnectionError(
            f"Ollama failed: {ollama_error}\nGroq also failed: {groq_err}"
        )
