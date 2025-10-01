import { BookOpen } from "lucide-react";

export function TopicsPanel({ topics, onClearChat }: { topics: string[]; onClearChat: () => void }) {
  if (topics.length === 0) return null;
  
  return (
    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
            Topics discussed
          </span>
        </div>
        <button 
          onClick={onClearChat}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Clear Chat
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {topics.slice(0, 5).map((topic, index) => (
          <span 
            key={index}
            className="px-3 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full"
          >
            {topic}
          </span>
        ))}
      </div>
    </div>
  );
}
