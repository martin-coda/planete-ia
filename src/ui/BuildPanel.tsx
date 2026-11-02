/** Module de chantier (E2-3) : on choisit un bâtiment, puis on le pose sur une case de la carte. */
import { useEffect } from 'react';
import { buildCost, lossRate, type BuildingType } from '../engine';
import { useGame } from '../store/gameStore';
import { fmt, pct } from './format';

const ERROR_LABELS: Record<string, string> = {
  notEnoughRareEarth: 'Pas assez de terres rares pour construire ça.',
  tileNotBuildable: "On ne peut pas construire ici (eau, montagne ou ville). Choisis une case d'herbe.",
  tileOccupied: 'Cette case est déjà occupée.',
  outOfMap: 'Hors de la carte.',
  gridMaxLevel: 'Le réseau est déjà au maximum.',
  notInPhase2: 'Disponible en phase 2 seulement.',
  categoryEssential: 'Usage essentiel : on ne peut pas le limiter.',
  gameOver: 'La partie est terminée.',
};

interface CardProps {
  type: BuildingType;
  icon: string;
  name: string;
  description: string;
  specs: [string, string][];
}

function BuildCard({ type, icon, name, description, specs }: CardProps) {
  const { ctx, game, placing, startPlacing } = useGame();
  const cost = buildCost(ctx, type);
  const affordable = game.rareEarthT >= cost;
  const active = placing === type;

  return (
    <article className={`build-card ${active ? 'active' : ''}`}>
      <header>
        <span className="build-icon" aria-hidden="true">
          {icon}
        </span>
        <h3>{name}</h3>
      </header>
      <p>{description}</p>
      <dl>
        <div>
          <dt>Coût</dt>
          <dd className={affordable ? '' : 'neg'}>{fmt(cost, 0)} t de terres rares</dd>
        </div>
        {specs.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <button className="primary" aria-pressed={active} disabled={!affordable && !active} onClick={() => startPlacing(type)}>
        {active ? 'Annuler (Échap)' : affordable ? 'Placer sur la carte' : 'Pas assez de terres rares'}
      </button>
    </article>
  );
}

function GridCard() {
  const { ctx, game, upgradeGrid } = useGame();
  const { maxLevel, upgradeCostRareEarthT } = ctx.config.grid;
  const maxed = game.gridLevel >= maxLevel;
  const affordable = game.rareEarthT >= upgradeCostRareEarthT;

  return (
    <article className="build-card">
      <header>
        <span className="build-icon" aria-hidden="true">
          🔌
        </span>
        <h3>Réseau électrique</h3>
      </header>
      <p>Améliore les lignes pour perdre moins d'énergie entre les réacteurs et les bâtiments.</p>
      <dl>
        <div>
          <dt>Coût</dt>
          <dd className={affordable || maxed ? '' : 'neg'}>{fmt(upgradeCostRareEarthT, 0)} t de terres rares</dd>
        </div>
        <div>
          <dt>Niveau</dt>
          <dd>
            {game.gridLevel} / {maxLevel}
          </dd>
        </div>
        <div>
          <dt>Pertes</dt>
          <dd>
            {pct(lossRate(ctx, game.gridLevel), 1)}
            {!maxed && ` → ${pct(lossRate(ctx, game.gridLevel + 1), 1)}`}
          </dd>
        </div>
      </dl>
      <button className="primary" disabled={maxed || !affordable} onClick={upgradeGrid}>
        {maxed ? 'Réseau au maximum' : 'Optimiser le réseau'}
      </button>
    </article>
  );
}

export function BuildPanel() {
  const { ctx, game, placing, lastError, clearError } = useGame();
  const dc = ctx.config.datacenter;
  const pp = ctx.config.powerPlant;

  // Le message d'erreur disparaît tout seul après quelques secondes
  useEffect(() => {
    if (!lastError) return;
    const id = setTimeout(clearError, 4000);
    return () => clearTimeout(id);
  }, [lastError, clearError]);

  const counts = (type: BuildingType) => {
    const all = game.buildings.filter((b) => b.type === type);
    const building = all.filter((b) => b.readyAt > game.month).length;
    return `${all.length - building}${building ? ` (+${building} en chantier)` : ''}`;
  };

  return (
    <section className="build-panel" aria-labelledby="build-title">
      <div className="build-head">
        <h2 id="build-title">Chantier</h2>
        <span className="muted">
          Datacenters : {counts('datacenter')} · Réacteurs : {counts('powerPlant')}
        </span>
        <p className={`build-status ${lastError ? 'error' : ''}`} role="status" aria-live="polite">
          {lastError
            ? ERROR_LABELS[lastError] ?? lastError
            : placing
              ? 'Clique sur une case verte de la carte (ou flèches + Entrée). Échap pour annuler.'
              : ''}
        </p>
      </div>
      <div className="build-cards">
        <BuildCard
          type="datacenter"
          icon="🖥️"
          name="Datacenter"
          description="Ajoute de la puissance de calcul pour répondre à la demande d'IA."
          specs={[
            ['Calcul', `+${fmt(dc.computePflops)} PFLOP/s`],
            ['Énergie', `jusqu'à ${fmt(dc.powerMw)} MW`],
            ['Chantier', `${dc.buildMonths} mois`],
          ]}
        />
        <BuildCard
          type="powerPlant"
          icon="⚛️"
          name={pp.name}
          description="La seule source d'énergie de la planète. Long à construire : anticipe !"
          specs={[
            ['Production', `+${fmt(pp.productionMw)} MW`],
            ['Chantier', `${pp.buildMonths} mois`],
          ]}
        />
        <GridCard />
      </div>
    </section>
  );
}
