import { useEffect, useId, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Accessible modal dialog: moves focus in, keeps Tab inside, closes on Escape or a backdrop click,
// locks page scroll, and returns focus to whatever opened it. `getReturnFocus()`, if it returns an element when the
// modal closes, overrides that (e.g. after a delete, when the opener is about to disappear); `fallbackFocus` is used
// if the opener is gone.
export default function Modal({ title, onClose, children, fallbackFocus, getReturnFocus }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const getReturnFocusRef = useRef(getReturnFocus);

  useEffect(() => {
    onCloseRef.current = onClose;
    getReturnFocusRef.current = getReturnFocus;
  }, [onClose, getReturnFocus]);

  useEffect(() => {
    const opener = document.activeElement;
    const panel = panelRef.current;
    const first = panel.querySelector(FOCUSABLE);
    (first || panel).focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = [...panel.querySelectorAll(FOCUSABLE)];
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      const openerUsable = opener && opener !== document.body && document.contains(opener);
      const override = getReturnFocusRef.current?.();
      const target = override || (openerUsable ? opener : document.querySelector(fallbackFocus));
      target?.focus();
    };
  }, [fallbackFocus]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={panelRef} className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="modal-header">
          <h2 id={titleId} className="modal-title">{title}</h2>
          <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
