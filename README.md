# ◆ CLI Error Explainer

> Your terminal now explains its own errors — automatically, locally, instantly.

When any command fails, CLI Error Explainer captures the error and explains what went wrong and how to fix it — printed directly in your terminal. No copy-paste, no browser, no interruption.

```
$ git push origin main
error: failed to push some refs to 'https://github.com/...'

╭─ ◆ CLI Explainer  via Ollama (local) ──────────────────────────────╮
│                                                                     │
│  What went wrong                                                    │
│  Your local branch is behind the remote. Someone else pushed       │
│  changes since your last pull.                                      │
│                                                                     │
│  Suggested fix                                                      │
│  $ git pull --rebase origin main && git push origin main           │
│                                                                     │
╰─────────────────────────────────────────────────────────────────────╯
  Did this fix work? [y/n/Enter to skip]
```

---

## Features

- **Automatic** — fires on every failed command, zero extra steps
- **Local AI** — uses Ollama (offline, private, free)
- **Cloud fallback** — falls back to Groq if Ollama isn't running
- **Learns over time** — remembers which fixes worked for you
- **Dashboard** — visualize your error history at `localhost:3000`

---

## Install

### Prerequisites
- Python 3
- Node.js (for dashboard)
- [Ollama](https://ollama.com) — free, runs locally

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/cli-explainer.git
cd cli-explainer
```

### 2. Install Ollama + pull the model
Download from [ollama.com](https://ollama.com), then:
```bash
ollama pull mistral
```
One time only (~4GB).

### 3. Run the installer
```bash
bash install.sh
```

### 4. Restart your terminal
The hook activates in new sessions.

### 5. Test it
```bash
ls /this/does/not/exist
```

---

## WSL (Windows) Setup

The installer handles this automatically, but you need to do one thing on the Windows side:

1. Open **PowerShell** (normal user, not admin)
2. Run:
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```
3. Close and reopen PowerShell

After that, Ollama auto-starts every time you open PowerShell.

---

## Optional: Groq fallback (no Ollama needed)

Get a free API key at [console.groq.com](https://console.groq.com), then add to your `~/.bashrc`:

```bash
export GROQ_API_KEY=your_key_here
```

When Ollama isn't running, the tool automatically falls back to Groq.

---

## Dashboard

```bash
cd dashboard
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000) to see your error history, fix success rates, and most common failures.

---

## Daily use

| Situation | What to do |
|---|---|
| Normal terminal use | Nothing — errors are explained automatically |
| View error history | `cd dashboard && npm run dev` → localhost:3000 |
| Check your stats | `python3 explain.py --stats` |
| Offline / no Ollama | Set `GROQ_API_KEY` for automatic cloud fallback |

---

## How it works

```
Failed command
     ↓
Shell hook captures: command + exit code + stderr
     ↓
Check local history (seen this before?)
     ↓ (if not)
Call Ollama → parse REASON + FIX
     ↓ (if Ollama unreachable)
Call Groq API fallback
     ↓
Print explanation in terminal
     ↓
Ask "did this work?" → save to SQLite
```

---

## Tech stack

- **Shell hook** — `PROMPT_COMMAND` / `precmd`
- **AI** — Ollama (Mistral 7B) + Groq fallback
- **Storage** — SQLite
- **Terminal UI** — Python Rich
- **Dashboard** — Next.js + Recharts + Tailwind
