/**
 * pages/index.js — CLI Error Explainer Dashboard
 * Terminal-native developer tool dashboard.
 */

import { useState, useEffect } from "react";
import ErrorTable from "../components/ErrorTable";
import FrequencyChart from "../components/FrequencyChart";
import DailyChart from "../components/DailyChart";
import SuggestionsPanel from "../components/SuggestionsPanel";

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent = "green" }) {
  const accentClass = {
    green:  "text-green",
    red:    "text-red",
    yellow: "text-yellow",
    muted:  "text-muted",
  }[accent] || "text-green";

  return (
    <div className="border border-border p-4 bg-surface">
      <div className={`text-3xl font-mono font-bold ${accentClass} leading-none`}>
        {value}
      </div>
      <div className="text-2xs font-mono text-muted uppercase tracking-widest mt-2">
        {label}
      </div>
      {sub && (
        <div className="text-2xs font-mono text-dim mt-1">{sub}</div>
      )}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-green text-xs font-mono">▸</span>
        <h2 className="text-xs font-mono text-muted uppercase tracking-widest">
          {title}
        </h2>
        <div className="flex-1 h-px bg-border" />
      </div>
      {children}
    </section>
  );
}

// ── Live terminal feed ────────────────────────────────────────────────────────
function TerminalFeed({ errors }) {
  const recent = errors.slice(0, 6);
  const [tick, setTick] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => !v), 1100);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="bg-bg border border-border p-4 font-mono text-xs space-y-1 overflow-hidden">
      <div className="text-muted text-2xs uppercase tracking-widest mb-3">
        recent stderr feed
      </div>
      {recent.map((e, i) => (
        <div key={e.id} className="flex items-start gap-3 fade-in" style={{ animationDelay: `${i * 40}ms` }}>
          <span className={`shrink-0 ${e.worked === 1 ? "text-green" : e.worked === 0 ? "text-red" : "text-yellow"}`}>
            {e.worked === 1 ? "✓" : e.worked === 0 ? "✗" : "?"}
          </span>
          <span className="text-cream truncate">{e.command}</span>
          <span className="text-muted shrink-0 ml-auto text-2xs">[{e.exit_code}]</span>
        </div>
      ))}
      {/* Blinking cursor at end */}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-green">$</span>
        <span className={`inline-block w-2 h-3.5 bg-green ${tick ? "opacity-100" : "opacity-0"} transition-opacity duration-75`} />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [tab, setTab]         = useState("history"); // history | suggestions

  useEffect(() => {
    fetch("/api/errors")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });

    // Auto-refresh every 30s
    const interval = setInterval(() => {
      fetch("/api/errors")
        .then((r) => r.json())
        .then(setData)
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center font-mono text-sm text-muted">
        <span className="text-green mr-2">$</span> loading error history
        <span className="cursor-blink ml-1 inline-block">_</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center font-mono text-sm text-red">
        error: {error}
      </div>
    );
  }

  const { summary, recentErrors, topErrors, dailyErrors, isMock } = data;

  return (
    <div className="min-h-screen bg-bg text-cream">
      {/* ── Header ── */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-green font-mono font-bold text-sm">◆</span>
          <span className="font-mono text-sm text-cream">cli-explainer</span>
          <span className="text-muted font-mono text-2xs">/dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          {isMock && (
            <span className="text-yellow text-2xs font-mono border border-yellow px-2 py-0.5">
              demo data — connect your DB
            </span>
          )}
          <span className="text-muted text-2xs font-mono">
            auto-refresh 30s
          </span>
          <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-10">

        {/* ── Stat row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="total errors"
            value={summary.total.toLocaleString()}
            sub="all time"
          />
          <StatCard
            label="unique patterns"
            value={summary.unique}
            sub={`${Math.round((summary.unique / summary.total) * 100)}% are recurring`}
            accent="yellow"
          />
          <StatCard
            label="fix success rate"
            value={`${summary.successRate}%`}
            sub="of rated fixes worked"
            accent={summary.successRate >= 70 ? "green" : "red"}
          />
          <StatCard
            label="time saved"
            value={`~${Math.round(summary.timeSavedMinutes / 60)}h`}
            sub="vs. searching manually"
            accent="muted"
          />
        </div>

        {/* ── Terminal feed + daily chart ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Section title="live feed">
            <TerminalFeed errors={recentErrors} />
          </Section>
          <Section title="errors / day (7d)">
            <div className="border border-border bg-surface p-4">
              <DailyChart data={dailyErrors} />
            </div>
          </Section>
        </div>

        {/* ── Frequency chart ── */}
        <Section title="most frequent failures">
          <div className="border border-border bg-surface p-4">
            <div className="text-2xs font-mono text-muted mb-4">
              bar color: <span className="text-green">■</span> ≥80% fix rate &nbsp;
              <span className="text-yellow">■</span> ≥50% &nbsp;
              <span className="text-red">■</span> &lt;50%
            </div>
            <FrequencyChart data={topErrors} />
          </div>
        </Section>

        {/* ── History + suggestions tabs ── */}
        <Section title={tab === "history" ? "error history" : "smart suggestions"}>
          {/* Tab strip */}
          <div className="flex gap-0 mb-4 border border-border w-fit">
            {["history", "suggestions"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-xs font-mono transition-colors ${
                  tab === t
                    ? "bg-green text-bg font-bold"
                    : "text-muted hover:text-cream"
                }`}
              >
                {t === "history" ? "$ history" : "✓ confirmed fixes"}
              </button>
            ))}
          </div>

          {tab === "history" ? (
            <ErrorTable errors={recentErrors} />
          ) : (
            <SuggestionsPanel errors={recentErrors} />
          )}
        </Section>

        {/* ── Footer ── */}
        <footer className="border-t border-border pt-6 pb-2 flex items-center justify-between text-2xs font-mono text-dim">
          <span>cli-explainer · local AI terminal assistant</span>
          <span>ollama · mistral · sqlite</span>
        </footer>

      </main>
    </div>
  );
}
