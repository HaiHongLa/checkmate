"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "@/hooks/useCoach";
import { formatEvaluation } from "@/lib/api";
import { MarkdownContent } from "@/components/MarkdownContent";

interface CoachChatProps {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  onSend: (message: string) => void;
  perspective?: "white" | "black";
}

export function CoachChat({
  messages,
  loading,
  error,
  onSend,
  perspective = "white",
}: CoachChatProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSend(input);
    setInput("");
  }

  return (
    <div className="flex flex-col h-full bg-surface-card border border-surface-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-surface-border">
        <h2 className="text-lg font-semibold text-white">AI Coach</h2>
        <p className="text-xs text-gray-400">Ask about the current position</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-accent text-white"
                  : "bg-surface border border-surface-border text-gray-200"
              }`}
            >
              {msg.role === "user" ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <MarkdownContent content={msg.content} />
              )}
              {msg.analysis && (
                <p className="mt-2 pt-2 border-t border-surface-border text-xs text-gray-400">
                  Engine: {formatEvaluation(msg.analysis, perspective)}
                  {msg.analysis.best_move && ` · Best: ${msg.analysis.best_move}`}
                </p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface border border-surface-border rounded-lg px-4 py-2 text-sm text-gray-400">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="mx-4 mb-2 px-3 py-2 bg-red-900/30 border border-red-800 rounded text-red-300 text-xs">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-surface-border flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your coach..."
          disabled={loading}
          className="flex-1 bg-surface border border-surface-border rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
