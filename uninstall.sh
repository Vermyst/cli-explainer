#!/usr/bin/env bash
# uninstall.sh — Remove or disable CLI Error Explainer
# Usage:
#   bash uninstall.sh           → interactive menu
#   bash uninstall.sh disable   → temporarily disable
#   bash uninstall.sh enable    → re-enable
#   bash uninstall.sh remove    → fully uninstall

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK_MARKER="# --- CLI Error Explainer ---"
HOOK_END="# --- End CLI Error Explainer ---"
DISABLE_FLAG="$SCRIPT_DIR/.disabled"

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
echo -e "${CYAN}◆ CLI Error Explainer — Uninstaller${RESET}"
echo "────────────────────────────────────"

# ─── Actions ──────────────────────────────────────────────────────────────────

do_disable() {
    if [ -f "$DISABLE_FLAG" ]; then
        warn "Already disabled"
        return
    fi
    touch "$DISABLE_FLAG"
    success "Disabled — errors will no longer be explained"
    echo "  Run 'bash uninstall.sh enable' to turn it back on"
    echo "  (No need to restart terminal)"
}

do_enable() {
    if [ ! -f "$DISABLE_FLAG" ]; then
        warn "Already enabled"
        return
    fi
    rm -f "$DISABLE_FLAG"
    success "Re-enabled — errors will be explained again"
}

do_remove() {
    warn "This will fully uninstall CLI Error Explainer."
    echo ""
    read -p "  Are you sure? [y/N] " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo "  Cancelled."
        return
    fi

    # Remove hook from .bashrc and .zshrc
    for rc_file in "$HOME/.bashrc" "$HOME/.zshrc"; do
        if [ -f "$rc_file" ] && grep -q "$HOOK_MARKER" "$rc_file"; then
            # Remove everything between the markers (inclusive)
            sed -i "/$HOOK_MARKER/,/$HOOK_END/d" "$rc_file"
            # Also remove the zsh precmd lines if present
            sed -i '/autoload -Uz add-zsh-hook/d' "$rc_file"
            sed -i '/add-zsh-hook precmd _cli_explain/d' "$rc_file"
            success "Hook removed from $rc_file"
        fi
    done

    # Remove PowerShell profile entry (WSL only)
    if grep -qi microsoft /proc/version 2>/dev/null; then
        WIN_USERPROFILE=$(cmd.exe /c "echo %USERPROFILE%" 2>/dev/null | tr -d '\r')
        if [ -n "$WIN_USERPROFILE" ]; then
            WIN_PROFILE_WSL=$(wslpath "$WIN_USERPROFILE" 2>/dev/null)
            for PS_PATH in \
                "$WIN_PROFILE_WSL/OneDrive/Documents/WindowsPowerShell/Microsoft.PowerShell_profile.ps1" \
                "$WIN_PROFILE_WSL/Documents/WindowsPowerShell/Microsoft.PowerShell_profile.ps1"
            do
                if [ -f "$PS_PATH" ] && grep -q "CLI Error Explainer" "$PS_PATH"; then
                    sed -i '/# CLI Error Explainer/,/^}/d' "$PS_PATH"
                    success "Removed Ollama auto-start from PowerShell profile"
                fi
            done
        fi
    fi

    # Delete project folder
    echo ""
    read -p "  Delete project folder ($SCRIPT_DIR)? [y/N] " del_folder
    if [[ "$del_folder" == "y" || "$del_folder" == "Y" ]]; then
        rm -rf "$SCRIPT_DIR"
        success "Project folder deleted"
    else
        success "Project folder kept at $SCRIPT_DIR"
    fi

    echo ""
    success "Uninstall complete — restart your terminal to finish"
}

do_status() {
    if [ -f "$DISABLE_FLAG" ]; then
        warn "Status: DISABLED"
    else
        success "Status: ENABLED"
    fi
}

# ─── Menu ─────────────────────────────────────────────────────────────────────

ACTION="${1:-}"

if [ -z "$ACTION" ]; then
    echo ""
    echo "  What would you like to do?"
    echo ""
    echo "  [1] Disable  — turn off temporarily (easy to re-enable)"
    echo "  [2] Enable   — turn back on"
    echo "  [3] Remove   — fully uninstall"
    echo "  [4] Status   — check if enabled or disabled"
    echo "  [5] Cancel"
    echo ""
    read -p "  Choice [1-5]: " choice

    case "$choice" in
        1) ACTION="disable" ;;
        2) ACTION="enable"  ;;
        3) ACTION="remove"  ;;
        4) ACTION="status"  ;;
        *) echo "  Cancelled."; exit 0 ;;
    esac
fi

case "$ACTION" in
    disable) do_disable ;;
    enable)  do_enable  ;;
    remove)  do_remove  ;;
    status)  do_status  ;;
    *) err "Unknown action: $ACTION. Use disable / enable / remove / status" ;;
esac

echo ""
