export function ReviewFooter({ onClose }: { onClose: () => void }) {
  return (
    <footer className="mt-6 flex items-center justify-between gap-4">
      <p className="text-xs text-[var(--muted)]">Saved in this browser.</p>
      <button
        type="button"
        onClick={onClose}
        className="subtle-button"
      >
        Back to conversation
      </button>
    </footer>
  );
}
