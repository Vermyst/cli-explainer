#!/usr/bin/env python3
"""
explain.py — Core engine for CLI Error Explainer
Called automatically by shell hook whenever a command exits with non-zero status.
"""

import argparse
import os
import sys
import platform

# Add project root to path so sibling modules are importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ai import get_explanation
from db import lookup_history, save_entry, update_feedback
from display import print_explanation, print_from_history, ask_feedback, print_error


def get_os_info():
    return f"{platform.system()} {platform.release()}"


def read_stderr_file(path):
    """Read captured stderr from temp file, then delete it."""
    try:
        with open(path, "r") as f:
            content = f.read().strip()
        os.remove(path)
        return content
    except FileNotFoundError:
        return ""
    except Exception:
        return ""


def main():
    # Check if disabled via uninstall.sh disable
    disable_flag = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".disabled")
    if os.path.exists(disable_flag):
        return

    parser = argparse.ArgumentParser(description="Explain a failed CLI command")
    parser.add_argument("--cmd", required=True, help="The command that failed")
    parser.add_argument("--exit-code", required=True, type=int, help="Exit code of the failed command")
    parser.add_argument("--stderr-file", default="/tmp/cli_stderr.txt", help="Path to captured stderr temp file")
    parser.add_argument("--shell", default=os.environ.get("SHELL", "unknown"), help="Current shell")
    parser.add_argument("--stats", action="store_true", help="Show error statistics instead of explaining")

    args = parser.parse_args()

    # Handle --stats flag
    if args.stats:
        from db import get_stats
        get_stats()
        return

    error_output = read_stderr_file(args.stderr_file)
    os_info = get_os_info()
    shell = os.path.basename(args.shell)

    # Skip trivial exits (e.g. Ctrl+C)
    if args.exit_code == 130:
        return

    # Skip if no error output and exit code is common non-error (like grep returning 1)
    if not error_output and args.exit_code == 1:
        common_silent = ["grep", "diff", "test", "["]
        cmd_name = args.cmd.strip().split()[0] if args.cmd.strip() else ""
        if cmd_name in common_silent:
            return

    # 1. Check history first (avoid unnecessary AI call)
    history_entry = lookup_history(args.cmd, error_output)
    if history_entry:
        print_from_history(history_entry)
        feedback = ask_feedback()
        if feedback is not None:
            update_feedback(history_entry["id"], feedback)
        return

    # 2. Call AI for explanation
    try:
        result = get_explanation(
            command=args.cmd,
            exit_code=args.exit_code,
            error_output=error_output,
            os_info=os_info,
            shell=shell,
        )
    except Exception as e:
        print_error(f"Could not reach Ollama: {e}\nMake sure Ollama is running: ollama serve")
        return

    # 3. Display result
    print_explanation(result["reason"], result["fix"], source=result.get("source", "ollama"))

    # 4. Save to history
    entry_id = save_entry(
        command=args.cmd,
        exit_code=args.exit_code,
        error_output=error_output,
        explanation=result["reason"],
        fix=result["fix"],
        os_info=os_info,
        shell=shell,
    )

    # 5. Ask for feedback
    feedback = ask_feedback()
    if feedback is not None and entry_id:
        update_feedback(entry_id, feedback)


if __name__ == "__main__":
    main()
