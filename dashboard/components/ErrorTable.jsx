/**
 * components/ErrorTable.jsx
 * Searchable, filterable error history table with terminal aesthetic.
 */

import { useState, useMemo } from "react";

const STATUS = {
  1:    { label: "✓ worked",  className: "text-green" },
  0:    { label: "✗ failed",  className: "text-red" },
  null: { label: "— unknown", className: "text-muted" },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function ErrorTable({ errors = [] }) {
  const [query, setQuery]   = useState("");
  const [filter, setFilter] = useState("all"); // all | worked | failed | unknown
  const [expanded, setExpanded] = useState(null);

  const filtered = useMemo(() => {
    return errors.filter((e) => {
      const matchesQuery =
        !query ||
        e.command.toLowerCase().includes(query.toLowerCase()) ||
        (e.explanation || "").toLowerCase().includes(query.toLowerCase());

      const matchesFilter =
        filter === "all" ||
        (filter === "worked"  && e.worked === 1) ||
        (filter === "failed"  && e.worked === 0) ||
        (filter === "unknown" && e.worked === null);

      return matchesQuery && matchesFilter;
    });
  }, [errors, query, filter]);

  const filterBtns = [
    { key: "all",     label: "all" },
    { key: "worked",  label: "✓ worked" },
    { key: "failed",  label: "✗ failed" },
    { key: "unknown", label: "— unknown" },
  ];

  return (
    <div className="border border-border rounded-none">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface">
        <span className="text-green text-xs font-mono mr-1">$</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search errors..."
          className="flex-1 bg-transparent text-cream text-xs font-mono outline-none placeholder-muted"
        />
        <div className="flex gap-1">
          {filterBtns.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              className={`px-2 py-1 text-2xs font-mono rounded-none transition-colors ${
                filter === btn.key
                  ? "bg-green text-bg"
                  : "text-muted hover:text-cream border border-border"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Header row */}
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr] px-4 py-2 border-b border-border text-2xs text-muted font-mono uppercase tracking-widest">
        <span>command</span>
        <span>status</span>
        <span>exit</span>
        <span>when</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-muted text-xs font-mono">
            no errors match{query ? ` "${query}"` : ""}
          </div>
        )}
        {filtered.map((e) => {
          const status = STATUS[e.worked] || STATUS[null];
          const isOpen = expanded === e.id;

          return (
            <div key={e.id}>
              {/* Main row */}
              <button
                onClick={() => setExpanded(isOpen ? null : e.id)}
                className="w-full text-left grid grid-cols-[2fr_1fr_1fr_1fr] px-4 py-3 hover:bg-surface transition-colors group"
              >
                <span className="text-xs font-mono text-cream truncate pr-4 flex items-center gap-2">
                  <span className="text-muted group-hover:text-green transition-colors">
                    {isOpen ? "▼" : "▶"}
                  </span>
                  {e.command}
                </span>
                <span className={`text-2xs font-mono ${status.className}`}>
                  {status.label}
                </span>
                <span className="text-2xs font-mono text-muted">
                  [{e.exit_code}]
                </span>
                <span className="text-2xs font-mono text-muted">
                  {timeAgo(e.created_at)}
                </span>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="px-6 pb-4 pt-1 bg-surface border-t border-border space-y-3 fade-in">
                  {e.explanation && (
                    <div>
                      <div className="text-2xs text-muted uppercase tracking-widest mb-1">
                        reason
                      </div>
                      <div className="text-xs text-cream font-mono leading-relaxed">
                        {e.explanation}
                      </div>
                    </div>
                  )}
                  {e.fix && (
                    <div>
                      <div className="text-2xs text-muted uppercase tracking-widest mb-1">
                        fix
                      </div>
                      <div className="text-xs text-green font-mono bg-bg px-3 py-2 border border-border">
                        $ {e.fix}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer count */}
      <div className="px-4 py-2 border-t border-border text-2xs text-muted font-mono">
        {filtered.length} / {errors.length} entries
      </div>
    </div>
  );
}
