"""
display.py — Rich terminal UI for CLI Error Explainer
Handles all pretty-printed output to the terminal.
"""

from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich.table import Table
from rich import box
from rich.prompt import Prompt

console = Console()

BRAND = "[bold cyan]◆ CLI Explainer[/bold cyan]"


def print_explanation(reason: str, fix: str, source: str = "AI"):
    """Print the main explanation panel with reason and fix."""
    if source == "cache":
        source_tag = "[dim]from cache[/dim]"
    elif source == "groq":
        source_tag = "[dim]via Groq (cloud)[/dim]"
    else:
        source_tag = "[dim]via Ollama (local)[/dim]"

    reason_text = Text()
    reason_text.append("What went wrong\n", style="bold white")
    reason_text.append(reason, style="white")

    fix_text = Text()
    fix_text.append("\nSuggested fix\n", style="bold green")
    fix_text.append(fix, style="bright_green")

    combined = reason_text + fix_text

    panel = Panel(
        combined,
        title=f"{BRAND}  {source_tag}",
        title_align="left",
        border_style="cyan",
        padding=(1, 2),
    )

    console.print()
    console.print(panel)


def print_from_history(entry: dict):
    """Print an explanation sourced from history cache."""
    times = entry.get("used_count", 1)
    worked_label = ""
    if entry.get("worked") == 1:
        worked_label = "  [bold green]✓ fix confirmed to work[/bold green]"

    reason_text = Text()
    reason_text.append("What went wrong\n", style="bold white")
    reason_text.append(entry.get("explanation", ""), style="white")

    fix_text = Text()
    fix_text.append("\nSuggested fix\n", style="bold green")
    fix_text.append(entry.get("fix", ""), style="bright_green")

    combined = reason_text + fix_text

    panel = Panel(
        combined,
        title=f"{BRAND}  [dim]from history · seen {times}×[/dim]{worked_label}",
        title_align="left",
        border_style="cyan",
        padding=(1, 2),
    )

    console.print()
    console.print(panel)


def ask_feedback() -> bool | None:
    """
    Ask the user if the fix worked. Returns True, False, or None (skipped).
    Non-blocking — if user just hits Enter, we skip.
    """
    try:
        console.print(
            "  [dim]Did this fix work? [[bold]y[/bold]/[bold]n[/bold]/Enter to skip][/dim] ",
            end="",
        )
        answer = input().strip().lower()
        if answer == "y":
            console.print("  [green]✓ Noted — marked as working[/green]\n")
            return True
        elif answer == "n":
            console.print("  [yellow]✗ Noted — will try to improve[/yellow]\n")
            return False
        else:
            console.print()
            return None
    except (EOFError, KeyboardInterrupt):
        console.print()
        return None


def print_error(message: str):
    """Print an error message (e.g. Ollama not reachable)."""
    panel = Panel(
        f"[red]{message}[/red]",
        title=f"{BRAND}  [red]error[/red]",
        title_align="left",
        border_style="red",
        padding=(1, 2),
    )
    console.print()
    console.print(panel)


def print_stats(total: int, unique: int, success: int, rated: int, top_errors: list):
    """Print error statistics summary."""
    success_rate = f"{(success / rated * 100):.0f}%" if rated > 0 else "n/a"

    # Summary table
    summary = Table(box=box.SIMPLE, show_header=False, padding=(0, 2))
    summary.add_column(style="dim")
    summary.add_column(style="bold white")

    summary.add_row("Total errors captured", str(total))
    summary.add_row("Unique error patterns", str(unique))
    summary.add_row("Fix success rate", success_rate)

    # Top errors table
    top_table = Table(
        box=box.SIMPLE_HEAD,
        show_header=True,
        header_style="bold cyan",
        padding=(0, 2),
    )
    top_table.add_column("Command", style="white")
    top_table.add_column("Seen", justify="right", style="yellow")
    top_table.add_column("Fix worked?", justify="center")

    for row in top_errors:
        worked = row.get("worked")
        if worked == 1:
            worked_label = "[green]✓[/green]"
        elif worked == 0:
            worked_label = "[red]✗[/red]"
        else:
            worked_label = "[dim]—[/dim]"

        cmd = row.get("command", "")
        if len(cmd) > 50:
            cmd = cmd[:47] + "..."

        top_table.add_row(cmd, str(row.get("used_count", 1)), worked_label)

    console.print()
    console.print(
        Panel(
            summary,
            title=f"{BRAND}  [dim]stats[/dim]",
            title_align="left",
            border_style="cyan",
            padding=(1, 1),
        )
    )

    if top_errors:
        console.print(
            Panel(
                top_table,
                title="[bold cyan]Top Errors[/bold cyan]",
                title_align="left",
                border_style="cyan",
                padding=(1, 1),
            )
        )
    console.print()
