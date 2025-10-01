import { Plus, Star, Share2 } from "lucide-react";

export function ChatHeader() {
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-3">
        <button className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <Plus className="w-4 h-4" />
          New
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">
          <Star className="w-5 h-5" />
        </button>
        <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}