/**
 * components/SuggestionsPanel.jsx
 * Shows the top recurring errors that have a confirmed working fix.
 * Designed to be a quick reference — "most likely errors to hit next."
 */

export default function SuggestionsPanel({ errors = [] }) {
  // Find errors where the fix is confirmed to work and they recur often
  const suggestions = errors
    .filter((e) => e.worked === 1 && e.fix)
    .slice(0, 5);

  if (!suggestions.length) {
    return (
      <div className="border border-border p-4 text-muted text-xs font-mono">
        <span className="text-green">$</span> no confirmed fixes yet —{" "}
        <span className="text-dim">use [y/n] feedback in terminal to train this</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {suggestions.map((e, i) => (
        <div
          key={e.id}
          className="border border-border hover:border-border-bright transition-colors p-4 group"
        >
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="text-xs font-mono text-muted">
              <span className="text-green-dim">#{i + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-mono text-cream truncate">
                $ {e.command}
              </div>
            </div>
            <div className="text-2xs font-mono text-green shrink-0">
              ✓ confirmed
            </div>
          </div>

          <div className="ml-6 space-y-2">
            {e.explanation && (
              <p className="text-2xs font-mono text-muted leading-relaxed">
                {e.explanation}
              </p>
            )}
            <div className="bg-bg border border-border px-3 py-2 text-xs font-mono text-green">
              $ {e.fix}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
