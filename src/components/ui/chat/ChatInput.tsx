import React, { useRef, useLayoutEffect } from "react";
import { Mic, Plus } from "lucide-react";

/**
 * Hook: auto-resize a textarea ref to its content.
 * - maxPx matches your Tailwind max-h (200px).
 * - call it with the textarea ref and the current value (prompt).
 */
function useAutoResizeTextarea(ref: React.RefObject<HTMLTextAreaElement | null>, value: string, maxPx = 200) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // allow shrink
    el.style.height = "auto";
    // measure and cap
    const next = Math.min(el.scrollHeight, maxPx);
    el.style.height = `${next}px`;
  }, [ref, value, maxPx]);
}

export function ChatInput({
  prompt,
  setPrompt,
  loading,
  onSend,
  disabled
}: {
  prompt: string;
  setPrompt: (value: string) => void;
  loading: boolean;
  onSend: () => void;
  disabled: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  useAutoResizeTextarea(textareaRef, prompt, 200);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="mb-4">
      <div className="mx-auto max-w-3xl px-4 py-4">
        <div className="relative bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
          <div className="flex flex-col p-3">
            <textarea
              ref={textareaRef}
              rows={1}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about language learning..."
              className="w-full bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:outline-none min-h-[40px] max-h-[200px] text-[15px] overflow-hidden"
              disabled={loading || disabled}
              maxLength={500}
            />

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <button
                type="button"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-md transition-colors font-medium text-sm flex items-center gap-2"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
