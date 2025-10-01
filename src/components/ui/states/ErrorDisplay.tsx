export function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl">
      <p className="text-sm">{error}</p>
    </div>
  );
}