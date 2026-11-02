/**
 * Fenêtre modale accessible : rôle dialog, focus piégé à l'intérieur, focus rendu à la fermeture.
 * Échap est géré globalement par useGameLoop (une seule source de vérité pour la pause).
 */
import { useEffect, useRef, type ReactNode } from 'react';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

interface Props {
  labelledBy: string;
  /** Absent = la fenêtre ne se ferme pas en cliquant à côté (écran de fin) */
  onClose?: () => void;
  className?: string;
  children: ReactNode;
}

export function Modal({ labelledBy, onClose, className = '', children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>('[data-autofocus]') ?? el?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus({ preventScroll: true });
    return () => previous?.focus?.();
  }, []);

  const trapFocus = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !ref.current) return;
    const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (onClose && e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={ref} className={`card ${className}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy} onKeyDown={trapFocus}>
        {children}
      </div>
    </div>
  );
}
