import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Returns a ref to attach to the dialog element. While open, the dialog takes
 * focus on mount, Tab and Shift+Tab stay inside it, Escape closes, and focus
 * returns to whatever triggered it. `aria-modal` is only honest with this in place.
 */
export function useDialog<T extends HTMLElement = HTMLElement>(
  open: boolean,
  onClose: () => void
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const dialog = ref.current;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusables = () =>
      Array.from(dialog?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        (element) => element.getClientRects().length > 0
      );

    document.body.classList.add('dialog-open');
    const frame = requestAnimationFrame(() => {
      (focusables()[0] ?? dialog)?.focus({ preventScroll: true });
    });

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const items = focusables();
      if (!items.length) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const outside = !dialog.contains(active);
      if (event.shiftKey && (active === first || outside)) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => {
      cancelAnimationFrame(frame);
      document.body.classList.remove('dialog-open');
      window.removeEventListener('keydown', handleKey);
      if (trigger && trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open]);

  return ref;
}
