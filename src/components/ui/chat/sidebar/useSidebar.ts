import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

const COMPACT_WIDTH = 56;
const DEFAULT_WIDTH = 208;
const MAX_WIDTH = 420;
const RESIZE_STEP = 16;

function clampWidth(width: number) {
  return Math.min(Math.max(width, COMPACT_WIDTH), MAX_WIDTH);
}

function widthForKey(key: string, width: number) {
  switch (key) {
    case 'ArrowLeft':
      return width - RESIZE_STEP;
    case 'ArrowRight':
      return width + RESIZE_STEP;
    case 'Home':
      return COMPACT_WIDTH;
    case 'End':
      return MAX_WIDTH;
    default:
      return null;
  }
}

function useSidebarSize() {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const expandedWidth = useRef(DEFAULT_WIDTH);

  const resize = useCallback((nextWidth: number) => {
    const clampedWidth = clampWidth(nextWidth);
    setWidth(clampedWidth);
    setIsCollapsed(clampedWidth === COMPACT_WIDTH);
    if (clampedWidth > COMPACT_WIDTH) {
      expandedWidth.current = clampedWidth;
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    resize(isCollapsed ? expandedWidth.current : COMPACT_WIDTH);
  }, [isCollapsed, resize]);

  const startResize = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = width;

      function move(moveEvent: globalThis.PointerEvent) {
        resize(startWidth + moveEvent.clientX - startX);
      }

      function stop() {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', stop);
      }

      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', stop, { once: true });
    },
    [resize, width],
  );

  const resizeWithKeyboard = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const nextWidth = widthForKey(event.key, width);
      if (nextWidth === null) {
        return;
      }
      event.preventDefault();
      resize(nextWidth);
    },
    [resize, width],
  );

  return {
    width,
    isCollapsed,
    toggleCollapsed,
    startResize,
    resizeWithKeyboard,
  };
}

function trapFocus(event: globalThis.KeyboardEvent, panel: HTMLElement | null) {
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
  const sidebarSize = useSidebarSize();

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
    ...sidebarSize,

    show: () => setIsOpen(true),
  };
}
