import { useCallback, useLayoutEffect, useRef, useState } from 'react';

function positionPopover(trigger: HTMLElement, panel: HTMLElement) {
  const rect = trigger.getBoundingClientRect();
  const width = Math.min(336, window.innerWidth - 32);
  const left = Math.max(
    16,
    Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 16),
  );
  const below = window.innerHeight - rect.bottom - 28;
  const above = rect.top - 28;
  const openAbove = below < panel.offsetHeight && above > below;
  const space = openAbove ? above : below;

  panel.dataset.side = openAbove ? 'above' : 'below';
  panel.style.left = `${left}px`;
  panel.style.top = openAbove ? 'auto' : `${rect.bottom + 12}px`;
  panel.style.bottom = openAbove ? `${window.innerHeight - rect.top + 12}px` : 'auto';
  panel.style.setProperty(
    '--pointer-left',
    `${Math.max(20, Math.min(rect.left + rect.width / 2 - left - 7, width - 34))}px`,
  );
  panel.style.setProperty('--note-height', `${Math.max(0, Math.min(300, space - 64))}px`);
}

export function useCorrectionPopover() {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setPortalTarget(
      trigger.current?.closest<HTMLElement>('[role="dialog"]') ?? document.body,
    );
  }, []);

  const close = useCallback((restoreFocus = false) => {
    const focusInside = panel.current?.contains(document.activeElement);
    setIsOpen(false);
    if (restoreFocus || focusInside) {
      trigger.current?.focus({ preventScroll: true });
    }
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !trigger.current || !panel.current) {
      return;
    }
    positionPopover(trigger.current, panel.current);
    panel.current.querySelector('button')?.focus({ preventScroll: true });

    function outside(event: Event) {
      if (
        !trigger.current?.contains(event.target as Node) &&
        !panel.current?.contains(event.target as Node)
      ) {
        close();
      }
    }

    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close(true);
      }
    }

    function update(event: Event) {
      if (
        !trigger.current ||
        !panel.current ||
        (event.target instanceof Node && panel.current.contains(event.target))
      ) {
        return;
      }
      const rect = trigger.current.getBoundingClientRect();
      const bounds =
        event.target instanceof HTMLElement
          ? event.target.getBoundingClientRect()
          : {
              top: 0,
              bottom: window.innerHeight,
            };
      if (
        rect.bottom <= Math.max(0, bounds.top) ||
        rect.top >= Math.min(window.innerHeight, bounds.bottom)
      ) {
        close();
        return;
      }
      positionPopover(trigger.current, panel.current);
    }

    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('focusin', outside, true);
    document.addEventListener('keydown', keydown, true);
    document.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('focusin', outside, true);
      document.removeEventListener('keydown', keydown, true);
      document.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isOpen, close]);

  return {
    trigger,
    panel,
    portalTarget,
    isOpen,
    close,

    toggle: () => setIsOpen((current) => !current),
  };
}
