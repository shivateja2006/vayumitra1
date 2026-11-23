import { useState } from 'react';
import { Send, MessageSquare, Loader2, RefreshCw } from 'lucide-react';
import type { ChatMessage, HouseholdProfile, LocationDetail } from '../types/aqi';

interface VayumitraChatProps {
  location: LocationDetail | null;
  profile: HouseholdProfile;
}

const STARTER_QUESTIONS = [
  'When is the safest 1-hour window to open windows in our home today?',
  'How do we cut indoor cooking smoke and PM2.5 during Indian winter mornings?',
  'Which mask & school-run commute swap lowers exposure most?',
  'How does replacing one daily car/two-wheeler trip impact neighborhood air?',
];

export function VayumitraChat({ location, profile }: VayumitraChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedQuestion, setFailedQuestion] = useState<string | null>(null);

  const sendQuestion = async (text: string, isRetry = false) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    if (!isRetry) {
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
    }

    setSending(true);
    setError(null);
    setFailedQuestion(null);

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          location,
          profile,
          history: messages,
        }),
      });
      let data: { answer?: string; error?: string } = {};
      try {
        data = (await res.json()) as { answer?: string; error?: string };
      } catch {
        // Non-JSON upstream error
      }
      if (!res.ok || !data.answer) {
        throw new Error(data.error || 'Unable to reach Vayumitra assistant right now.');
      }

      const botMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setFailedQuestion(trimmed);
      setError(err instanceof Error ? err.message : 'Request failed. Please retry.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="ask-vayumitra" className="mx-auto max-w-[1320px] px-4 pb-14 sm:px-6">
      <div className="rounded-2xl border border-[var(--vayu-border)] bg-[var(--vayu-surface)] p-6">
        <div className="flex flex-col gap-2 border-b border-[var(--vayu-border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[var(--vayu-accent)]" aria-hidden="true" />
              <h3 className="font-display text-xl font-bold text-[var(--vayu-ink)]">
                Ask Vayumitra
              </h3>
            </div>
            <p className="mt-1 text-sm text-[var(--vayu-ink-muted)]">
              Ask practical questions tailored to{' '}
              {location ? `${location.name} (AQI ${location.aqi})` : 'your Indian city'}.
            </p>
          </div>
        </div>

        {/* Starter Question Buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          {STARTER_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => void sendQuestion(q)}
              disabled={sending}
              className="rounded-lg border border-[var(--vayu-border)] bg-[var(--vayu-bg)] px-3 py-1.5 text-left text-xs font-medium text-[var(--vayu-ink)] transition-colors hover:border-[var(--vayu-accent)] disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Message History */}
        {messages.length > 0 && (
          <div className="mt-5 space-y-3 border-t border-[var(--vayu-border)] pt-5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-xl p-4 text-sm ${
                  msg.role === 'user'
                    ? 'ml-auto max-w-2xl bg-[var(--vayu-surface-muted)] text-[var(--vayu-ink)]'
                    : 'mr-auto max-w-3xl border border-[var(--vayu-border)] bg-[var(--vayu-bg)] text-[var(--vayu-ink)]'
                }`}
              >
                <div className="mb-1 flex items-center gap-2 text-xs font-medium text-[var(--vayu-ink-muted)]">
                  <span>{msg.role === 'user' ? 'You' : 'Vayumitra'}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{msg.timestamp}</span>
                </div>
                <div className="whitespace-pre-line leading-relaxed">{msg.content}</div>
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-xs text-[var(--vayu-ink-muted)]">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Vayumitra is analyzing Indian city air data...</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
            <span>{error}</span>
            {failedQuestion && (
              <button
                type="button"
                onClick={() => void sendQuestion(failedQuestion, true)}
                disabled={sending}
                className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 rounded border border-red-400 bg-white px-2.5 py-1 font-semibold text-red-900 hover:bg-red-100 disabled:opacity-50 dark:border-red-700 dark:bg-red-900/50 dark:text-red-100"
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendQuestion(input);
          }}
          className="mt-5 flex gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about school commutes, air purifiers, LPG ventilation, or RWA initiatives..."
            aria-label="Ask Vayumitra a question"
            className="min-w-0 flex-1 rounded-lg border border-[var(--vayu-border)] bg-[var(--vayu-bg)] px-4 py-2.5 text-sm text-[var(--vayu-ink)] placeholder:text-[var(--vayu-ink-muted)] focus:border-[var(--vayu-accent)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-lg bg-[var(--vayu-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--vayu-accent-ink)] transition-colors hover:bg-[var(--vayu-accent-hover)] disabled:opacity-50"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            <span>Ask</span>
          </button>
        </form>
      </div>
    </section>
  );
}
