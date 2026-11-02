/** Barre du haut : date, phase, vitesse, et accès aux règles, sources, bilan et menu (E2-1, E2-5). */
import { useGame, type Speed } from '../store/gameStore';
import { overuseCap } from '../engine';
import { InfoTip } from './InfoTip';
import { dateLabel, fmt, pct } from './format';

const SPEEDS: Speed[] = [1, 2, 5];

function PhaseMeter() {
  const { game, ctx } = useGame();
  const phase1 = game.phase === 'adoption';
  const intensity = game.metrics.intensity;
  // Phase 1 : la jauge suit l'adoption. Phase 2 : elle dépasse 100 % (surconsommation).
  const maxIntensity = 1 + ctx.config.demand.overuse.maxExtra;
  const fill = phase1 ? game.adoption : Math.min(1, (intensity - 1) / (maxIntensity - 1));
  const cap = 1 + overuseCap(ctx, game.limitedCategories);

  return (
    <div className={`phase-meter ${phase1 ? '' : 'phase2'}`}>
      <div className="phase-label">
        <span className="phase-chip">{phase1 ? 'Phase 1 · Adoption' : 'Phase 2 · Surconsommation'}</span>
        <InfoTip
          gauge="demand"
          label="demande"
          explain={
            phase1
              ? "Part des habitants qui utilisent l'IA. Quand elle atteint 100 %, la phase 2 commence."
              : "Quantité d'IA utilisée par habitant. Au-dessus de 100 %, chacun en consomme plus qu'au départ, souvent pour rien."
          }
        />
      </div>
      <div
        className="bar"
        role="meter"
        aria-label={phase1 ? 'Adoption' : "Intensité d'usage"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fill * 100)}
        aria-valuetext={phase1 ? pct(game.adoption) : pct(intensity)}
      >
        <span style={{ width: `${fill * 100}%` }} />
      </div>
      <span className="phase-value">
        {phase1 ? `${pct(game.adoption)} des habitants utilisent l'IA` : `Intensité ${pct(intensity)} · plafond ${pct(cap)}`}
      </span>
    </div>
  );
}

export function TopBar() {
  const { game, speed, setSpeed, togglePause, step, openRules, openCredits, openBilan, backToMenu } = useGame();
  const paused = speed === 0;

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-dot" aria-hidden="true" />
        <strong>Planète IA</strong>
        <span className="date">{dateLabel(game.month)}</span>
      </div>

      <PhaseMeter />

      <div className="controls" role="group" aria-label="Vitesse du temps">
        <button className={paused ? 'on' : ''} aria-pressed={paused} onClick={togglePause} title="Pause (Échap ou Espace)">
          {paused ? '▶ Reprendre' : '⏸ Pause'}
        </button>
        {SPEEDS.map((v) => (
          <button key={v} className={speed === v ? 'on' : ''} aria-pressed={speed === v} onClick={() => setSpeed(v)} aria-label={`Vitesse ×${v}`}>
            ×{v}
          </button>
        ))}
        <button onClick={step} disabled={!paused} title="Avancer d'un mois (en pause)">
          +1 mois
        </button>
      </div>

      <nav className="controls" aria-label="Menu du jeu">
        <button onClick={openRules}>? Règles</button>
        <button onClick={openBilan} title="Graphiques de la partie">
          Bilan
        </button>
        <button onClick={openCredits}>Sources</button>
        <button onClick={backToMenu}>Menu</button>
      </nav>
      <span className="sr-only" aria-live="polite">
        {paused ? 'Jeu en pause' : `Vitesse ×${fmt(speed, 0)}`}
      </span>
    </header>
  );
}
