import { useEffect, useRef } from 'react';

export function useReviewDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const modal = dialog.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    if (!modal) {
      return;
    }

    modal.showModal();
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();

    return () => {
      modal.close();
      document.body.style.overflow = previousOverflow;

      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, []);

  return {
    dialog,
    closeButton,
  };
}
