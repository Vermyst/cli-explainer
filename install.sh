#!/usr/bin/env bash
# install.sh — One-command installer for CLI Error Explainer
# Handles WSL + Windows, Mac, and Linux automatically
# Usage: bash install.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK_MARKER="# --- CLI Error Explainer ---"

# ─── Colors ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

info()    { echo -e "${CYAN}▸ $1${RESET}"; }
success() { echo -e "${GREEN}✓ $1${RESET}"; }
warn()    { echo -e "${YELLOW}⚠ $1${RESET}"; }
err()     { echo -e "${RED}✗ $1${RESET}"; }

echo ""
echo -e "${CYAN}◆ CLI Error Explainer — Installer${RESET}"
echo "────────────────────────────────────"

# ─── Detect environment ───────────────────────────────────────────────────────
IS_WSL=false
if grep -qi microsoft /proc/version 2>/dev/null; then
    IS_WSL=true
    success "Detected: WSL (Windows Subsystem for Linux)"
else
    success "Detected: $(uname -s)"
fi

# ─── Check Python 3 ───────────────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
    err "Python 3 is required but not found."
    if [ "$IS_WSL" = true ]; then
        echo "  Run: sudo apt update && sudo apt install python3 python3-pip -y"
    fi
    exit 1
fi
success "Python 3 found: $(python3 --version)"

# ─── Install Python dependencies ──────────────────────────────────────────────
info "Installing Python dependencies (rich, requests)..."
python3 -m pip install --quiet --break-system-packages rich requests 2>/dev/null \
    || python3 -m pip install --quiet rich requests
success "Dependencies installed"

# ─── WSL: Fix Ollama connectivity automatically ───────────────────────────────
if [ "$IS_WSL" = true ]; then
    echo ""
    info "WSL detected — configuring Ollama connection..."

    # Get the Windows host IP dynamically
    WIN_IP=$(ip route | grep default | awk '{print $3}' | head -1)

    if [ -n "$WIN_IP" ]; then
        success "Windows host IP: $WIN_IP"

        # Test if Ollama is reachable
        if curl -s --connect-timeout 3 "http://$WIN_IP:11434/api/tags" > /dev/null 2>&1; then
            success "Ollama is reachable at $WIN_IP:11434"
            OLLAMA_REACHABLE=true
        else
            warn "Ollama not reachable yet — will configure anyway"
            OLLAMA_REACHABLE=false
        fi

        # Write a small config file with the host IP
        # ai.py reads this at runtime so it always uses the current IP
        CONFIG_FILE="$SCRIPT_DIR/.ollama_host"
        echo "$WIN_IP" > "$CONFIG_FILE"
        success "Saved Windows IP to .ollama_host config"
    fi

    # Set up PowerShell profile on Windows side automatically
    info "Setting up Ollama auto-start on Windows..."
    WIN_USERPROFILE=$(cmd.exe /c "echo %USERPROFILE%" 2>/dev/null | tr -d '\r')
    if [ -n "$WIN_USERPROFILE" ]; then
        # Convert Windows path to WSL path
        WIN_PROFILE_WSL=$(wslpath "$WIN_USERPROFILE" 2>/dev/null)
        PS_PROFILE="$WIN_PROFILE_WSL/OneDrive/Documents/WindowsPowerShell/Microsoft.PowerShell_profile.ps1"
        PS_PROFILE_ALT="$WIN_PROFILE_WSL/Documents/WindowsPowerShell/Microsoft.PowerShell_profile.ps1"

        # Try both common profile locations
        for PS_PATH in "$PS_PROFILE" "$PS_PROFILE_ALT"; do
            PS_DIR=$(dirname "$PS_PATH")
            if [ -d "$PS_DIR" ] || mkdir -p "$PS_DIR" 2>/dev/null; then
                if ! grep -q "OLLAMA_HOST" "$PS_PATH" 2>/dev/null; then
                    cat >> "$PS_PATH" << 'PSEOF'

