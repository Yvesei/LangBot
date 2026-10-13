import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

function trapFocus(event: KeyboardEvent, panel: HTMLElement | null) {
  if (event.key !== 'Tab' || !panel) {
    return;
  }

  const controls = panel.querySelectorAll<HTMLElement>(
    'button:not(:disabled), a[href], select:not(:disabled)',
  );
  const first = controls[0];
  const last = controls[controls.length - 1];
  const destination = event.shiftKey ? last : first;
  const boundary = event.shiftKey ? first : last;

  if (document.activeElement === boundary) {
    event.preventDefault();
    destination?.focus();
  }
}

export function useSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  const close = useCallback(() => setIsOpen(false), []);

  useLayoutEffect(() => {
    if (isOpen) {
      panelRef.current?.querySelector<HTMLElement>('button')?.focus();
    }
    if (!isOpen && wasOpen.current) {
      const target =
        window.innerWidth >= 768
          ? panelRef.current?.querySelector<HTMLElement>('.sidebar-navigation button')
          : toggleRef.current;
      target?.focus();
    }
    wasOpen.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      trapFocus(event, panelRef.current);
    }

    function onResize() {
      if (window.innerWidth >= 768) {
        close();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, [isOpen, close]);

  return {
    isOpen,
    panelRef,
    toggleRef,
    close,

    show: () => setIsOpen(true),
  };
}
