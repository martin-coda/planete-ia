/**
 * Infobulle « D'où vient ce chiffre ? » (E2-6).
 * S'ouvre au survol, au focus clavier ou au toucher ; Échap la referme.
 */
import { useId, useState } from 'react';
import { sourcesFor, type GaugeKey } from './dataSources';

export function InfoTip({ gauge, label, explain }: { gauge: GaugeKey; label: string; explain: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const rows = sourcesFor(gauge);

  return (
    <span className="infotip" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="infotip-btn"
        aria-label={`D'où vient ce chiffre ? (${label})`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) {
            e.stopPropagation();
            setOpen(false);
          }
        }}
      >
        ?
      </button>
      {open && (
        <span role="tooltip" id={id} className="infotip-pop">
          <span className="infotip-explain">{explain}</span>
          <span className="infotip-title">D'où vient ce chiffre ?</span>
          {rows.map((r) => (
            <span key={r.param} className="infotip-row">
              <span>{r.realValue}</span>
              <span className="muted">
                {r.source ? `${r.source.publisher} · ${r.source.title} (${r.source.year})` : 'Choix de conception du jeu'}
                {r.provisional && <em className="badge">valeur provisoire</em>}
              </span>
            </span>
          ))}
          <span className="muted">Toutes les sources : bouton « Sources ».</span>
        </span>
      )}
    </span>
  );
}