# CLI Error Explainer — Ollama auto-start
$env:OLLAMA_HOST="0.0.0.0"
$ollamaRunning = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
if (-not $ollamaRunning) {
    Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden
}
PSEOF
                    success "Ollama auto-start added to PowerShell profile"
                else
                    success "PowerShell profile already configured"
                fi
                break
            fi
        done
    fi

    echo ""
    warn "IMPORTANT: Open PowerShell on Windows and run this once:"
    echo "  Set-ExecutionPolicy RemoteSigned -Scope CurrentUser"
    echo "  (This allows your PowerShell profile to run)"
    echo ""
fi

# ─── Check/configure Ollama ───────────────────────────────────────────────────
info "Checking Ollama..."
if [ "$IS_WSL" = true ]; then
    WIN_IP=$(cat "$SCRIPT_DIR/.ollama_host" 2>/dev/null || ip route | grep default | awk '{print $3}')
    OLLAMA_URL="http://$WIN_IP:11434"
else
    OLLAMA_URL="http://localhost:11434"
fi

if curl -s --connect-timeout 3 "$OLLAMA_URL/api/tags" > /dev/null 2>&1; then
    success "Ollama is running"
    if curl -s "$OLLAMA_URL/api/tags" | grep -q "mistral"; then
        success "mistral model is ready"
    else
        warn "mistral model not found. Run: ollama pull mistral"
    fi
else
    if [ "$IS_WSL" = true ]; then
        warn "Ollama not running. Open PowerShell on Windows and run:"
        echo "       \$env:OLLAMA_HOST='0.0.0.0'; ollama serve"
    else
        warn "Ollama not running. Run: ollama serve"
    fi
fi

# ─── Shell hook snippet ───────────────────────────────────────────────────────
read -r -d '' HOOK_SNIPPET << HOOK || true
${HOOK_MARKER}
# Redirect stderr through tee so we can capture it without hiding it
exec 2> >(tee /tmp/cli_stderr.txt >&2)

# Hook that fires after every command
function _cli_explain() {
    local exit_code=\$?
    local last_cmd
    last_cmd=\$(history 1 | sed 's/^ *[0-9]* *//')
    if [ "\$exit_code" -ne 0 ]; then
        python3 "${SCRIPT_DIR}/explain.py" \
            --cmd "\$last_cmd" \
            --exit-code "\$exit_code" \
            --stderr-file /tmp/cli_stderr.txt
    fi
}
PROMPT_COMMAND="_cli_explain\${PROMPT_COMMAND:+; \$PROMPT_COMMAND}"
# --- End CLI Error Explainer ---
HOOK

# ─── Install hook into shell configs ─────────────────────────────────────────
installed_any=false

install_into() {
    local rc_file="$1"
    local shell_name="$2"

    if [ ! -f "$rc_file" ]; then
        warn "$rc_file not found, skipping $shell_name"
        return
    fi

    if grep -q "$HOOK_MARKER" "$rc_file" 2>/dev/null; then
        warn "Hook already present in $rc_file — skipping"
        return
    fi

    echo "" >> "$rc_file"
    echo "$HOOK_SNIPPET" >> "$rc_file"
    success "Hook added to $rc_file"
    installed_any=true
}

install_into "$HOME/.bashrc" "Bash"
install_into "$HOME/.zshrc" "Zsh"

# ─── Zsh precmd hook ─────────────────────────────────────────────────────────
if [ -f "$HOME/.zshrc" ] && ! grep -q "precmd_functions" "$HOME/.zshrc"; then
    cat >> "$HOME/.zshrc" << 'ZSH_EXTRA'

autoload -Uz add-zsh-hook
add-zsh-hook precmd _cli_explain
ZSH_EXTRA
    success "Zsh precmd hook added"
fi

# ─── Final instructions ───────────────────────────────────────────────────────
echo ""
echo "────────────────────────────────────"
success "Installation complete!"
echo ""
info "Next steps:"
echo "  1. Restart your terminal (or run: source ~/.bashrc)"
echo "  2. Test it:  ls /this/does/not/exist"
echo ""
if [ "$IS_WSL" = true ]; then
    info "WSL users — one-time Windows setup:"
    echo "  1. Open PowerShell as normal user"
    echo "  2. Run: Set-ExecutionPolicy RemoteSigned -Scope CurrentUser"
    echo "  3. Close and reopen PowerShell (Ollama will auto-start)"
fi
echo ""
